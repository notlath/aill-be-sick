
import sys
import os
from transformers import AutoTokenizer

# Mock paths - adjust if necessary to where user models actually are
# Based on app.py:
eng_model_path = "notlath/BioClinical-ModernBERT-base-Symptom2Disease_WITH-DROPOUT-42"
fil_model_path = "notlath/RoBERTa-Tagalog-base-Symptom2Disease_WITH-DROPOUT-42"

def count_tokens(tokenizer, text):
    tokens = tokenizer.tokenize(text)
    return len(tokens)

def test_heuristic():
    print("Loading tokenizers...")
    try:
        eng_tok = AutoTokenizer.from_pretrained(eng_model_path)
        fil_tok = AutoTokenizer.from_pretrained(fil_model_path)
    except Exception as e:
        print(f"Error loading tokenizers: {e}")
        return

    samples = {
        "en": [
            "I have a severe headache and high fever.",
            "My stomach hurts and I feel dizzy.",
            "Shortness of breath and chest pain."
        ],
        "tl": [
            "Masakit ang ulo ko at nilalagnat ako.",
            "Sumasakit ang tiyan ko at nahihilo.",
            "Hirap huminga at masakit ang dibdib."
        ],
        "mixed": [
            "Masakit ang head ko.",
            "I have lagnat."
        ]
    }

    print(f"\n{'Text':<40} | {'EN Tokens':<10} | {'TL Tokens':<10} | {'Prediction':<10}")
    print("-" * 80)

    for lang, texts in samples.items():
        for text in texts:
            en_len = count_tokens(eng_tok, text)
            tl_len = count_tokens(fil_tok, text)
            
            # Heuristic: Lower token count = Better match
            pred = "en" if en_len < tl_len else "tl" if tl_len < en_len else "ambiguous"
            
            print(f"{text[:40]:<40} | {en_len:<10} | {tl_len:<10} | {pred:<10}")

if __name__ == "__main__":
    test_heuristic()
