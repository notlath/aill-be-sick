import gc
import traceback
import numpy as np
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from scipy.stats import entropy

import config
from utils import _count_words, _has_medical_keywords


class MonteCarloDropoutClassifier:
    def __init__(self, model_path, n_iterations=25, inference_dropout_rate=0.05, device=None):
        self.n_iterations = n_iterations
        self.inference_dropout_rate = inference_dropout_rate
        self.device = device if device else ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model.eval()

    def enable_dropout_with_rate(self, dropout_rate=None):
        if dropout_rate is None:
            dropout_rate = self.inference_dropout_rate
        for module in self.model.modules():
            name = module.__class__.__name__
            if name.startswith("Dropout"):
                # set dropout probability and put module in train mode for MC dropout
                try:
                    module.p = dropout_rate
                except Exception:
                    pass
                module.train()
            elif "Norm" in name:
                # keep normalization layers in eval
                module.eval()

    def predict_with_uncertainty(self, text):
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, padding=True)
        self.enable_dropout_with_rate()
        all_predictions = []
        with torch.no_grad():
            for i in range(self.n_iterations):
                outputs = self.model(**inputs)
                probabilities = torch.softmax(outputs.logits, dim=-1)
                all_predictions.append(probabilities.cpu().numpy())
                if i % 10 == 0:
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
            "predicted_label": [self.model.config.id2label[idx] for idx in predicted_class],
            "mean_probabilities": mean_probs,
            "std_probabilities": std_probs,
            "confidence": confidence,
            "predictive_entropy": predictive_entropy,
            "mutual_information": mutual_information,
        }

    def compute_mutual_information(self, predictions):
        expected_entropy = np.mean([entropy(p, axis=-1) for p in predictions], axis=0)
        mean_probs = predictions.mean(axis=0)
        entropy_of_expected = entropy(mean_probs, axis=-1)
        return entropy_of_expected - expected_entropy


# instantiate models once (may be heavy; consider lazy loading later)
eng_classifier = MonteCarloDropoutClassifier(config.ENG_MODEL_PATH)
fil_classifier = MonteCarloDropoutClassifier(config.FIL_MODEL_PATH)


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

        return pred, confidence, uncertainty, probs, model_used, top_diseases

    except Exception:
        traceback.print_exc()
        raise
