
import torch
import torch.nn.functional as F
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from scipy.stats import entropy
import numpy as np
import gc
from captum.attr import GradientShap
import contextvars
import traceback

import app.config as config
from app.utils import detect_language_heuristic, aggregate_subword_attributions, clean_token, _count_words, _has_medical_keywords

# Context variables for thread-local MCD control
mcd_enabled_ctx = contextvars.ContextVar("mcd_enabled", default=False)
mcd_rate_ctx = contextvars.ContextVar("mcd_rate", default=0.1)


class ThreadSafeDropout(torch.nn.Module):
    """
    Thread-safe Dropout layer that respects context variables.
    Does NOT rely on .train() mode, allowing the model to stay in clean eval mode globally.
    """

    def __init__(self, p=0.5):
        super().__init__()
        self.p_default = p

    def forward(self, x):
        # Check if MCD is enabled for THIS specific request/thread
        if mcd_enabled_ctx.get():
            # Apply dropout using the rate set in context
            return F.dropout(x, p=mcd_rate_ctx.get(), training=True)
        # Otherwise behave like a no-op (eval mode)
        return x


class MCDClassifierWithSHAP:
    def __init__(
        self, model_path, n_iterations=30, inference_dropout_rate=0.05, device=None
    ):
        self.n_iterations = n_iterations
        self.inference_dropout_rate = inference_dropout_rate
        self.device = (
            device if device else ("cuda" if torch.cuda.is_available() else "cpu")
        )
        self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)

        # Store a reference to the raw, non-quantized model for explanations (gradients required)
        # Note: In Python, this is a reference. If we quantize self.model later,
        # self.model will point to a NEW quantized object, while this stays as the original fp32 model.
        self.explanation_model = self.model

        # Apply dynamic quantization to Linear layers for faster CPU inference and reduced memory usage
        if str(self.device).startswith("cpu"):
            # quantize_dynamic creates a new model instance
            self.model = torch.quantization.quantize_dynamic(
                self.model, {torch.nn.Linear}, dtype=torch.qint8
            )

        # CRITICAL FIX: Replace standard Dropout with ThreadSafeDropout
        # This allows per-request dropout control without global .train() state
        # Apply to BOTH models (inference and explanation)
        self._replace_dropout_layers(self.model)
        
        if self.explanation_model is not self.model:
            self._replace_dropout_layers(self.explanation_model)
        
        # Move models to device and strict eval mode
        self.model.to(self.device)
        self.model.eval()
        
        # Explanation model also needs to be on device and in eval mode
        self.explanation_model.to(self.device)
        self.explanation_model.eval()

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

    def predict_with_uncertainty(self, text):
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
        ).to(self.device)
        inputs["input_ids"] = inputs["input_ids"].to(torch.long)
        inputs["attention_mask"] = inputs["attention_mask"].to(torch.long)

        # Set thread-local context for this specific inference call
        token_enabled = mcd_enabled_ctx.set(True)
        token_rate = mcd_rate_ctx.set(self.inference_dropout_rate)

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
                probabilities = torch.softmax(logits, dim=-1) # [n_iterations, n_classes]
                
                # Convert to numpy for stats calculation
                all_predictions = probabilities.cpu().numpy()
                
                # all_predictions shape is already [n_iterations, n_classes], no stack needed
                
        finally:
            # RESET context to prevent leakage to other threads/requests
            mcd_enabled_ctx.reset(token_enabled)
            mcd_rate_ctx.reset(token_rate)
            
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
            outputs = self.explanation_model(inputs_embeds=embeds, attention_mask=attention_mask)
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


# Initialize Classifiers
# Note: we initialize them here so they are ready when imported.
# In a larger app we might want to lazy-load them.
print("[ML] Initializing Classifiers...")
eng_classifier = MCDClassifierWithSHAP(
    config.ENG_MODEL_PATH, n_iterations=25, inference_dropout_rate=0.05
)
fil_classifier = MCDClassifierWithSHAP(
    config.FIL_MODEL_PATH, n_iterations=25, inference_dropout_rate=0.05
)
print("[ML] Classifiers Initialized")


def classifier(text):
    try:
        # Pre-validate: reject very short/random text before language detection
        # This prevents langdetect from misclassifying gibberish as random languages
        if _count_words(text) < config.SYMPTOM_MIN_WORDS and len(text) < config.SYMPTOM_MIN_CHARS:
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
                f"{d['disease']}: {(d['probability']*100):.2f}%" for d in top_diseases
            ]

            print(f"[RESULT] {pred} (conf: {confidence:.3f}, MI: {uncertainty:.4f})")
            
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
                f"{d['disease']}: {(d['probability']*100):.2f}%" for d in top_diseases
            ]

            print(f"[RESULT] {pred} (conf: {confidence:.3f}, MI: {uncertainty:.4f})")

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

        words, word_attrs = aggregate_subword_attributions(tokens, attrs)
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
