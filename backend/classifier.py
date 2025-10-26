import gc
import traceback
import numpy as np
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from scipy.stats import entropy
from captum.attr import GradientShap
import torch.nn.functional as F

import config
from utils import _count_words, _has_medical_keywords


class MCDClassifierWithSHAP:
    def __init__(
        self, model_path, n_iterations=50, inference_dropout_rate=0.05, device=None
    ):
        self.n_iterations = n_iterations
        self.inference_dropout_rate = inference_dropout_rate
        self.device = (
            device if device else ("cuda" if torch.cuda.is_available() else "cpu")
        )
        self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model.eval()

    def enable_dropout_with_rate(self, dropout_rate=None):
        """
        Enable dropout layers with a specified rate (or use default).
        For MC Dropout, use LOWER rate than training (e.g., 0.05 instead of 0.1)
        """
        if dropout_rate is None:
            dropout_rate = self.inference_dropout_rate

        for module in self.model.modules():
            if module.__class__.__name__.startswith("Dropout"):
                module.p = dropout_rate
                module.train()
            elif "Norm" in module.__class__.__name__:
                module.eval()

    def predict_with_uncertainty(self, text):
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
        ).to(self.device) # Move inputs to device and ensure correct type
        inputs["input_ids"] = inputs["input_ids"].to(torch.long)
        inputs["attention_mask"] = inputs["attention_mask"].to(torch.long)

        self.enable_dropout_with_rate(dropout_rate=self.inference_dropout_rate)

        all_predictions = []

        with torch.no_grad():
            for _ in range(self.n_iterations):
                outputs = self.model(**inputs)
                probabilities = torch.softmax(outputs.logits, dim=-1)
                all_predictions.append(probabilities.cpu().numpy())

                if _ % 10 == 0:
                    gc.collect()

        all_predictions = np.stack(all_predictions)
        mean_probs = all_predictions.mean(axis=0)
        std_probs = all_predictions.std(axis=0)
        predicted_class = mean_probs.argmax(axis=-1)
        confidence = mean_probs.max(axis=-1)
        predictive_entropy = entropy(mean_probs, axis=-1)
        mutual_information = self.compute_mutual_information(all_predictions)

        del all_predictions
        gc.collect()

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

    def explain_with_gradient_shap(self, text, mean_probs=None, target_class=None, n_baselines=5):
        """
        Compute token-level attributions using Captum's GradientSHAP on embeddings.
        """
        self.model.zero_grad()

        # Tokenize input
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
        ).to(self.device)

        mean_probs = torch.tensor(mean_probs, device=self.device)
        predicted_class = (
            mean_probs.argmax(dim=-1).item()
            if target_class is None
            else target_class
        )

        # 1️⃣ Get embeddings from the model
        embeddings = self.model.get_input_embeddings()(inputs["input_ids"])

        # 2️⃣ Define a forward function that takes embeddings
        def forward_func(embeds):
            attention_mask = inputs["attention_mask"]
            outputs = self.model(inputs_embeds=embeds, attention_mask=attention_mask)
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
            mp = mean_probs.detach().cpu().numpy() if hasattr(mean_probs, "detach") else np.array(mean_probs)
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


# instantiate models once (may be heavy; consider lazy loading later)
eng_classifier = MCDClassifierWithSHAP(config.ENG_MODEL_PATH)
fil_classifier = MCDClassifierWithSHAP(config.FIL_MODEL_PATH)


def classifier(text: str):
    try:
        # Basic gating for very short inputs
        if _count_words(text) < config.SYMPTOM_MIN_WORDS and len(text) < config.SYMPTOM_MIN_CHARS:
            raise ValueError("INSUFFICIENT_SYMPTOM_EVIDENCE:Text too short")

        # Language hint: prefer Tagalog if Tagalog keywords appear
        text_lower = (text or "").lower()
        has_tl = any(k in text_lower for k in config.MEDICAL_KEYWORDS_TL)
        lang = "tl" if has_tl else "en"

        # Ensure health-related
        if not _has_medical_keywords(text, config.MEDICAL_KEYWORDS_EN, config.MEDICAL_KEYWORDS_TL):
            raise ValueError("INSUFFICIENT_SYMPTOM_EVIDENCE:No medical keywords found")

        if lang == "en":
            result = eng_classifier.predict_with_uncertainty(text)
        else:
            result = fil_classifier.predict_with_uncertainty(text)

        pred = result["predicted_label"][0]
        confidence = float(result["confidence"][0])
        uncertainty = float(result["mutual_information"][0])
        mean_probs = result["mean_probabilities"]

        # Build top allowed diseases list
        all_probs = result["mean_probabilities"][0]
        top_diseases = []
        for idx, label in eng_classifier.model.config.id2label.items():
            if label in config.ALLOWED_DISEASES:
                top_diseases.append({"disease": label, "probability": float(all_probs[idx])})
        top_diseases.sort(key=lambda x: x["probability"], reverse=True)

        # If predicted label not allowed, choose top allowed
        if pred not in config.ALLOWED_DISEASES and top_diseases:
            pred = top_diseases[0]["disease"]

        probs = [f"{d['disease']}: {d['probability']*100:.2f}%" for d in top_diseases]
        model_used = "BioClinical ModernBERT" if lang == "en" else "RoBERTa Tagalog"

        return pred, confidence, uncertainty, probs, model_used, top_diseases, mean_probs

    except Exception:
        traceback.print_exc()
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
        explanation_result = model.explain_with_gradient_shap(text, mean_probs=mean_probs_arr)
        
        tokens = explanation_result["tokens"]
        attrs = explanation_result["attributions"]

        words, word_attrs = aggregate_subword_attributions(tokens, attrs)

        # Ensure the returned structure is JSON serializable: convert arrays to lists
        explanation_result["mean_probs"] = mean_probs_arr.tolist()

        return {
            "symptoms": text,
            "tokens": [{"token": w, "importance": float(a)} for w, a in zip(words, word_attrs)]
        }

    except Exception:
        traceback.print_exc()
        raise

def aggregate_subword_attributions(tokens, attributions):
    """
    Merge subword tokens (e.g., Ġirrit + ating -> 'irritating')
    and sum their attributions to produce word-level importance.
    Works for both BPE (Ġ) and WordPiece (##) style tokenizers.
    """
    words = []
    word_attrs = []
    current_word = ""
    current_attr = 0.0

    for token, attr in zip(tokens, attributions):
        if token in ["[CLS]", "[SEP]", "[PAD]"]:
            continue

        if token.startswith("Ġ"):
            if current_word:
                words.append(current_word.strip())
                word_attrs.append(current_attr)
            current_word = token.replace("Ġ", " ")
            current_attr = attr

        elif token.startswith("##"):
            current_word += token[2:]
            current_attr += attr

        else:
            if current_word and current_word.endswith(" "):
                words.append(current_word.strip())
                word_attrs.append(current_attr)
                current_word = token
                current_attr = attr
            else:
                current_word += token
                current_attr += attr

    if current_word:
        words.append(current_word.strip())
        word_attrs.append(current_attr)

    return words, np.array(word_attrs)