
import unittest
import sys
import os

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import VerificationLayer, OntologyBuilder, extract_clinical_concepts, QUESTION_BANK_EN, QUESTION_BANK_TL
import config

class TestCommonConfounders(unittest.TestCase):
    def setUp(self):
        self.ontology = OntologyBuilder(QUESTION_BANK_EN, QUESTION_BANK_TL)
        self.verifier = VerificationLayer(self.ontology)

    def test_dengue_vs_leptospirosis(self):
        """
        Scenario: Patient looks like Dengue (Fever, Headache) but has Calf Pain (Leptospirosis Red Flag).
        Expectation: OUT OF SCOPE
        """
        # "Masakit ang binti" = SX_CALF_PAIN (Red Flag)
        text = "I have a high fever and headache. Masakit ang binti ko at hindi ako makalakad."
        predicted_disease = "Dengue"
        
        extracted = extract_clinical_concepts(text)
        print(f"\n[Dengue vs Lepto] Extracted: {extracted}")
        
        self.assertIn("SX_CALF_PAIN", extracted, "Should extract calf pain")
        
        # Verify
        result = self.verifier.verify(text, predicted_disease)
        print(f"[Dengue vs Lepto] Result: {result}")
        
        self.assertFalse(result["is_valid"], "Should be invalid due to calf pain")
        self.assertIn("SX_CALF_PAIN", result["unexplained_concepts"])

    def test_pneumonia_vs_tuberculosis(self):
        """
        Scenario: Patient looks like Pneumonia (Cough, Fever) but coughing blood (TB Red Flag).
        Expectation: OUT OF SCOPE
        """
        # "umuubo ng dugo" = SX_HEMOPTYSIS (Red Flag)
        text = "I've been coughing for a while and have a fever. Kahapon umuubo ng dugo."
        predicted_disease = "Pneumonia"
        
        extracted = extract_clinical_concepts(text)
        print(f"\n[Pneumonia vs TB] Extracted: {extracted}")
        
        self.assertIn("SX_HEMOPTYSIS", extracted, "Should extract hemoptysis")
        
        # Verify
        result = self.verifier.verify(text, predicted_disease)
        print(f"[Pneumonia vs TB] Result: {result}")
        
        self.assertFalse(result["is_valid"], "Should be invalid die to hemoptysis")
        self.assertIn("SX_HEMOPTYSIS", result["unexplained_concepts"])

    def test_typhoid_vs_malaria(self):
        """
        Scenario: Patient looks like Typhoid (Fever) but has Rigors/Chills (Malaria Red Flag).
        Expectation: OUT OF SCOPE
        """
        # "nanginginig sa ginaw" = SX_RIGORS (Red Flag)
        text = "Matagal na akong may lagnat. Pero nanginginig sa ginaw every other day."
        predicted_disease = "Typhoid"
        
        extracted = extract_clinical_concepts(text)
        print(f"\n[Typhoid vs Malaria] Extracted: {extracted}")
        
        self.assertIn("SX_RIGORS", extracted, "Should extract rigors")
        
        # Verify
        result = self.verifier.verify(text, predicted_disease)
        print(f"[Typhoid vs Malaria] Result: {result}")
        
        self.assertFalse(result["is_valid"], "Should be invalid due to rigors")
        self.assertIn("SX_RIGORS", result["unexplained_concepts"])

    def test_diarrhea_vs_cancer(self):
        """
        Scenario: Patient has loose stools but they are pencil thin (Cancer Red Flag).
        Expectation: OUT OF SCOPE
        """
        # "duming parang lapis" = SX_PENCIL_STOOL (Red Flag)
        text = "May diarrhea ako pero napansin ko na duming parang lapis yung lumalabas."
        predicted_disease = "Diarrhea"
        
        extracted = extract_clinical_concepts(text)
        print(f"\n[Diarrhea vs Cancer] Extracted: {extracted}")
        
        self.assertIn("SX_PENCIL_STOOL", extracted, "Should extract pencil stool")
        
        # Verify
        result = self.verifier.verify(text, predicted_disease)
        print(f"[Diarrhea vs Cancer] Result: {result}")
        
        self.assertFalse(result["is_valid"], "Should be invalid due to pencil stool")
        self.assertIn("SX_PENCIL_STOOL", result["unexplained_concepts"])

if __name__ == "__main__":
    unittest.main()
