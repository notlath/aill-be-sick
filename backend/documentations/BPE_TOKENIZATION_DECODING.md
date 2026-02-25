# Fixing BPE Tokenization Issues in SHAP Explanations

## The Problem
When displaying SHAP (SHapley Additive exPlanations) tokens for our models (`BioClinical-ModernBERT-base-Symptom2Disease` and `RoBERTa-Tagalog-base-Symptom2Disease`), the frontend was showing garbled text for certain inputs. For example:
- `fever—it` became `feverâĢĶit`
- `104°F` became `104Â°F`
- `(40°C)` became `(40Â°C)`

## The Root Cause: Byte-Level BPE
Modern transformer models like RoBERTa and ModernBERT use a tokenization strategy called **Byte-Level Byte-Pair Encoding (BPE)**. 

To ensure the model can handle any possible text input (even emojis or unknown characters) without an explicit `<UNK>` token, Byte-Level BPE operates directly on raw bytes rather than Unicode characters. 
It maps all 256 possible byte values to visible, printable Unicode characters (often in the `U+0100` to `U+01FF` range like `Ġ`, `â`, `Ģ`, `Ķ`). 

For instance:
- `Ġ` represents a leading space.
- `âĢĶ` might represent the byte sequence for an em-dash (`—`).
- `Â°` represents the byte sequence for the degree symbol (`°`).

Previously, our token aggregation logic (`aggregate_subword_attributions`) was concatenating these raw subword strings directly. This meant the internal byte-to-character mapping created by the BPE tokenizer was never reversed, causing the garbled text (`âĢĶ`) to be sent to the frontend.

## The Solution

To resolve this, we must use the tokenizer to explicitly decode the subwords back into standard UTF-8 text.

### Initial Attempt: `convert_tokens_to_string()`
Our first attempt was to group the tokens and use `tokenizer.convert_tokens_to_string(current_tokens)`. However, for many fast tokenizers in the Hugging Face library, this method is too simplistic. It replaces the `Ġ` marker with a space and concatenates the pieces, but it **does not** execute the underlying decoder layer that reverses the byte mappings. Therefore, `âĢĶ` remained `âĢĶ`.

### The Correct Approach: `convert_tokens_to_ids()` + `decode()`
To force the tokenizer to run its full decoding pipeline (which includes the Byte-Level decoding step), we must convert the subword tokens back to their numerical IDs and invoke the robust `decode()` method.

```python
# 1. Group the tokens belonging to a single word
current_tokens = ['fever', 'âĢĶ', 'it']

# 2. Convert tokens back to their numerical vocabulary IDs
ids = tokenizer.convert_tokens_to_ids(current_tokens)

# 3. Use the tokenizer's robust decode method
decoded_word = tokenizer.decode(ids, clean_up_tokenization_spaces=False).strip()
# Result: 'fever—it'
```

We updated the `aggregate_subword_attributions` function in `backend/app/utils/__init__.py` to accept an optional `tokenizer` parameter. When provided (e.g., from `ml_service.py`), the function now safely decodes BPE strings back into clean, human-readable UTF-8 words before returning them for the frontend UI.

## Key Takeaway
When working with subword pieces from Byte-Level BPE tokenizers, **never rely on direct string manipulation or `convert_tokens_to_string` to reform words containing special characters.** Always convert the tokens back to IDs and use the tokenizer's native `decode()` method to assure correct UTF-8 byte un-mapping.
