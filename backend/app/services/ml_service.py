import hashlib
import os
import torch
import torch.nn.functional as F
from transformers import AutoModelForSequenceClassification, AutoTokenizer, PreTrainedTokenizerFast
from scipy.stats import entropy
import numpy as np
import gc
from captum.attr import GradientShap
import contextvars
import traceback
from typing import Dict, List, Tuple, Optional

import app.config as config
from app.utils import (
    detect_language_heuristic,
    aggregate_subword_attributions,
    clean_token,
    _count_words,
    _has_medical_keywords,
)

# Correctly aligned Medical Ontology Labels.
# HF model config configs are improperly set, we must strictly enforce this map.
CORRECT_ID2LABEL = {
    0: "Dengue",
    1: "Diarrhea",
    2: "Influenza",
    3: "Measles",
    4: "Pneumonia",
    5: "Typhoid",
}

# Context variables for thread-local MCD control
mcd_enabled_ctx = contextvars.ContextVar("mcd_enabled", default=False)
mcd_rate_ctx = contextvars.ContextVar("mcd_rate", default=0.1)
# Changed: Use numpy PCG64 generator instead of torch.Generator for cross-platform determinism
# torch.Generator produces different random sequences on CPU vs GPU due to floating-point
# implementation differences. numpy.random.Generator with PCG64 is portable across all platforms.
mcd_rng_ctx = contextvars.ContextVar("mcd_rng", default=None)


class ThreadSafeDropout(torch.nn.Module):
    """
    Thread-safe Dropout layer that respects context variables.
    Does NOT rely on .train() mode, allowing the model to stay in clean eval mode globally.

    Uses numpy PCG64 for dropout mask generation to ensure identical results across
    CPU, GPU, and different hardware platforms (e.g., local dev vs Railway production).
    """

    def __init__(self, p=0.5):
        super().__init__()
        self.p_default = p

    def forward(self, x):
        # Check if MCD is enabled for THIS specific request/thread
        if mcd_enabled_ctx.get():
            dropout_rate = float(mcd_rate_ctx.get())
            if dropout_rate <= 0.0:
                return x

            keep_prob = 1.0 - dropout_rate
            if keep_prob <= 0.0:
                return torch.zeros_like(x)

            # Deterministic mode: use numpy RNG for cross-platform reproducible masks
            rng = mcd_rng_ctx.get()
            if rng is not None:
                # Generate mask using numpy (portable across CPU/GPU/platforms)
                # then convert to torch tensor on the correct device
                mask_np = rng.random(x.shape, dtype=np.float32) < keep_prob
                mask = torch.from_numpy(mask_np).to(device=x.device, dtype=x.dtype)
                return x * mask / keep_prob

            # Default stochastic mode (non-deterministic fallback)
            return F.dropout(x, p=dropout_rate, training=True)
        # Otherwise behave like a no-op (eval mode)
        return x


