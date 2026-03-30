
import unittest
import sys
import os

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import VerificationLayer, OntologyBuilder, extract_clinical_concepts, QUESTION_BANK_EN, QUESTION_BANK_TL
import config

class TestPneumoniaRigors(unittest.TestCase):
    def setUp(self):
        self.ontology = OntologyBuilder(QUESTION_BANK_EN, QUESTION_BANK_TL)
        self.verifier = VerificationLayer(self.ontology)

    def test_pneumonia_with_rigors(self):
        """
        Scenario: Patient has Pneumonia symptoms AND Rigors (shaking chills).
        Expectation: VALID (Rigors should be part of Pneumonia profile now)
        """
        # "shaking chills" = SX_RIGORS
        text = "I have a high fever, cough, and uncontrollable shaking chills."
        predicted_disease = "Pneumonia"
        
        extracted = extract_clinical_concepts(text)
        print(f"\n[Pneumonia + Rigors] Extracted: {extracted}")
        
        self.assertIn("SX_RIGORS", extracted, "Should extract rigors")
        
        # Verify
        result = self.verifier.verify(text, predicted_disease)
        print(f"[Pneumonia + Rigors] Result: {result}")
        
        self.assertTrue(result["is_valid"], f"Should be valid. Unexplained: {result.get('unexplained_concepts')}")
        self.assertEqual(len(result["unexplained_concepts"]), 0)

if __name__ == "__main__":
    unittest.main()
