
import re

CLINICAL_CONCEPTS = {
    "ihi": "RISK_CONTAMINATED_WATER",
}

def extract(text):
    found = set()
    for term, concept_id in CLINICAL_CONCEPTS.items():
        pattern = fr"\b{re.escape(term)}\b"
        if re.search(pattern, text):
            found.add(concept_id)
    return found

text = "gising ako nang gising sa gabi para umihi"
print(f"Text: '{text}'")
print(f"Barest 'ihi': {extract(text)}")

# Test what we want
CLINICAL_CONCEPTS_NEW = {
    "ihi": "RISK_CONTAMINATED_WATER",
    "umihi": "SX_POLYURIA",
    "uhaw": "SX_POLYDIPSIA",
}

def extract_new(text):
    found = set()
    for term, concept_id in CLINICAL_CONCEPTS_NEW.items():
        pattern = fr"\b{re.escape(term)}\b"
        if re.search(pattern, text):
            found.add(concept_id)
    return found

print(f"With new terms: {extract_new(text)}")