class MCDClassifierWithSHAP:
    def __init__(
        self,
        model_path,
        n_iterations=30,
        inference_dropout_rate=0.05,
        device=None,
        model_revision=None,
    ):
        self.n_iterations = n_iterations
        self.inference_dropout_rate = inference_dropout_rate
        # Allow forcing CPU mode via environment variable (useful for low-VRAM GPUs)
        force_cpu = os.getenv("ML_FORCE_CPU", "false").lower() in ("1", "true", "yes")
        if force_cpu:
            self.device = "cpu"
            print("[ML] Forcing CPU mode via ML_FORCE_CPU environment variable")
        else:
            self.device = device if device else ("cuda" if torch.cuda.is_available() else "cpu")

        model_kwargs = {}
        tokenizer_kwargs = {}
        if model_revision:
            model_kwargs["revision"] = model_revision
            tokenizer_kwargs["revision"] = model_revision

        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_path, **model_kwargs
        )
        self.tokenizer = PreTrainedTokenizerFast.from_pretrained(model_path, **tokenizer_kwargs)

        # OVERRIDE: Enforce the canonical ground-truth mapping and ignore the broken HF configs
        self.model.config.id2label = CORRECT_ID2LABEL
        self.model.config.label2id = {v: k for k, v in CORRECT_ID2LABEL.items()}

        # Store a reference to the raw, non-quantized model for explanations (gradients required)
        # Note: In Python, this is a reference. If we quantize self.model later,
        # self.model will point to a NEW quantized object, while this stays as the original fp32 model.
        self.explanation_model = self.model

        # CRITICAL FIX: Replace standard Dropout with ThreadSafeDropout
        # This allows per-request dropout control without global .train() state
        # Apply to BOTH models (inference and explanation)
        self._replace_dropout_layers(self.model)

        if self.explanation_model is not self.model:
            self._replace_dropout_layers(self.explanation_model)

        # Move models to device with graceful fallback to CPU on CUDA OOM
        try:
            self.model.to(self.device)
            self.model.eval()
            # Explanation model also needs to be on device and in eval mode
            self.explanation_model.to(self.device)
            self.explanation_model.eval()
        except RuntimeError as e:
            if "CUDA" in str(e) and ("out of memory" in str(e).lower() or "OOM" in str(e).upper()):
                print(f"[WARNING] CUDA OOM detected: {e}. Falling back to CPU...")
                self.device = "cpu"
                # Re-load model in CPU mode for quantization
                self.model = AutoModelForSequenceClassification.from_pretrained(
                    model_path, **model_kwargs
                )
                self.model.config.id2label = CORRECT_ID2LABEL
                self.model.config.label2id = {v: k for k, v in CORRECT_ID2LABEL.items()}
                self.explanation_model = self.model
                self._replace_dropout_layers(self.model)
                self.model.to(self.device)
                self.model.eval()
                self.explanation_model.to(self.device)
                self.explanation_model.eval()
                print(f"[INFO] Model loaded on CPU with int8 quantization for faster inference")
            else:
                raise

        # Apply dynamic quantization to Linear layers for faster CPU inference and reduced memory usage
        # (Already on CPU after fallback, so quantization applies automatically)
        if str(self.device).startswith("cpu"):
            # quantize_dynamic creates a new model instance
            self.model = torch.quantization.quantize_dynamic(
                self.model, {torch.nn.Linear}, dtype=torch.qint8
            )
            # Re-apply dropout layers after quantization
            self._replace_dropout_layers(self.model)

    def _replace_dropout_layers(self, model):
        """
        Recursively replace all torch.nn.Dropout layers with ThreadSafeDropout.
        Preserves the module structure but swaps the dropout logic.
        """
        for name, module in model.named_modules():
            for child_name, child in module.named_children():
                if isinstance(child, torch.nn.Dropout):
                    # Create thread-safe replacement
                    new_dropout = ThreadSafeDropout(p=child.p)
                    setattr(module, child_name, new_dropout)

    @staticmethod
    def _build_deterministic_seed(text: str) -> int:
        """Generate a stable per-input seed to reproduce MC dropout outputs."""
        normalized_text = " ".join((text or "").strip().lower().split())
        payload = f"{config.MCD_SEED_SALT}:{normalized_text}".encode("utf-8")
        digest = hashlib.sha256(payload).digest()
        seed = int.from_bytes(digest[:8], "big") ^ int(config.MCD_BASE_SEED)
        return seed % (2**63 - 1)

    def predict_with_uncertainty(self, text):
        # Ensure inputs are on the correct device (CPU/GPU)
        try:
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                padding=True,
            ).to(self.device)
            inputs["input_ids"] = inputs["input_ids"].to(torch.long)
            inputs["attention_mask"] = inputs["attention_mask"].to(torch.long)
        except RuntimeError as e:
            if "CUDA" in str(e):
                print(f"[ERROR] CUDA error during input preparation: {e}. Ensure ML_FORCE_CPU=true for low-VRAM systems.")
                raise

        deterministic_seed = None
        rng = None
        if config.MCD_DETERMINISTIC:
            deterministic_seed = self._build_deterministic_seed(text)
            # Use numpy PCG64 for cross-platform determinism (CPU/GPU/Railway/local all identical)
            # PCG64 is a high-quality PRNG that produces identical sequences regardless of hardware
            rng = np.random.Generator(np.random.PCG64(deterministic_seed))

        # Set thread-local context for this specific inference call
        token_enabled = mcd_enabled_ctx.set(True)
        token_rate = mcd_rate_ctx.set(self.inference_dropout_rate)
        token_rng = mcd_rng_ctx.set(rng)

        try:
            with torch.no_grad():
                # BATCHED INFERENCE OPTIMIZATION:
                # Instead of loop, expand inputs to process all MC samples in parallel
                # Shape: [batch_size, seq_len] -> [batch_size * n_iterations, seq_len]
                # Default batch size = 1 (single query), so we process n_iterations rows

                # Replicate input tensors
                input_ids = inputs["input_ids"].repeat(self.n_iterations, 1)
                attention_mask = inputs["attention_mask"].repeat(self.n_iterations, 1)

                # Single forward pass with thread-safe dropout active
                outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)

                # Reshape logits: [n_iterations, num_classes]
                logits = outputs.logits
                probabilities = torch.softmax(
                    logits, dim=-1
                )  # [n_iterations, n_classes]

                # Convert to numpy for stats calculation
                all_predictions = probabilities.cpu().numpy()

                # all_predictions shape is already [n_iterations, n_classes], no stack needed

        except RuntimeError as e:
            # Catch CUDA errors during inference and provide helpful error message
            if "CUDA" in str(e) or "device-side assert" in str(e):
                error_msg = str(e)
                print(f"[ERROR] CUDA error during inference: {error_msg}")
                print("[ERROR] This indicates a GPU memory or compatibility issue.")
                print("[ERROR] Set ML_FORCE_CPU=true in your environment to use CPU-only mode.")
            raise
        finally:
            # RESET context to prevent leakage to other threads/requests
            mcd_enabled_ctx.reset(token_enabled)
            mcd_rate_ctx.reset(token_rate)
            mcd_rng_ctx.reset(token_rng)

            # Clean up VRAM
            del inputs, input_ids, attention_mask, outputs, logits, probabilities
            torch.cuda.empty_cache() if torch.cuda.is_available() else None
            gc.collect()

        mean_probs = all_predictions.mean(axis=0)
        std_probs = all_predictions.std(axis=0)
        predicted_class = mean_probs.argmax(axis=-1)
        confidence = mean_probs.max(axis=-1)
        predictive_entropy = entropy(mean_probs, axis=-1)

        # Reshape for MI calculation as it expects [n_iterations, n_classes]
        # (It already is, but just ensuring compatibility with shared code if any)
        mutual_information = self.compute_mutual_information(all_predictions)

        # Add extra dimension to match original return shape if needed,
        # but original code returned scalars for single input.
        # Let's align with original return structure.
        # Original: mean_probs was [1, n_classes] or [n_classes].
        # Numpy mean over axis 0 reduces dimension.
        # If original input was batch 1, mean_probs is (n_classes,).

        # Ensuring scalar wrappers for return
        if predicted_class.ndim == 0:
            predicted_class = np.expand_dims(predicted_class, 0)
            confidence = np.expand_dims(confidence, 0)
            predictive_entropy = np.expand_dims(predictive_entropy, 0)
            mutual_information = np.expand_dims(mutual_information, 0)
            mean_probs = np.expand_dims(mean_probs, 0)
            std_probs = np.expand_dims(std_probs, 0)

        return {
            "predicted_class": predicted_class,
            "predicted_label": [
                self.model.config.id2label[idx] for idx in predicted_class
            ],
            "mean_probabilities": mean_probs,
            "std_probabilities": std_probs,
            "confidence": confidence,
            "predictive_entropy": predictive_entropy,
            "mutual_information": mutual_information,
            "deterministic_seed": deterministic_seed,
        }

    def compute_mutual_information(self, predictions):
        """
        Compute mutual information as measure of epistemic uncertainty.
        MI = H(E[p]) - E[H(p)]
        """
        expected_entropy = np.mean([entropy(p, axis=-1) for p in predictions], axis=0)
        mean_probs = predictions.mean(axis=0)
        entropy_of_expected = entropy(mean_probs, axis=-1)

        return entropy_of_expected - expected_entropy

    def explain_with_gradient_shap(
        self, text, mean_probs=None, target_class=None, n_baselines=5
    ):
        """
        Compute token-level attributions using Captum's GradientSHAP on embeddings.
        """
        # Use explanation_model (fp32) for gradients, as quantized models don't support backprop well
        self.explanation_model.zero_grad()

        # Tokenize input
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
        ).to(self.device)

        mean_probs = torch.tensor(mean_probs, device=self.device)
        predicted_class = (
            mean_probs.argmax(dim=-1).item() if target_class is None else target_class
        )

        # 1️⃣ Get embeddings from the model
        embeddings = self.explanation_model.get_input_embeddings()(inputs["input_ids"])

        # 2️⃣ Define a forward function that takes embeddings
        def forward_func(embeds):
            attention_mask = inputs["attention_mask"]
            outputs = self.explanation_model(
                inputs_embeds=embeds, attention_mask=attention_mask
            )
            probs = F.softmax(outputs.logits, dim=-1)
            return probs[:, predicted_class]

        # 3️⃣ Create random baselines around zero embeddings
        baseline_embeds = torch.zeros_like(embeddings).repeat(n_baselines, 1, 1)

        # 4️⃣ Initialize GradientSHAP
        gradient_shap = GradientShap(forward_func)

        # 5️⃣ Compute attributions on embeddings
        attributions, delta = gradient_shap.attribute(
            embeddings,
            baselines=baseline_embeds,
            n_samples=25,
            stdevs=0.01,
            return_convergence_delta=True,
        )

        # 6️⃣ Aggregate across embedding dimensions (token-level importance)
        token_attributions = attributions.sum(dim=-1).squeeze().detach().cpu()

        # 7️⃣ Decode tokens
        tokens = self.tokenizer.convert_ids_to_tokens(
            inputs["input_ids"][0].detach().cpu().numpy()
        )

        # 8️⃣ Normalize to [0, 1]
        token_attributions = (token_attributions - token_attributions.min()) / (
            token_attributions.max() - token_attributions.min() + 1e-8
        )

        explanation = list(zip(tokens, token_attributions.numpy().tolist()))

        # Derive confidence from provided mean_probs (if available) instead
        # of relying on an external mc_result variable which isn't in scope.
        try:
            # mean_probs may be a torch tensor here
            mp = (
                mean_probs.detach().cpu().numpy()
                if hasattr(mean_probs, "detach")
                else np.array(mean_probs)
            )
            confidence_val = float(np.max(mp, axis=-1).tolist()) if mp.size else 0.0
        except Exception:
            confidence_val = 0.0

        # We cannot compute mutual information without the full MC samples here,
        # so return None to indicate it's unavailable when only mean_probs supplied.
        mi_val = None

        return {
            "tokens": tokens,
            "attributions": token_attributions.numpy().tolist(),
            "predicted_label": self.model.config.id2label[predicted_class],
            "confidence": confidence_val,
            "mutual_information": mi_val,
            "explanation": explanation,
        }


