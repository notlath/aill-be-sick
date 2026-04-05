import os
import sys
import unittest

# Add backend to path
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backend"))
)

from app import (  # noqa: E402
    OntologyBuilder,
    QUESTION_BANK_EN,
    QUESTION_BANK_TL,
    VerificationLayer,
    extract_clinical_concepts,
)


class TestDengueRetroorbitalPain(unittest.TestCase):
    def setUp(self):
        self.ontology = OntologyBuilder(QUESTION_BANK_EN, QUESTION_BANK_TL)
        self.verifier = VerificationLayer(self.ontology)

    def test_extracts_retroorbital_pain_from_question_bank_phrasing(self):
        english_text = (
            "Do you feel a deep, intense pain right behind your eyes, "
            "especially when you move them?"
        )
        tagalog_text = (
            "Nakakaranas ka ba ng pananakit sa mata o sa likod ng iyong mga mata?"
        )

        english_extracted = extract_clinical_concepts(english_text)
        tagalog_extracted = extract_clinical_concepts(tagalog_text)

        self.assertIn("SX_RETROORBITAL_PAIN", english_extracted)
        self.assertIn("SX_RETROORBITAL_PAIN", tagalog_extracted)

    def test_dengue_profile_includes_retroorbital_pain(self):
        dengue_profile = self.ontology.get_profile("Dengue")
        self.assertIn("SX_RETROORBITAL_PAIN", dengue_profile)

    def test_verify_accepts_tagalog_retroorbital_pain_for_dengue(self):
        text = "May lagnat ako at sakit sa likod ng mata."
        result = self.verifier.verify(text, "Dengue")

        self.assertTrue(
            result["is_valid"],
            f"Should be valid for Dengue. Unexplained: {result['unexplained_concepts']}",
        )
        self.assertEqual(result["unexplained_concepts"], set())


if __name__ == "__main__":
    unittest.main()
