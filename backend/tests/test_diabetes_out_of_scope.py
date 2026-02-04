
import sys
import os

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import config
from app import extract_clinical_concepts, VerificationLayer, OntologyBuilder, QUESTION_BANK_EN, QUESTION_BANK_TL

def test_diabetes_identification():
    print("🧪 Testing Diabetes Out-of-Scope Detection...")
    
    # 1. Simulate the user's input (Tagalog)
    text = "nitong mga nakaraang linggo, parang hindi na ako makatulog nang maayos kasi gising ako nang gising sa gabi para umihi. Tapos kahit ang dami ko nang naiinom na tubig, parang laging tuyong-tuyo pa rin yung lalamunan ko at uhaw na uhaw ako. Ang weird lang kasi kain naman ako nang kain at laging gutom, pero napansin ko sa salamin na parang pumapayat yata ako bigla. Mabilis din akong mapagod ngayon, yung tipong konting galaw lang parang ang bigat-bigat na ng katawan ko. May napansin din akong maliit na sugat sa paa ko na ilang linggo na, pero hanggang ngayon ayaw pa ring gumaling-galing. Madalas din pong namamanhid yung mga kamay at paa ko, tapos parang lumalabo na rin yung paningin ko kaya nag-aalala na ako."
    
    print(f"\n📝 Input Text: {text[:50]}...")
    
    # 2. Test Concept Extraction
    extracted = extract_clinical_concepts(text)
    print(f"\n🔍 Extracted Concepts: {extracted}")
    
    expected_concepts = {
        "SX_POLYURIA",      # "umihi", "gising... para umihi" (checked vs "umihi")
        "SX_POLYDIPSIA",    # "uhaw na uhaw", "tuyo... lalamunan"
        "SX_POLYPHAGIA",    # "kain nang kain", "gutom"
        "SX_WEIGHT_LOSS",   # "pumapayat"
        "SX_SLOW_HEALING",  # "sugat... ayaw... gumaling"
        "SX_NEUROPATHY",    # "namamanhid"
        "SX_BLURRED_VISION" # "lumalabo... paningin"
    }
    
    missing = expected_concepts - extracted
    if missing:
        print(f"❌ MISSING CONCEPTS: {missing}")
    else:
        print("✅ All expected Diabetes concepts extracted.")
        
    # 3. Test Verification vs Diarrhea
    print("\n🛡️  Verifying against 'Diarrhea' ontology...")
    
    # Initialize real ontology
    ontology = OntologyBuilder(QUESTION_BANK_EN, QUESTION_BANK_TL)
    verifier = VerificationLayer(ontology)
    
    # Verify
    result = verifier.verify(text, "Diarrhea")
    print(f"   Result: {result}")
    
    if result["is_valid"] is False:
        print("✅ SUCCESS: Correctly flagged as INVALID.")
        print(f"   Unexplained: {result['unexplained_concepts']}")
        return True
    else:
        print("❌ FAILURE: Wrongly accepted as VALID.")
        return False

if __name__ == "__main__":
    success = test_diabetes_identification()
    sys.exit(0 if success else 1)