# =============================================================================
# UNCERTAINTY IMPROVEMENTS
# =============================================================================


def compute_expected_calibration_error(
    predictions: np.ndarray,
    confidences: np.ndarray,
    y_true: np.ndarray,
    n_bins: int = 10,
) -> float:
    """
    Compute Expected Calibration Error (ECE) to measure if confidence matches actual accuracy.

    ECE measures the weighted average of the difference between accuracy and confidence
    in each bin. Perfect calibration = ECE of 0.

    Args:
        predictions: predicted class indices (shape: [n_samples])
        confidences: confidence scores (max probability) for each prediction (shape: [n_samples])
        y_true: true class labels (shape: [n_samples])
        n_bins: number of bins for calibration curve

    Returns:
        ECE score (lower is better, 0 = perfectly calibrated)

    Example:
        >>> preds = np.array([0, 1, 1, 0, 1])
        >>> confs = np.array([0.6, 0.8, 0.9, 0.7, 0.95])
        >>> y_true = np.array([0, 1, 0, 1, 1])
        >>> ece = compute_expected_calibration_error(preds, confs, y_true)
        >>> print(f"ECE: {ece:.4f}")
    """
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    total_samples = len(confidences)

    if total_samples == 0:
        return 0.0

    for i in range(n_bins):
        in_bin = (confidences > bin_boundaries[i]) & (
            confidences <= bin_boundaries[i + 1]
        )
        n_in_bin = np.sum(in_bin)

        if n_in_bin > 0:
            accuracy_in_bin = np.mean(y_true[in_bin] == predictions[in_bin])
            avg_confidence_in_bin = np.mean(confidences[in_bin])
            ece += np.abs(avg_confidence_in_bin - accuracy_in_bin) * (
                n_in_bin / total_samples
            )

    return float(ece)


