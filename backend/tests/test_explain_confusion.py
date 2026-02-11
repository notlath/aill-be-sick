
import unittest
import sys
import os
from unittest.mock import MagicMock, patch

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app

class TestExplainConfusion(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    @patch('app.api.diagnosis.explainer')
    def test_explain_valid_payload(self, mock_explainer):
        """
        Scenario: Call /diagnosis/explain with valid payload (Confusion case).
        Expectation: 200 OK.
        """
        # Mock explainer return
        mock_explainer.return_value = {
            "tokens": ["confused", "cough"],
            "attributions": [0.5, 0.3],
            "symptoms": "I am confused and coughing"
        }

        payload = {
            "symptoms": "I am confused and coughing",
            "mean_probs": [0.1, 0.9, 0.0, 0.0, 0.0, 0.0]
        }
        
        resp = self.client.post('/diagnosis/explain', json=payload)
        print(f"\nResponse: {resp.status_code}")
        print(f"Data: {resp.get_json()}")
        
        self.assertEqual(resp.status_code, 200, "Should return 200 OK")

    def test_explain_missing_mean_probs(self):
        """
        Scenario: Call /diagnosis/explain without mean_probs (Frontend error suspect).
        Expectation: 400 Bad Request (handled), NOT 500.
        """
        payload = {
            "symptoms": "I am confused and coughing"
        }
        
        resp = self.client.post('/diagnosis/explain', json=payload)
        print(f"\nResponse (No mean_probs): {resp.status_code}")
        
        self.assertEqual(resp.status_code, 400, "Should return 400 Bad Request")

if __name__ == "__main__":
    unittest.main()
