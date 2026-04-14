import { describe, expect, it } from "vitest";
import { getClinicalVerificationProtocol } from "@/constants/clinical-verification-protocols";
import { scoreClinicalVerification } from "@/utils/clinical-verification";

describe("scoreClinicalVerification", () => {
  it("returns UNCONFIRMED when only 2-3 symptoms are checked for an 8+ symptom disease", () => {
    const protocol = getClinicalVerificationProtocol("DENGUE");
    expect(protocol).toBeTruthy();

    const result = scoreClinicalVerification(protocol!, [
      "high_fever",
      "severe_headache",
      "extreme_fatigue",
    ]);

    expect(result.status).toBe("UNCONFIRMED");
    expect(result.matchedCount).toBe(3);
    expect(result.minRequiredCount).toBe(4);
  });

  it("returns UNCONFIRMED when only overlapping supporting symptoms are checked", () => {
    const protocol = getClinicalVerificationProtocol("INFLUENZA");
    expect(protocol).toBeTruthy();

    const result = scoreClinicalVerification(protocol!, [
      "headache",
      "scratchy_throat",
      "runny_stuffy_nose",
    ]);

    expect(result.status).toBe("UNCONFIRMED");
    expect(result.coreMatchedCount).toBe(0);
  });

  it("returns CONFIRMED when the threshold and core requirements are met without contradictions", () => {
    const protocol = getClinicalVerificationProtocol("DENGUE");
    expect(protocol).toBeTruthy();

    const result = scoreClinicalVerification(protocol!, [
      "high_fever",
      "severe_body_aches",
      "severe_headache",
      "extreme_fatigue",
    ]);

    expect(result.status).toBe("CONFIRMED");
    expect(result.coreMatchedCount).toBe(2);
    expect(result.contradictionCount).toBe(0);
  });

  it("returns BORDERLINE when the threshold is met but a contradiction is present", () => {
    const protocol = getClinicalVerificationProtocol("DENGUE");
    expect(protocol).toBeTruthy();

    const result = scoreClinicalVerification(protocol!, [
      "high_fever",
      "severe_body_aches",
      "severe_headache",
      "extreme_fatigue",
      "cough_or_runny_nose",
    ]);

    expect(result.status).toBe("BORDERLINE");
    expect(result.contradictionSymptomIds).toEqual(["cough_or_runny_nose"]);
  });

  it("returns UNCONFIRMED when the threshold is met without enough core symptoms", () => {
    const protocol = getClinicalVerificationProtocol("PNEUMONIA");
    expect(protocol).toBeTruthy();

    const result = scoreClinicalVerification(protocol!, [
      "extreme_weakness",
      "body_aches",
      "nausea_vomiting",
      "persistent_headache",
    ]);

    expect(result.status).toBe("UNCONFIRMED");
    expect(result.matchedCount).toBe(4);
    expect(result.coreMatchedCount).toBe(0);
  });
});