def compute_reliability_diagram_data(
    confidences: np.ndarray, accuracies: np.ndarray, n_bins: int = 10
) -> Dict[str, np.ndarray]:
    """
    Compute data for plotting a reliability diagram (calibration curve).

    Args:
        confidences: confidence scores (shape: [n_samples])
        accuracies: binary accuracy (1 if correct, 0 if incorrect) (shape: [n_samples])
        n_bins: number of bins

    Returns:
        Dictionary with 'bin_centers', 'accuracies', 'confidences', 'counts'
    """
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    bin_centers = []
    bin_accuracies = []
    bin_confidences = []
    bin_counts = []

    for i in range(n_bins):
        in_bin = (confidences > bin_boundaries[i]) & (
            confidences <= bin_boundaries[i + 1]
        )
        n_in_bin = np.sum(in_bin)

        if n_in_bin > 0:
            bin_centers.append((bin_boundaries[i] + bin_boundaries[i + 1]) / 2)
            bin_accuracies.append(np.mean(accuracies[in_bin]))
            bin_confidences.append(np.mean(confidences[in_bin]))
            bin_counts.append(n_in_bin)

    return {
        "bin_centers": np.array(bin_centers),
        "accuracies": np.array(bin_accuracies),
        "confidences": np.array(bin_confidences),
        "counts": np.array(bin_counts),
    }


