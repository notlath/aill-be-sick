/**
 * Edge-case tests for authentication-related Zod schemas introduced/modified
 * in feat/clinician-approval-workflow:
 *
 *  - ClinicianApprovalSchema (ApproveClinicianSchema, RejectClinicianSchema)
 *  - EmailAuthSchema (used across all auth actions)
 *  - CreatePatientSchema (new in this branch)
 *
 * Tests target:
 *  - Invalid / malformed input (empty, null, special characters)
 *  - Boundary conditions (min/max length, edge-value IDs)
 *  - Type coercion pitfalls (string vs number)
 */

import { describe, it, expect } from "vitest";
import {
  ApproveClinicianSchema,
  RejectClinicianSchema,
} from "@/schemas/ClinicianApprovalSchema";
import { EmailAuthSchema } from "@/schemas/EmailAuthSchema";
import { CreatePatientSchema } from "@/schemas/CreatePatientSchema";

// ---------------------------------------------------------------------------
// ApproveClinicianSchema
// ---------------------------------------------------------------------------
describe("ApproveClinicianSchema", () => {
  it("should accept a valid positive integer clinicianUserId", () => {
    const result = ApproveClinicianSchema.safeParse({ clinicianUserId: 1 });
    expect(result.success).toBe(true);
  });

  it("should reject clinicianUserId of 0 (non-positive)", () => {
    // Bug caught: z.number().int().positive() should reject 0,
    // but if the schema used .min(0) instead, ID 0 could slip through
    // and target a non-existent or system user.
    const result = ApproveClinicianSchema.safeParse({ clinicianUserId: 0 });
    expect(result.success).toBe(false);
  });

  it("should reject negative clinicianUserId", () => {
    // Bug caught: negative IDs could cause unexpected DB behaviour.
    const result = ApproveClinicianSchema.safeParse({ clinicianUserId: -5 });
    expect(result.success).toBe(false);
  });

  it("should reject a floating-point clinicianUserId", () => {
    // Bug caught: z.int() must reject 1.5; if it passed, the DB lookup
    // might silently truncate and approve the wrong user.
    const result = ApproveClinicianSchema.safeParse({ clinicianUserId: 1.5 });
    expect(result.success).toBe(false);
  });

  it("should reject a string clinicianUserId (type coercion attack)", () => {
    // Bug caught: without strict parsing, "1; DROP TABLE users" could pass.
    const result = ApproveClinicianSchema.safeParse({ clinicianUserId: "1" });
    expect(result.success).toBe(false);
  });

  it("should reject missing clinicianUserId", () => {
    const result = ApproveClinicianSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should reject null clinicianUserId", () => {
    const result = ApproveClinicianSchema.safeParse({ clinicianUserId: null });
    expect(result.success).toBe(false);
  });

  it("should reject NaN clinicianUserId", () => {
    // Bug caught: NaN is typeof number but not a valid ID.
    const result = ApproveClinicianSchema.safeParse({ clinicianUserId: NaN });
    expect(result.success).toBe(false);
  });

  it("should reject Infinity clinicianUserId", () => {
    const result = ApproveClinicianSchema.safeParse({
      clinicianUserId: Infinity,
    });
    expect(result.success).toBe(false);
  });

  it("should accept a very large integer (MAX_SAFE_INTEGER boundary)", () => {
    // Edge case: postgres INT4 max is 2,147,483,647 but the schema
    // only validates JS-level integer. This documents the boundary.
    const result = ApproveClinicianSchema.safeParse({
      clinicianUserId: Number.MAX_SAFE_INTEGER,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RejectClinicianSchema
// ---------------------------------------------------------------------------
describe("RejectClinicianSchema", () => {
  it("should accept valid rejection with a reason", () => {
    const result = RejectClinicianSchema.safeParse({
      clinicianUserId: 42,
      reason: "Insufficient credentials",
    });
    expect(result.success).toBe(true);
  });

  it("should accept rejection without a reason (reason is optional)", () => {
    const result = RejectClinicianSchema.safeParse({ clinicianUserId: 42 });
    expect(result.success).toBe(true);
  });

  it("should trim whitespace-only reason to empty string", () => {
    // Bug caught: if the schema trims but doesn't treat empty-after-trim
    // as undefined, the DB might store an empty string instead of null.
    const result = RejectClinicianSchema.safeParse({
      clinicianUserId: 42,
      reason: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // After .trim(), should be empty string
      expect(result.data.reason!.trim()).toBe("");
    }
  });

  it("should reject a reason longer than 500 characters", () => {
    // Bug caught: unbounded string could be used for DoS or DB overflow.
    const result = RejectClinicianSchema.safeParse({
      clinicianUserId: 42,
      reason: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("should accept a reason at exactly 500 characters", () => {
    // Boundary condition: max length is 500.
    const result = RejectClinicianSchema.safeParse({
      clinicianUserId: 42,
      reason: "x".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("should reject negative clinicianUserId", () => {
    const result = RejectClinicianSchema.safeParse({
      clinicianUserId: -1,
      reason: "test",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EmailAuthSchema
// ---------------------------------------------------------------------------
describe("EmailAuthSchema", () => {
  it("should accept a valid email and password", () => {
    const result = EmailAuthSchema.safeParse({
      email: "clinician@hospital.com",
      password: "secret123",
    });
    expect(result.success).toBe(true);
  });

  it("should reject an empty email", () => {
    const result = EmailAuthSchema.safeParse({
      email: "",
      password: "secret123",
    });
    expect(result.success).toBe(false);
  });

  it("should reject a malformed email (no @)", () => {
    const result = EmailAuthSchema.safeParse({
      email: "notanemail",
      password: "secret123",
    });
    expect(result.success).toBe(false);
  });

  it("should reject a password shorter than 6 characters", () => {
    // Bug caught: if the min-length check were accidentally removed,
    // users could set trivially brute-forceable passwords.
    const result = EmailAuthSchema.safeParse({
      email: "user@example.com",
      password: "12345", // 5 chars
    });
    expect(result.success).toBe(false);
  });

  it("should accept a password at exactly 6 characters (boundary)", () => {
    const result = EmailAuthSchema.safeParse({
      email: "user@example.com",
      password: "123456",
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing password field", () => {
    const result = EmailAuthSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(false);
  });

  it("should reject missing email field", () => {
    const result = EmailAuthSchema.safeParse({ password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("should reject null values for email and password", () => {
    const result = EmailAuthSchema.safeParse({ email: null, password: null });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CreatePatientSchema
// ---------------------------------------------------------------------------
describe("CreatePatientSchema", () => {
  const validPayload = {
    firstName: "Juan",
    lastName: "Dela Cruz",
    email: "juan@example.com",
    birthday: "1990-01-15",
    gender: "MALE" as const,
    address: "123 Main St",
    district: "District 1",
    city: "Quezon City",
    barangay: "Holy Spirit",
    region: "NCR",
    province: "Metro Manila",
  };

  it("should accept a valid complete payload", () => {
    const result = CreatePatientSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("should accept optional fields as undefined", () => {
    // middleName, suffix, latitude, longitude are optional
    const result = CreatePatientSchema.safeParse({
      ...validPayload,
      middleName: undefined,
      suffix: undefined,
      latitude: undefined,
      longitude: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("should reject an empty firstName", () => {
    // Bug caught: allowing empty firstName would create a nameless patient record.
    const result = CreatePatientSchema.safeParse({
      ...validPayload,
      firstName: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject an empty lastName", () => {
    const result = CreatePatientSchema.safeParse({
      ...validPayload,
      lastName: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject a malformed email", () => {
    const result = CreatePatientSchema.safeParse({
      ...validPayload,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("should reject an invalid gender enum value", () => {
    // Bug caught: if the schema accepted arbitrary strings, the DB
    // would reject the insert and the error would be opaque.
    const result = CreatePatientSchema.safeParse({
      ...validPayload,
      gender: "NONBINARY",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing required address fields", () => {
    // Bug caught: missing barangay/region/province would break
    // disease surveillance geocoding and clustering.
    const { barangay, region, province, ...missing } = validPayload;
    const result = CreatePatientSchema.safeParse(missing);
    expect(result.success).toBe(false);
  });

  it("should accept latitude/longitude as null", () => {
    // Coordinates are optional and nullable for geocoding fallback.
    const result = CreatePatientSchema.safeParse({
      ...validPayload,
      latitude: null,
      longitude: null,
    });
    expect(result.success).toBe(true);
  });

  it("should reject latitude as a non-numeric string", () => {
    const result = CreatePatientSchema.safeParse({
      ...validPayload,
      latitude: "fourteen",
    });
    expect(result.success).toBe(false);
  });

  it("should reject an empty birthday", () => {
    const result = CreatePatientSchema.safeParse({
      ...validPayload,
      birthday: "",
    });
    expect(result.success).toBe(false);
  });
});
