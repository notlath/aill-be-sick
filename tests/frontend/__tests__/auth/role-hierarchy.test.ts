/**
 * Edge-case tests for `utils/role-hierarchy.ts`
 *
 * This module was newly introduced in feat/clinician-approval-workflow.
 * Tests target:
 *  - Privilege escalation via unknown / fabricated role strings
 *  - Boundary between adjacent hierarchy levels
 *  - Empty, null, undefined, and exotic string inputs
 *  - Consistency between helper functions and the underlying hierarchy
 */

import { describe, it, expect } from "vitest";
import {
  hasRolePrivilege,
  isRoleAllowed,
  isAdminLike,
  canCreatePatient,
  canOverrideDiagnosis,
  canManageClinicians,
  canApproveClinicians,
  type AppRole,
} from "@/utils/role-hierarchy";

// ---------------------------------------------------------------------------
// hasRolePrivilege — core hierarchy check
// ---------------------------------------------------------------------------
describe("hasRolePrivilege", () => {
  it("should grant DEVELOPER access to every role level", () => {
    // Bug caught: if the hierarchy map accidentally used string comparison
    // instead of numeric, DEVELOPER (3) might not be >= ADMIN (2).
    const roles: AppRole[] = ["PATIENT", "CLINICIAN", "ADMIN", "DEVELOPER"];
    for (const required of roles) {
      expect(hasRolePrivilege("DEVELOPER", required)).toBe(true);
    }
  });

  it("should deny PATIENT access to CLINICIAN-level actions", () => {
    // Bug caught: if hierarchy values were inverted (PATIENT: 3, DEVELOPER: 0),
    // patients would get full access.
    expect(hasRolePrivilege("PATIENT", "CLINICIAN")).toBe(false);
  });

  it("should deny CLINICIAN access to ADMIN-level actions", () => {
    // Bug caught: if CLINICIAN and ADMIN shared the same numeric level,
    // clinicians could approve other clinicians.
    expect(hasRolePrivilege("CLINICIAN", "ADMIN")).toBe(false);
  });

  it("should allow same-level access (ADMIN requires ADMIN)", () => {
    // Edge case: exact equality at boundary
    expect(hasRolePrivilege("ADMIN", "ADMIN")).toBe(true);
  });

  it("should return false for an unknown userRole string (privilege escalation via typo)", () => {
    // Bug caught: if an attacker or a data corruption produces a role like
    // "SUPER_ADMIN", the cast `as AppRole` would silently succeed and the
    // lookup would return `undefined`. The function must deny access.
    expect(hasRolePrivilege("SUPER_ADMIN", "PATIENT")).toBe(false);
  });

  it("should return false for an empty string userRole", () => {
    // Bug caught: empty string is a valid `string` but an invalid AppRole;
    // if the undefined-check is missing, `0 >= 0` would pass.
    expect(hasRolePrivilege("", "PATIENT")).toBe(false);
  });

  it("should return false for a numeric-string role that could collide with hierarchy values", () => {
    // Bug caught: if the hierarchy accidentally used array indexing, "3"
    // would map to DEVELOPER's level.
    expect(hasRolePrivilege("3", "DEVELOPER")).toBe(false);
  });

  it("should return false for a lowercase variant of a valid role", () => {
    // Bug caught: case-insensitive comparison would let `admin` pass as ADMIN.
    expect(hasRolePrivilege("admin", "PATIENT")).toBe(false);
    expect(hasRolePrivilege("developer", "PATIENT")).toBe(false);
  });

  it("should return false when requiredRole is an unknown string cast at runtime", () => {
    // Bug caught: `requiredLevel` would be `undefined`, so `userLevel >= undefined`
    // evaluates to `false` — but only if the explicit check exists.
    expect(hasRolePrivilege("ADMIN", "SUPERUSER" as AppRole)).toBe(false);
  });

  it("should handle null/undefined coerced to string at runtime", () => {
    // Bug caught: JavaScript `undefined` or `null` toString can produce
    // "undefined" / "null" — ensure they do not grant access.
    expect(hasRolePrivilege(undefined as unknown as string, "PATIENT")).toBe(false);
    expect(hasRolePrivilege(null as unknown as string, "PATIENT")).toBe(false);
  });

  it("should handle special characters and injection-like role strings", () => {
    // Bug caught: protects against NoSQL/SQL injection-style strings
    // making it through if the role were used in a DB query after this check.
    expect(hasRolePrivilege("ADMIN' OR '1'='1", "PATIENT")).toBe(false);
    expect(hasRolePrivilege("__proto__", "PATIENT")).toBe(false);
    expect(hasRolePrivilege("constructor", "PATIENT")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isRoleAllowed — explicit allowlist check
// ---------------------------------------------------------------------------
describe("isRoleAllowed", () => {
  it("should return true when userRole is in the allowed list", () => {
    expect(isRoleAllowed("CLINICIAN", ["CLINICIAN", "ADMIN", "DEVELOPER"])).toBe(true);
  });

  it("should return false when userRole is not in the allowed list", () => {
    expect(isRoleAllowed("PATIENT", ["CLINICIAN", "ADMIN"])).toBe(false);
  });

  it("should return false for an empty allowed roles array", () => {
    // Bug caught: if the function defaulted to `true` on empty array,
    // any role would pass.
    expect(isRoleAllowed("DEVELOPER", [])).toBe(false);
  });

  it("should return false for a fabricated role even if cast succeeds", () => {
    // Bug caught: the `as AppRole` cast allows any string in at runtime.
    expect(isRoleAllowed("ROOT", ["ADMIN", "DEVELOPER"])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isAdminLike — ADMIN | DEVELOPER gate
// ---------------------------------------------------------------------------
describe("isAdminLike", () => {
  it("should return true only for ADMIN and DEVELOPER", () => {
    expect(isAdminLike("ADMIN")).toBe(true);
    expect(isAdminLike("DEVELOPER")).toBe(true);
  });

  it("should return false for CLINICIAN", () => {
    // Bug caught: if `isAdminLike` accidentally included CLINICIAN,
    // clinicians could approve themselves.
    expect(isAdminLike("CLINICIAN")).toBe(false);
  });

  it("should return false for PATIENT", () => {
    expect(isAdminLike("PATIENT")).toBe(false);
  });

  it("should return false for empty / unknown strings", () => {
    expect(isAdminLike("")).toBe(false);
    expect(isAdminLike("admin")).toBe(false); // case-sensitive
    expect(isAdminLike("MODERATOR")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canCreatePatient — CLINICIAN+ privilege
// ---------------------------------------------------------------------------
describe("canCreatePatient", () => {
  it("should return true for CLINICIAN, ADMIN, and DEVELOPER", () => {
    // Verifies role hierarchy inheritance for patient creation.
    expect(canCreatePatient("CLINICIAN")).toBe(true);
    expect(canCreatePatient("ADMIN")).toBe(true);
    expect(canCreatePatient("DEVELOPER")).toBe(true);
  });

  it("should return false for PATIENT", () => {
    // Bug caught: patients must not be able to create other patient accounts.
    expect(canCreatePatient("PATIENT")).toBe(false);
  });

  it("should return false for fabricated role strings", () => {
    expect(canCreatePatient("INTERN")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canOverrideDiagnosis — CLINICIAN+ privilege
// ---------------------------------------------------------------------------
describe("canOverrideDiagnosis", () => {
  it("should return true for CLINICIAN, ADMIN, and DEVELOPER", () => {
    expect(canOverrideDiagnosis("CLINICIAN")).toBe(true);
    expect(canOverrideDiagnosis("ADMIN")).toBe(true);
    expect(canOverrideDiagnosis("DEVELOPER")).toBe(true);
  });

  it("should return false for PATIENT", () => {
    // Bug caught: a patient overriding their own diagnosis would bypass clinical review.
    expect(canOverrideDiagnosis("PATIENT")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canManageClinicians — ADMIN+ only
// ---------------------------------------------------------------------------
describe("canManageClinicians", () => {
  it("should return true only for ADMIN and DEVELOPER", () => {
    expect(canManageClinicians("ADMIN")).toBe(true);
    expect(canManageClinicians("DEVELOPER")).toBe(true);
  });

  it("should return false for CLINICIAN (no self-management)", () => {
    // Bug caught: if `canManageClinicians` used `hasRolePrivilege("CLINICIAN")`,
    // clinicians could manage the clinician whitelist themselves.
    expect(canManageClinicians("CLINICIAN")).toBe(false);
  });

  it("should return false for PATIENT", () => {
    expect(canManageClinicians("PATIENT")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canApproveClinicians — ADMIN+ only (approve/reject workflow)
// ---------------------------------------------------------------------------
describe("canApproveClinicians", () => {
  it("should return true only for ADMIN and DEVELOPER", () => {
    expect(canApproveClinicians("ADMIN")).toBe(true);
    expect(canApproveClinicians("DEVELOPER")).toBe(true);
  });

  it("should return false for CLINICIAN (prevents self-approval)", () => {
    // Bug caught: if a pending clinician could approve themselves,
    // the entire approval workflow is bypassable.
    expect(canApproveClinicians("CLINICIAN")).toBe(false);
  });

  it("should return false for PATIENT", () => {
    expect(canApproveClinicians("PATIENT")).toBe(false);
  });

  it("should return false for empty / garbage input", () => {
    expect(canApproveClinicians("")).toBe(false);
    expect(canApproveClinicians("SUPERADMIN")).toBe(false);
  });
});