def compute_multi_metric_uncertainty(
    all_predictions: np.ndarray, mean_probs: np.ndarray, std_probs: np.ndarray
) -> Dict[str, float]:
    """
    Compute multiple uncertainty metrics for comprehensive uncertainty quantification.

    Args:
        all_predictions: all MC dropout predictions (shape: [n_iterations, n_classes])
        mean_probs: mean probabilities across iterations (shape: [n_classes])
        std_probs: std of probabilities across iterations (shape: [n_classes])

    Returns:
        Dictionary with multiple uncertainty metrics:
        - mutual_information: epistemic uncertainty (model doubt)
        - predictive_entropy: total uncertainty
        - variance: prediction variance (stability)
        - coefficient_of_variation: relative uncertainty
        - ensemble_disagreement: how often MC samples disagree on class
        - max_probability_std: max std across classes
    """
    # Mutual Information (epistemic uncertainty)
    mi = compute_mutual_information(all_predictions)

    # Predictive Entropy (total uncertainty)
    pred_entropy = entropy(mean_probs, axis=-1)

    # Variance (prediction stability)
    variance = np.var(all_predictions, axis=0).max()

    # Coefficient of Variation (relative uncertainty)
    # Normalizes variance by mean to account for scale
    cv = std_probs.max() / (mean_probs.max() + 1e-8)

    # Ensemble Disagreement (how often MC samples predict different classes)
    predicted_classes = all_predictions.argmax(axis=1)
    unique, counts = np.unique(predicted_classes, return_counts=True)
    ensemble_disagreement = 1 - (counts.max() / len(predicted_classes))

    # Max probability standard deviation
    max_prob_std = std_probs.max()

    return {
        "mutual_information": float(mi),
        "predictive_entropy": float(pred_entropy),
        "variance": float(variance),
        "coefficient_of_variation": float(cv),
        "ensemble_disagreement": float(ensemble_disagreement),
        "max_probability_std": float(max_prob_std),
    }


def compute_mutual_information(predictions: np.ndarray) -> np.ndarray:
    """
    Compute mutual information as measure of epistemic uncertainty.
    MI = H(E[p]) - E[H(p)]

    Args:
        predictions: MC dropout predictions (shape: [n_iterations, n_classes])

    Returns:
        Mutual information score (higher = more uncertain)
    """
    expected_entropy = np.mean([entropy(p, axis=-1) for p in predictions], axis=0)
    mean_probs = predictions.mean(axis=0)
    entropy_of_expected = entropy(mean_probs, axis=-1)
    return entropy_of_expected - expected_entropy


def compute_ensemble_disagreement(all_predictions: np.ndarray) -> float:
    """
    Measure how often MC dropout samples predict different classes.

    Args:
        all_predictions: MC dropout predictions (shape: [n_iterations, n_classes])

    Returns:
        Disagreement score (0 = all agree, 1 = max disagreement)
    """
    predicted_classes = all_predictions.argmax(axis=1)
    unique, counts = np.unique(predicted_classes, return_counts=True)
    return float(1 - (counts.max() / len(predicted_classes)))


