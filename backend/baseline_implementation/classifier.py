from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch
import torch.nn.functional as F

from constants import (
    ENG_MODEL_PATH,
    FIL_MODEL_PATH,
    SYMPTOM_MIN_WORDS,
    SYMPTOM_MIN_CHARS,
    MEDICAL_KEYWORDS_EN,
    MEDICAL_KEYWORDS_TL,
)
from helpers import _count_words, _has_medical_keywords
from langdetect import detect_langs
import gc


class BaselineClassifier:
    def __init__(self, model_path):
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_path)
        self.model.eval()

    def predict(self, text) -> dict[
            str,
            int | str | float | list | tuple]:
        inputs = self.tokenizer(text, return_tensors="pt",
                                padding=True, truncation=True)

        with torch.no_grad():
            outputs = self.model(**inputs)
            probabilities = F.softmax(outputs.logits, dim=-1)
            predicted_class = int(probabilities.argmax(dim=-1).item())
            predicted_label = self.model.config.id2label[predicted_class]
            confidence = float(probabilities[0, predicted_class].item())
            probs = probabilities.squeeze().tolist()
            top_diseases = sorted(
                [(self.model.config.id2label[i], prob)
                 for i, prob in enumerate(probs)],
                key=lambda x: x[1],
                reverse=True,
            )[:6]
            mean_probs = sum(probs) / len(probs)

        return {
            "predicted_class": predicted_class,
            "pred": predicted_label,
            "confidence": confidence,
            "probs": probs,
            "top_diseases": top_diseases,
            "mean_probs": mean_probs,
        }


eng_classifier = BaselineClassifier(ENG_MODEL_PATH)
fil_classifier = BaselineClassifier(FIL_MODEL_PATH)


def classifier(text):
    try:
        # Pre-validate: reject very short/random text before language detection
        # This prevents langdetect from misclassifying gibberish as random languages
        if _count_words(text) < SYMPTOM_MIN_WORDS and len(text) < SYMPTOM_MIN_CHARS:
            raise ValueError("INSUFFICIENT_SYMPTOM_EVIDENCE:Text too short")

        # Wrap language detection in try-except to handle edge cases
        try:
            # Get language probabilities instead of just top language
            lang_probs = detect_langs(text)

            # Check if English or Tagalog/Filipino are in top candidates
            supported_langs = {"en", "tl", "fil"}
            detected_lang = None

            for lang_prob in lang_probs:
                if lang_prob.lang in supported_langs:
                    detected_lang = lang_prob.lang
                    print(
                        f"[LANG] Detected: {lang_prob.lang} (confidence: {lang_prob.prob:.2f})"
                    )
                    break

            # If no supported language found, check for medical keywords to determine language
            if detected_lang is None:
                text_lower = text.lower()
                has_en_keyword = any(
                    keyword in text_lower for keyword in MEDICAL_KEYWORDS_EN
                )
                has_tl_keyword = any(
                    keyword in text_lower for keyword in MEDICAL_KEYWORDS_TL
                )

                top_lang = lang_probs[0].lang if lang_probs else "unknown"

                if has_en_keyword and not has_tl_keyword:
                    detected_lang = "en"
                    print(
                        f"[LANG] Fallback: {top_lang} → en (English keywords found)")
                elif has_tl_keyword and not has_en_keyword:
                    detected_lang = "tl"
                    print(
                        f"[LANG] Fallback: {top_lang} → tl (Tagalog keywords found)")
                elif has_en_keyword or has_tl_keyword:
                    # Both or ambiguous, default to English
                    detected_lang = "en"
                    print(
                        f"[LANG] Fallback: {top_lang} → en (ambiguous keywords)")
                else:
                    # Use the top detected language even if unsupported
                    detected_lang = top_lang

            lang = detected_lang

        except Exception as lang_err:
            print(f"[LANG] Detection failed: {lang_err}, defaulting to en")
            # Default to English if detection fails on edge cases
            lang = "en"

        # Check for medical keywords to ensure the text is health-related
        if not _has_medical_keywords(text):
            raise ValueError(
                "INSUFFICIENT_SYMPTOM_EVIDENCE:No medical keywords found")

        if lang == "en":
            print("[CLASSIFIER] Using English BioClinical ModernBERT model")

            result = eng_classifier.predict(text)
            predicted_class = result["predicted_class"]
            pred = result['pred']
            confidence = result["confidence"]
            probs = result["probs"]
            model_used = "BioClinical ModernBERT"
            top_diseases = result["top_diseases"]
            mean_probs = result["mean_probs"]

            gc.collect()

            return {
                "predicted_class": predicted_class,
                "confidence": confidence,
                "probs": probs,
                "pred": pred,
                "model_used": model_used,
                "top_diseases": top_diseases,
                "mean_probs": mean_probs,
            }

        elif lang in ["tl", "fil"]:
            print("[CLASSIFIER] Using Tagalog RoBERTa model")

            result = fil_classifier.predict(text)
            predicted_class = result["predicted_class"]
            pred = result['pred']
            confidence = result["confidence"]
            probs = result["probs"]
            model_used = "RoBERTa Tagalog"
            top_diseases = result["top_diseases"]
            mean_probs = result["mean_probs"]

            gc.collect()

            return {
                "predicted_class": predicted_class,
                'pred': pred,
                "confidence": confidence,
                "probs": probs,
                "model_used": model_used,
                "top_diseases": top_diseases,
                "mean_probs": mean_probs,
            }

        else:
            print(f"Unsupported language detected: {lang}")

            raise ValueError(f"UNSUPPORTED_LANGUAGE:{lang}")

    except Exception as e:
        import traceback

        error_msg = str(e)
        print(f"ERROR in classifier: {error_msg}")
        print(traceback.format_exc())

        raise
