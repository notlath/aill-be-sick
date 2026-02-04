
import unittest
import sys
import os
import json
from unittest.mock import MagicMock, patch

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app, config

class TestPneumoniaExhaustion(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    @patch('app.classifier')
    @patch('app.VerificationLayer.verify')
    def test_pneumonia_exhaustion_valid_confidence(self, mock_verify, mock_classifier):
        """
        Scenario: All questions asked/skipped. Confidence is 0.76 (Valid > 0.70) but < 0.95 (High).
        Expectation: Should return reason "HIGH_CONFIDENCE_FINAL" (or success), NOT "LOW_CONFIDENCE_FINAL".
        """
        # Mock classifier to always return Pneumonia with 0.76 confidence
        mock_classifier.return_value = (
            "Pneumonia", # pred
            0.76,        # confidence
            0.005,       # uncertainty
            ["Pneumonia: 76.0%", "Influenza: 24.0%"], # probs
            "ModernBERT", # model_used
            [{"disease": "Pneumonia", "probability": 0.76}, {"disease": "Influenza", "probability": 0.24}], # top_diseases
            [] # mean_probs
        )

        # Mock verify to always pass
        mock_verify.return_value = {"is_valid": True, "unexplained_concepts": []}

        # Simulate a state where many questions are already asked or evidenced
        # We'll just send a LOT of symptoms so it skips many questions, 
        # and we set MAX_QUESTIONS to a value that forces exhaustion logic or simple question depletion.
        
        # Actually better to mock the `available_questions` logic or just send "evidence" for all questions.
        # Pneumonia has 10 questions. We'll simulate evidence for ALL of them in the input text.
        text = (
            "I have cough (q1, q2) and difficulty breathing (q3). "
            "I am sweating (q4) and tired (q5). "
            "I have chills (q6) and fever (q7). "
            "My chest hurts (q8) and I am confused (q9). "
            "My breathing pattern changed (q10)."
        )
        
        # First call might just diagnosis.
        # We need to hit the FOLLOW-UP endpoint.
        # The follow-up endpoint recalculates available questions.
        
        # Initial call
        resp = self.client.post('/diagnosis/new', json={'symptoms': text})
        data = resp.get_json()['data']
        
        print(f"Initial Diagnosis Reason: {data.get('reason')}")
        
        if data.get('should_stop'):
             # If it stops immediately, it might be due to valid thresholds?
             # But 0.76 < 0.95 (HIGH_CONFIDENCE), so it might NOT stop if logic is:
             # Stop if > 0.95 OR ...
             # We want it to NOT stop initially (if possible), or if it stops, it should be valid.
             pass
        else:
             # If it asks a question, we answer it.
             # But wait, if we provided ALL symptoms, `available_questions` should be empty.
             # So it SHOULD stop.
             pass

        # If it returns should_stop=True, check the reason.
        self.assertTrue(data.get('should_stop'), "Should stop because no questions left")
        
        # THIS IS THE BUG: It returns LOW_CONFIDENCE_FINAL instead of success
        self.assertNotEqual(data.get('reason'), "LOW_CONFIDENCE_FINAL", "Should NOT fail with LOW_CONFIDENCE_FINAL")
        self.assertIn(data.get('reason'), ["HIGH_CONFIDENCE_FINAL", "Possible"], "Should be a success reason")

if __name__ == "__main__":
    unittest.main()