def apply_temperature_scaling(
    logits: np.ndarray, temperature: float = 1.5
) -> np.ndarray:
    """
    Apply temperature scaling to calibrate probability outputs.

    Temperature scaling divides logits by a temperature parameter before softmax,
    which softens the probability distribution and reduces overconfidence.

    Args:
        logits: raw model logits (shape: [n_classes] or [batch, n_classes])
        temperature: scaling factor (>1 softens, <1 sharpens)

    Returns:
        Calibrated probabilities
    """
    scaled_logits = logits / temperature
    return F.softmax(torch.tensor(scaled_logits), dim=-1).numpy()


def find_optimal_temperature(
    logits: np.ndarray,
    y_true: np.ndarray,
    temperature_range: Tuple[float, float] = (0.5, 3.0),
    n_steps: int = 25,
) -> float:
    """
    Find optimal temperature for calibration using NLL loss.

    Args:
        logits: raw model logits (shape: [n_samples, n_classes])
        y_true: true class labels (shape: [n_samples])
        temperature_range: (min, max) temperature to search
        n_steps: number of temperature values to try

    Returns:
        Optimal temperature value
    """
    temperatures = np.linspace(temperature_range[0], temperature_range[1], n_steps)
    best_temp = 1.0
    best_nll = float("inf")

    for temp in temperatures:
        scaled_probs = apply_temperature_scaling(logits, temp)
        # Negative log likelihood
        nll = -np.mean(np.log(scaled_probs[np.arange(len(y_true)), y_true] + 1e-10))
        if nll < best_nll:
            best_nll = nll
            best_temp = temp

    return float(best_temp)


def optimize_uncertainty_threshold(
    uncertainties: np.ndarray, y_correct: np.ndarray, metric: str = "f1"
) -> Dict[str, float]:
    """
    Find optimal uncertainty threshold for flagging unreliable predictions.

    Uses ROC analysis and precision-recall curves to find the threshold
    that best separates correct from incorrect predictions.

    Args:
        uncertainties: uncertainty scores (shape: [n_samples])
        y_correct: binary accuracy (1 if correct, 0 if incorrect) (shape: [n_samples])
        metric: optimization metric ('f1', 'youden', 'precision')

    Returns:
        Dictionary with optimal threshold and associated metrics
    """
    from sklearn.metrics import roc_curve, precision_recall_curve, f1_score

    # Sort by uncertainty
    sorted_indices = np.argsort(uncertainties)
    sorted_correct = y_correct[sorted_indices]
    sorted_uncertainties = uncertainties[sorted_indices]

    best_threshold = 0.5
    best_score = 0
    best_metrics = {}

    # Try each unique uncertainty value as threshold
    unique_thresholds = np.unique(uncertainties)

    for threshold in unique_thresholds:
        # Predict "unreliable" if uncertainty > threshold
        predicted_unreliable = uncertainties > threshold

        # True "unreliable" = incorrect predictions
        true_unreliable = y_correct == 0

        if metric == "f1":
            # F1 score for detecting incorrect predictions
            tp = np.sum(predicted_unreliable & true_unreliable)
            fp = np.sum(predicted_unreliable & ~true_unreliable)
            fn = np.sum(~predicted_unreliable & true_unreliable)

            precision = tp / (tp + fp) if (tp + fp) > 0 else 0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0
            score = (
                2 * precision * recall / (precision + recall)
                if (precision + recall) > 0
                else 0
            )
        elif metric == "youden":
            # Youden's J statistic (sensitivity + specificity - 1)
            sensitivity = (
                np.sum(predicted_unreliable & true_unreliable) / np.sum(true_unreliable)
                if np.sum(true_unreliable) > 0
                else 0
            )
            specificity = (
                np.sum(~predicted_unreliable & ~true_unreliable)
                / np.sum(~true_unreliable)
                if np.sum(~true_unreliable) > 0
                else 0
            )
            score = sensitivity + specificity - 1
        else:  # precision
            tp = np.sum(predicted_unreliable & true_unreliable)
            fp = np.sum(predicted_unreliable & ~true_unreliable)
            score = tp / (tp + fp) if (tp + fp) > 0 else 0

        if score > best_score:
            best_score = score
            best_threshold = threshold
            best_metrics = {
                "threshold": float(threshold),
                "score": float(score),
                "metric": metric,
            }

    # Also compute ROC-based optimal threshold
    fpr, tpr, thresholds = roc_curve(y_correct == 0, uncertainties)
    youden_index = tpr - fpr
    optimal_idx = np.argmax(youden_index)
    roc_threshold = float(thresholds[optimal_idx])

    best_metrics["roc_optimal_threshold"] = roc_threshold

    # Compute precision-recall curve
    precision_curve, recall_curve, pr_thresholds = precision_recall_curve(
        y_correct == 0, uncertainties
    )
    pr_scores = (
        2 * precision_curve * recall_curve / (precision_curve + recall_curve + 1e-10)
    )
    optimal_pr_idx = np.argmax(pr_scores)
    pr_threshold = (
        float(pr_thresholds[optimal_pr_idx])
        if optimal_pr_idx < len(pr_thresholds)
        else roc_threshold
    )

    best_metrics["pr_optimal_threshold"] = pr_threshold

    return best_metrics


