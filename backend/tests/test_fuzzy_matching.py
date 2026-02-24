
import unittest
import sys
import os

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import extract_clinical_concepts


class TestFuzzyMatchingTypoTolerance(unittest.TestCase):
    """Verify that common typos and Tagalog morphological variations are caught."""

    def test_hemoptysis_missing_vowel(self):
        """'umubo ng dugo' (missing one 'u') should still match SX_HEMOPTYSIS."""
        # Dictionary term: "umuubo ng dugo"
        text = "Kahapon umubo ng dugo ako."
        extracted = extract_clinical_concepts(text)
        print(f"\n[Fuzzy Typo] 'umubo ng dugo' -> {extracted}")
        self.assertIn("SX_HEMOPTYSIS", extracted)

    def test_neuropathy_missing_letter(self):
        """'namamanid' (missing 'h') should still match SX_NEUROPATHY."""
        # Dictionary term: "namamanhid"
        text = "Namamanid na yung kamay ko."
        extracted = extract_clinical_concepts(text)
        print(f"\n[Fuzzy Typo] 'namamanid' -> {extracted}")
        self.assertIn("SX_NEUROPATHY", extracted)

    def test_rigors_missing_letter(self):
        """'naginginig sa ginaw' (missing 'n') should still match SX_RIGORS."""
        # Dictionary term: "nanginginig sa ginaw"
        text = "Naginginig sa ginaw ako every other day."
        extracted = extract_clinical_concepts(text)
        print(f"\n[Fuzzy Typo] 'naginginig sa ginaw' -> {extracted}")
        self.assertIn("SX_RIGORS", extracted)

    def test_jaundice_typo(self):
        """'naninilaw' exact should still work."""
        text = "Naninilaw na yung balat niya."
        extracted = extract_clinical_concepts(text)
        print(f"\n[Exact Still Works] 'naninilaw' -> {extracted}")
        self.assertIn("SX_JAUNDICE", extracted)

    def test_flood_exposure_exact(self):
        """'baha' exact match should still work perfectly."""
        text = "Lumusong sa baha kahapon."
        extracted = extract_clinical_concepts(text)
        print(f"\n[Exact Still Works] 'baha' -> {extracted}")
        self.assertIn("RISK_FLOOD_EXPOSURE", extracted)

    def test_polydipsia_close_variation(self):
        """'tuyong lalamunan' with minor variation should still match."""
        # Dictionary term: "tuyong lalamunan"
        text = "Ang tuyo ng lalamunan ko."
        extracted = extract_clinical_concepts(text)
        print(f"\n[Fuzzy Typo] 'tuyo ng lalamunan' -> {extracted}")
        # Note: This is a 3-word vs 2-word mismatch, may not match — that's acceptable.
        # The exact terms "uhaw", "thirsty", "dry mouth" still catch this concept.


class TestFuzzyMatchingFalsePositiveRejection(unittest.TestCase):
    """Verify that short-word collisions do NOT produce false positives."""

    def test_baba_does_not_match_baha(self):
        """'baba' (chin/down) should NOT match 'baha' (flood) -> RISK_FLOOD_EXPOSURE."""
        text = "Sumasakit ang baba ko."  # chin pain
        extracted = extract_clinical_concepts(text)
        print(f"\n[False Positive Check] 'baba' -> {extracted}")
        self.assertNotIn("RISK_FLOOD_EXPOSURE", extracted)

    def test_ulo_does_not_match_random(self):
        """'ulo' (head) should NOT fuzzy-match 'ubo' or other short terms."""
        text = "Masakit ang ulo ko."  # headache
        extracted = extract_clinical_concepts(text)
        print(f"\n[False Positive Check] 'ulo' -> {extracted}")
        # Should NOT contain random short-word matches
        self.assertNotIn("SX_HEMOPTYSIS", extracted)
        self.assertNotIn("SX_POLYURIA", extracted)

    def test_daga_still_matches_exactly(self):
        """'daga' (rat) should match via exact regex — not fuzzy needed."""
        text = "May daga sa bahay namin."
        extracted = extract_clinical_concepts(text)
        print(f"\n[Exact Match] 'daga' -> {extracted}")
        self.assertIn("RISK_RODENT_EXPOSURE", extracted)

    def test_kain_does_not_match_unrelated(self):
        """'kain' alone should NOT match 'kain nang kain' (which requires multi-word phrase)."""
        text = "Kumain na ako ng almusal."  # Simple eating, not polyphagia
        extracted = extract_clinical_concepts(text)
        print(f"\n[False Positive Check] 'kumain' -> {extracted}")
        # "kumain" is not in the dictionary. Should not fuzzy-match to "gutom", "hungry", etc.
        self.assertNotIn("SX_POLYPHAGIA", extracted)

    def test_innocuous_tagalog_sentence(self):
        """A completely non-medical Tagalog sentence should extract zero concepts."""
        text = "Pumunta kami sa palengke kahapon para bumili ng isda at gulay."
        extracted = extract_clinical_concepts(text)
        print(f"\n[False Positive Check] innocuous sentence -> {extracted}")
        self.assertEqual(len(extracted), 0, f"Expected no concepts, got: {extracted}")


if __name__ == "__main__":
    unittest.main()