def compute_uncertainty_separation(
    uncertainties: np.ndarray, y_correct: np.ndarray
) -> Dict[str, float]:
    """
    Analyze how well uncertainty separates correct from incorrect predictions.

    Args:
        uncertainties: uncertainty scores (shape: [n_samples])
        y_correct: binary accuracy (1 if correct, 0 if incorrect) (shape: [n_samples])

    Returns:
        Dictionary with separation metrics
    """
    unc_correct = uncertainties[y_correct == 1]
    unc_incorrect = uncertainties[y_correct == 0]

    if len(unc_correct) == 0 or len(unc_incorrect) == 0:
        return {
            "separation_mean": float("nan"),
            "separation_std": float("nan"),
            "auc": float("nan"),
            "can_evaluate": False,
        }

    from sklearn.metrics import roc_auc_score

    # Mean separation (how much higher is uncertainty for incorrect predictions)
    separation_mean = float(np.mean(unc_incorrect) - np.mean(unc_correct))
    separation_std = float(np.std(unc_incorrect) - np.std(unc_correct))

    # AUC: how well uncertainty ranks incorrect predictions higher
    auc = float(roc_auc_score(y_correct == 0, uncertainties))

    return {
        "separation_mean": separation_mean,
        "separation_std": separation_std,
        "auc": auc,
        "mean_uncertainty_correct": float(np.mean(unc_correct)),
        "mean_uncertainty_incorrect": float(np.mean(unc_incorrect)),
        "can_evaluate": True,
    }


# Initialize Classifiers
# Note: we initialize them here so they are ready when imported.
# In a larger app we might want to lazy-load them.
print("[ML] Initializing Classifiers...")
eng_classifier = MCDClassifierWithSHAP(
    config.ENG_MODEL_PATH,
    n_iterations=50,
    inference_dropout_rate=0.1,
    model_revision=config.ENG_MODEL_REVISION,
)
fil_classifier = MCDClassifierWithSHAP(
    config.FIL_MODEL_PATH,
    n_iterations=50,
    inference_dropout_rate=0.1,
    model_revision=config.FIL_MODEL_REVISION,
)
print("[ML] Classifiers Initialized")


def classifier(text):
    try:
        # Pre-validate: reject very short/random text before language detection
        # This prevents langdetect from misclassifying gibberish as random languages
        if (
            _count_words(text) < config.SYMPTOM_MIN_WORDS
            and len(text) < config.SYMPTOM_MIN_CHARS
        ):
            raise ValueError("INSUFFICIENT_SYMPTOM_EVIDENCE:Text too short")

        # Use tokenizer-based language detection (deterministic and robust)
        lang = detect_language_heuristic(text)
        print(f"[LANG] Detected: {lang}")

        # Check for medical keywords to ensure the text is health-related
        if not _has_medical_keywords(text, lang):
            raise ValueError("INSUFFICIENT_SYMPTOM_EVIDENCE:No medical keywords found")

        if lang == "en":
            print("[CLASSIFIER] Using English BioClinical ModernBERT model")
            result = eng_classifier.predict_with_uncertainty(text)
            pred = result["predicted_label"][0]
            confidence = float(result["confidence"][0])
            uncertainty = float(result["mutual_information"][0])
            sorted_idx = result["mean_probabilities"][0].argsort()[-5:][::-1]
            probs = []
            top_diseases = []
            # Raw model predictions (no artificial filtering)
            pred = result["predicted_label"][0]
            confidence = float(result["confidence"][0])
            uncertainty = float(result["mutual_information"][0])
            mean_probs = result["mean_probabilities"].tolist()

            # Get top diseases directly from model
            all_probs = result["mean_probabilities"][0]
            top_diseases = []

            for idx, label in eng_classifier.model.config.id2label.items():
                prob = float(all_probs[idx])
                top_diseases.append({"disease": label, "probability": prob})

            # Sort by probability desc
            top_diseases.sort(key=lambda x: x["probability"], reverse=True)

            # Formatting for logs/response
            probs = [
                f"{d['disease']}: {(d['probability'] * 100):.2f}%" for d in top_diseases
            ]

            seed_used = result.get("deterministic_seed")
            seed_info = f", seed: {seed_used}" if seed_used is not None else ""

            print(
                f"[RESULT] {pred} (conf: {confidence:.3f}, MI: {uncertainty:.4f}{seed_info})"
            )

            gc.collect()
            return (
                pred,
                confidence,
                uncertainty,
                probs,
                "BioClinical ModernBERT",
                top_diseases,
                mean_probs,
            )

        elif lang in ["tl", "fil"]:
            print("[CLASSIFIER] Using Tagalog RoBERTa model")
            result = fil_classifier.predict_with_uncertainty(text)

            pred = result["predicted_label"][0]
            confidence = float(result["confidence"][0])
            uncertainty = float(result["mutual_information"][0])
            mean_probs = result["mean_probabilities"].tolist()

            all_probs = result["mean_probabilities"][0]
            top_diseases = []

            for idx, label in fil_classifier.model.config.id2label.items():
                prob = float(all_probs[idx])
                top_diseases.append({"disease": label, "probability": prob})

            top_diseases.sort(key=lambda x: x["probability"], reverse=True)
            probs = [
                f"{d['disease']}: {(d['probability'] * 100):.2f}%" for d in top_diseases
            ]

            seed_used = result.get("deterministic_seed")
            seed_info = f", seed: {seed_used}" if seed_used is not None else ""

            print(
                f"[RESULT] {pred} (conf: {confidence:.3f}, MI: {uncertainty:.4f}{seed_info})"
            )

            gc.collect()
            return (
                pred,
                confidence,
                uncertainty,
                probs,
                "RoBERTa Tagalog",
                top_diseases,
                mean_probs,
            )

        else:
            print(f"Unsupported language detected: {lang}")

            raise ValueError(f"UNSUPPORTED_LANGUAGE:{lang}")

    except Exception as e:
        import traceback

        error_msg = str(e)
        print(f"ERROR in classifier: {error_msg}")
        print(traceback.format_exc())

        raise


def explainer(text: str, mean_probs=None):
    try:
        # Language hint: prefer Tagalog if Tagalog keywords appear
        text_lower = (text or "").lower()
        has_tl = any(k in text_lower for k in config.MEDICAL_KEYWORDS_TL)
        lang = "tl" if has_tl else "en"

        # Normalize mean_probs to a numpy array/list for downstream use
        if mean_probs is None:
            raise ValueError("mean_probs required for explainer")

        # Accept either nested list, numpy array, or torch tensor
        try:
            if hasattr(mean_probs, "tolist") and not isinstance(mean_probs, list):
                mean_probs_list = mean_probs.tolist()
            else:
                mean_probs_list = mean_probs
        except Exception:
            mean_probs_list = mean_probs

        # Convert to numpy for operations inside explain_with_gradient_shap
        mean_probs_arr = np.array(mean_probs_list)

        # Choose the right model for language
        model = eng_classifier if lang == "en" else fil_classifier

        # explain_with_gradient_shap expects mean_probs as a tensor or array
        explanation_result = model.explain_with_gradient_shap(
            text, mean_probs=mean_probs_arr
        )

        tokens = explanation_result["tokens"]
        attrs = explanation_result["attributions"]

        words, word_attrs = aggregate_subword_attributions(
            tokens, attrs, tokenizer=model.tokenizer
        )
        words = [clean_token(w) for w in words]

        # Ensure the returned structure is JSON serializable: convert arrays to lists
        explanation_result["mean_probs"] = mean_probs_arr.tolist()

        return {
            "symptoms": text,
            "tokens": [
                {"token": w, "importance": float(a)} for w, a in zip(words, word_attrs)
            ],
        }

    except Exception:
        traceback.print_exc()
        raise
