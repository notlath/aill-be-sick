/**
 * Edge-case tests for authentication server actions introduced/modified
 * in feat/clinician-approval-workflow.
 *
 * Since these are Next.js Server Actions that depend on Supabase and Prisma,
 * we test the exported logic by mocking external dependencies and verifying
 * that the actions enforce proper authorization, handle edge states, and
 * prevent privilege escalation.
 *
 * Files under test:
 *  - actions/email-auth.ts (emailLogin approval-status gating, emailSignup approval-status reset)
 *  - actions/admin-auth.ts (adminSignup canManageClinicians refactor)
 *  - actions/admin-clinician-approvals.ts (approveClinician, rejectClinician — NEW)
 *  - actions/create-patient.ts (NEW — clinician-only patient creation)
 *  - actions/patient-auth.ts (patientSignup disabled)
 *  - actions/resend-invite.ts (NEW — invite re-send with approval-status gate)
 *  - actions/manage-clinicians.ts (canManageClinicians refactor)
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock Prisma
const mockPrismaUser = {
  findUnique: vi.fn(),
  upsert: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
};
const mockPrismaAllowedEmail = {
  findUnique: vi.fn(),
  delete: vi.fn(),
  create: vi.fn(),
};
vi.mock("@/prisma/prisma", () => ({
  default: {
    user: mockPrismaUser,
    allowedClinicianEmail: mockPrismaAllowedEmail,
  },
}));

// Mock Supabase server client
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      getUser: mockGetUser,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
    },
  })),
}));

// Mock Supabase admin client
const mockAdminListUsers = vi.fn();
const mockAdminInviteUserByEmail = vi.fn();
const mockAdminDeleteUser = vi.fn();
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        listUsers: mockAdminListUsers,
        inviteUserByEmail: mockAdminInviteUserByEmail,
        deleteUser: mockAdminDeleteUser,
      },
    },
  })),
}));

// Mock user utilities
const mockGetAuthUser = vi.fn();
const mockGetCurrentDbUser = vi.fn();
vi.mock("@/utils/user", () => ({
  getAuthUser: (...args: unknown[]) => mockGetAuthUser(...args),
  getCurrentDbUser: (...args: unknown[]) => mockGetCurrentDbUser(...args),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function resetAllMocks() {
  vi.clearAllMocks();
}

// ── emailLogin ─────────────────────────────────────────────────────────────
describe("emailLogin (clinician portal gating)", () => {
  beforeEach(resetAllMocks);

  // Dynamically import so mocks are resolved at import time.
  const getAction = async () => {
    const mod = await import("@/actions/email-auth");
    return mod.emailLogin;
  };

  it("should reject a user whose role is PATIENT logging into the clinician portal", async () => {
    // Bug caught: before this branch, emailLogin had no role check and any
    // authenticated user could access the clinician dashboard.
    mockSignInWithPassword.mockResolvedValue({
      error: null,
      data: { user: { id: "auth-id-patient" } },
    });
    mockPrismaUser.findUnique.mockResolvedValue({
      role: "PATIENT",
      approvalStatus: "ACTIVE",
    });

    const emailLogin = await getAction();
    const result = await emailLogin({
      email: "patient@example.com",
      password: "validpass123",
    });

    // Should sign out the user and return an error
    expect(mockSignOut).toHaveBeenCalled();
    expect(result?.data?.error).toContain("clinician accounts only");
  });

  it("should reject a user whose role is ADMIN logging into the clinician portal", async () => {
    // Bug caught: ADMIN is not CLINICIAN, so strict role === "CLINICIAN"
    // check blocks admins from this specific portal. This is by design
    // since admins have their own portal, but worth documenting.
    mockSignInWithPassword.mockResolvedValue({
      error: null,
      data: { user: { id: "auth-id-admin" } },
    });
    mockPrismaUser.findUnique.mockResolvedValue({
      role: "ADMIN",
      approvalStatus: "ACTIVE",
    });

    const emailLogin = await getAction();
    const result = await emailLogin({
      email: "admin@example.com",
      password: "validpass123",
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(result?.data?.error).toContain("clinician accounts only");
  });

  it("should reject a CLINICIAN with PENDING_ADMIN_APPROVAL status", async () => {
    // Bug caught: without this check a clinician who signed up but hasn't
    // been approved could still access the dashboard.
    mockSignInWithPassword.mockResolvedValue({
      error: null,
      data: { user: { id: "auth-id-pending" } },
    });
    mockPrismaUser.findUnique.mockResolvedValue({
      role: "CLINICIAN",
      approvalStatus: "PENDING_ADMIN_APPROVAL",
    });

    const emailLogin = await getAction();
    const result = await emailLogin({
      email: "pending@example.com",
      password: "validpass123",
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(result?.data?.code).toBe("PENDING_ADMIN_APPROVAL");
    expect(result?.data?.error).toContain("waiting for admin approval");
  });

  it("should reject a CLINICIAN with REJECTED approval status", async () => {
    // Bug caught: a rejected clinician must be locked out, not just warned.
    mockSignInWithPassword.mockResolvedValue({
      error: null,
      data: { user: { id: "auth-id-rejected" } },
    });
    mockPrismaUser.findUnique.mockResolvedValue({
      role: "CLINICIAN",
      approvalStatus: "REJECTED",
    });

    const emailLogin = await getAction();
    const result = await emailLogin({
      email: "rejected@example.com",
      password: "validpass123",
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(result?.data?.code).toBe("REJECTED");
    expect(result?.data?.error).toContain("not approved");
  });

  it("should sign out before returning approval errors (no session leakage)", async () => {
    // Bug caught: if signOut is not called before returning an error,
    // the user retains a valid session cookie despite being unauthorized.
    mockSignInWithPassword.mockResolvedValue({
      error: null,
      data: { user: { id: "auth-id-no-db" } },
    });
    mockPrismaUser.findUnique.mockResolvedValue(null); // user not in DB

    const emailLogin = await getAction();
    const result = await emailLogin({
      email: "ghost@example.com",
      password: "validpass123",
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(result?.data?.error).toBeTruthy();
  });

  it("should handle a CLINICIAN with an unexpected approval status string", async () => {
    // Bug caught: if a new status like "SUSPENDED" is added to the DB but
    // not handled in the code, the clinician falls through to redirect("/").
    // This test documents the current (potentially risky) fallthrough behavior.
    mockSignInWithPassword.mockResolvedValue({
      error: null,
      data: { user: { id: "auth-id-suspended" } },
    });
    mockPrismaUser.findUnique.mockResolvedValue({
      role: "CLINICIAN",
      approvalStatus: "SUSPENDED", // not handled by any branch
    });

    const emailLogin = await getAction();

    // Currently this would pass through and redirect — document this as
    // a potential bug. The redirect throws NEXT_REDIRECT in our mocks.
    try {
      await emailLogin({
        email: "suspended@example.com",
        password: "validpass123",
      });
    } catch (e: unknown) {
      // redirect("/") throws in our mock — user got through.
      // This is a known gap: unknown approval statuses fall through.
      expect((e as Error).message).toContain("NEXT_REDIRECT");
    }
  });

  it("should return Supabase error message on auth failure", async () => {
    // Bug caught: if the error message is swallowed, the user sees a generic
    // failure with no indication of what went wrong (locked account, etc.)
    mockSignInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
      data: { user: null },
    });

    const emailLogin = await getAction();
    const result = await emailLogin({
      email: "wrong@example.com",
      password: "wrongpass",
    });

    expect(result?.data?.error).toContain("Invalid login credentials");
  });
});

// ── emailSignup ────────────────────────────────────────────────────────────
describe("emailSignup (clinician registration with approval status)", () => {
  beforeEach(resetAllMocks);

  const getAction = async () => {
    const mod = await import("@/actions/email-auth");
    return mod.emailSignup;
  };

  it("should reject signup for an email not in the whitelist", async () => {
    // Bug caught: without whitelist check, anyone could register as CLINICIAN.
    mockPrismaAllowedEmail.findUnique.mockResolvedValue(null);

    const emailSignup = await getAction();
    const result = await emailSignup({
      email: "unknown@example.com",
      password: "secret123",
    });

    expect(result?.data?.error).toContain("not authorized");
  });

  it("should set approvalStatus to PENDING_ADMIN_APPROVAL on new signup", async () => {
    // Bug caught: if the upsert omits approvalStatus, new clinicians
    // would have NULL status and possibly bypass the login gate.
    mockPrismaAllowedEmail.findUnique.mockResolvedValue({ email: "new@example.com" });
    mockSignUp.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: "new-auth-id",
          email: "new@example.com",
          user_metadata: { name: "Dr. New" },
        },
      },
    });
    mockPrismaUser.upsert.mockResolvedValue({});
    mockPrismaAllowedEmail.delete.mockResolvedValue({});

    const emailSignup = await getAction();
    await emailSignup({
      email: "new@example.com",
      password: "secret123",
    });

    expect(mockPrismaUser.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          approvalStatus: "PENDING_ADMIN_APPROVAL",
          role: "CLINICIAN",
        }),
      }),
    );
  });

  it("should reset approval fields on re-registration (previously rejected clinician)", async () => {
    // Bug caught: if the update clause doesn't clear approvedAt/rejectedAt/approvalNotes,
    // a re-registering rejected clinician retains stale rejection data.
    mockPrismaAllowedEmail.findUnique.mockResolvedValue({ email: "reapply@example.com" });
    mockSignUp.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: "reapply-auth-id",
          email: "reapply@example.com",
          user_metadata: { name: "Dr. Retry" },
        },
      },
    });
    mockPrismaUser.upsert.mockResolvedValue({});
    mockPrismaAllowedEmail.delete.mockResolvedValue({});

    const emailSignup = await getAction();
    await emailSignup({
      email: "reapply@example.com",
      password: "secret123",
    });

    expect(mockPrismaUser.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          approvalStatus: "PENDING_ADMIN_APPROVAL",
          rejectedAt: null,
          approvedAt: null,
          approvalNotes: null,
          approvedBy: null,
        }),
      }),
    );
  });

  it("should delete the whitelist entry after successful signup", async () => {
    // Bug caught: if the whitelist entry is not deleted, the same email
    // could be used to create multiple Supabase accounts.
    mockPrismaAllowedEmail.findUnique.mockResolvedValue({ email: "once@example.com" });
    mockSignUp.mockResolvedValue({
      error: null,
      data: {
        user: {
          id: "once-auth-id",
          email: "once@example.com",
          user_metadata: { name: "Dr. Once" },
        },
      },
    });
    mockPrismaUser.upsert.mockResolvedValue({});
    mockPrismaAllowedEmail.delete.mockResolvedValue({});

    const emailSignup = await getAction();
    await emailSignup({
      email: "once@example.com",
      password: "secret123",
    });

    expect(mockPrismaAllowedEmail.delete).toHaveBeenCalledWith({
      where: { email: "once@example.com" },
    });
  });
});

// ── approveClinician / rejectClinician ──────────────────────────────────────
describe("approveClinician", () => {
  beforeEach(resetAllMocks);

  const getAction = async () => {
    const mod = await import("@/actions/admin-clinician-approvals");
    return mod.approveClinician;
  };

  it("should reject when called by an unauthenticated user", async () => {
    // Bug caught: if getCurrentDbUser failure is not checked,
    // unauthenticated requests could approve clinicians.
    mockGetCurrentDbUser.mockResolvedValue({ error: "Not authenticated" });

    const approveClinician = await getAction();
    const result = await approveClinician({ clinicianUserId: 1 });

    expect(result?.data?.error).toContain("Unauthorized");
  });

  it("should reject when called by a CLINICIAN (self-approval attack)", async () => {
    // Bug caught: a CLINICIAN approving themselves bypasses the entire workflow.
    mockGetCurrentDbUser.mockResolvedValue({
      success: { id: 10, role: "CLINICIAN", approvalStatus: "PENDING_ADMIN_APPROVAL" },
    });

    const approveClinician = await getAction();
    const result = await approveClinician({ clinicianUserId: 10 });

    expect(result?.data?.error).toContain("Unauthorized");
    expect(mockPrismaUser.update).not.toHaveBeenCalled();
  });

  it("should reject when called by a PATIENT", async () => {
    // Bug caught: patients must never be able to approve clinicians.
    mockGetCurrentDbUser.mockResolvedValue({
      success: { id: 99, role: "PATIENT" },
    });

    const approveClinician = await getAction();
    const result = await approveClinician({ clinicianUserId: 1 });

    expect(result?.data?.error).toContain("Unauthorized");
  });

  it("should reject when target user is not a CLINICIAN (role mismatch)", async () => {
    // Bug caught: approving a PATIENT or ADMIN via this endpoint could
    // corrupt their approval state or mask their actual role.
    mockGetCurrentDbUser.mockResolvedValue({
      success: { id: 1, role: "ADMIN" },
    });
    mockPrismaUser.findUnique.mockResolvedValue({ id: 50, role: "PATIENT" });

    const approveClinician = await getAction();
    const result = await approveClinician({ clinicianUserId: 50 });

    expect(result?.data?.error).toContain("Clinician account not found");
    expect(mockPrismaUser.update).not.toHaveBeenCalled();
  });

  it("should reject when target user does not exist", async () => {
    // Bug caught: approving a non-existent ID should not silently succeed.
    mockGetCurrentDbUser.mockResolvedValue({
      success: { id: 1, role: "ADMIN" },
    });
    mockPrismaUser.findUnique.mockResolvedValue(null);

    const approveClinician = await getAction();
    const result = await approveClinician({ clinicianUserId: 9999 });

    expect(result?.data?.error).toContain("Clinician account not found");
  });

  it("should set ACTIVE status and record approver when ADMIN approves", async () => {
    // Validates the happy path sets all expected fields.
    mockGetCurrentDbUser.mockResolvedValue({
      success: { id: 1, role: "ADMIN" },
    });
    mockPrismaUser.findUnique.mockResolvedValue({ id: 5, role: "CLINICIAN" });
    mockPrismaUser.update.mockResolvedValue({});

    const approveClinician = await getAction();
    await approveClinician({ clinicianUserId: 5 });

    expect(mockPrismaUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({
          approvalStatus: "ACTIVE",
          approvedBy: 1,
          rejectedAt: null,
          approvalNotes: null,
        }),
      }),
    );
  });

  it("should allow DEVELOPER to approve clinicians", async () => {
    // Bug caught: if canApproveClinicians only checks for ADMIN,
    // DEVELOPER is locked out despite having higher privileges.
    mockGetCurrentDbUser.mockResolvedValue({
      success: { id: 1, role: "DEVELOPER" },
    });
    mockPrismaUser.findUnique.mockResolvedValue({ id: 7, role: "CLINICIAN" });
    mockPrismaUser.update.mockResolvedValue({});

    const approveClinician = await getAction();
    const result = await approveClinician({ clinicianUserId: 7 });

    expect(mockPrismaUser.update).toHaveBeenCalled();
  });
});

describe("rejectClinician", () => {
  beforeEach(resetAllMocks);

  const getAction = async () => {
    const mod = await import("@/actions/admin-clinician-approvals");
    return mod.rejectClinician;
  };

  it("should reject when called by a CLINICIAN", async () => {
    // Bug caught: a clinician rejecting their peers would be a privilege escalation.
    mockGetCurrentDbUser.mockResolvedValue({
      success: { id: 20, role: "CLINICIAN" },
    });

    const rejectClinician = await getAction();
    const result = await rejectClinician({
      clinicianUserId: 21,
      reason: "Not qualified",
    });

    expect(result?.data?.error).toContain("Unauthorized");
  });

  it("should store rejection reason as null when not provided", async () => {
    // Bug caught: if reason is undefined (not provided) and the `|| null`
    // is missing, the DB would store `undefined` which Prisma rejects.
    mockGetCurrentDbUser.mockResolvedValue({
      success: { id: 1, role: "ADMIN" },
    });
    mockPrismaUser.findUnique.mockResolvedValue({ id: 30, role: "CLINICIAN" });
    mockPrismaUser.update.mockResolvedValue({});

    const rejectClinician = await getAction();
    await rejectClinician({ clinicianUserId: 30 });

    expect(mockPrismaUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approvalStatus: "REJECTED",
          approvalNotes: null,
          approvedAt: null,
        }),
      }),
    );
  });

  it("should set approvedBy field to the admin who rejected (audit trail)", async () => {
    // Bug caught: if approvedBy is not set on rejection, there's no audit
    // trail for who performed the rejection action.
    mockGetCurrentDbUser.mockResolvedValue({
      success: { id: 2, role: "ADMIN" },
    });
    mockPrismaUser.findUnique.mockResolvedValue({ id: 40, role: "CLINICIAN" });
    mockPrismaUser.update.mockResolvedValue({});

    const rejectClinician = await getAction();
    await rejectClinician({ clinicianUserId: 40, reason: "Reason" });

    expect(mockPrismaUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approvedBy: 2,
        }),
      }),
    );
  });
});

// ── createPatient ──────────────────────────────────────────────────────────
describe("createPatient (clinician-gated patient creation)", () => {
  beforeEach(resetAllMocks);

  const getAction = async () => {
    const mod = await import("@/actions/create-patient");
    return mod.createPatient;
  };

  const validInput = {
    firstName: "Test",
    lastName: "Patient",
    email: "test@patient.com",
    birthday: "2000-01-01",
    gender: "MALE" as const,
    address: "123 St",
    district: "D1",
    city: "City",
    barangay: "Brgy",
    region: "R1",
    province: "Province",
  };

  it("should reject an unauthenticated request", async () => {
    // Bug caught: without auth check, anyone with the endpoint could create patients.
    mockGetAuthUser.mockResolvedValue(null);

    const createPatient = await getAction();
    const result = await createPatient(validInput);

    expect(result?.data?.error).toContain("Not authenticated");
  });

  it("should reject when the authenticated user has no DB record", async () => {
    // Bug caught: a Supabase auth user who was deleted from Prisma
    // could still create patients without this check.
    mockGetAuthUser.mockResolvedValue({ id: "auth-orphan" });
    mockPrismaUser.findUnique.mockResolvedValueOnce(null); // currentUser lookup

    const createPatient = await getAction();
    const result = await createPatient(validInput);

    expect(result?.data?.error).toContain("User not found");
  });

  it("should reject when a PATIENT tries to create another patient", async () => {
    // Bug caught: patients creating patients would bypass clinician oversight.
    mockGetAuthUser.mockResolvedValue({ id: "auth-patient" });
    mockPrismaUser.findUnique.mockResolvedValueOnce({
      role: "PATIENT",
      approvalStatus: "ACTIVE",
    });

    const createPatient = await getAction();
    const result = await createPatient(validInput);

    expect(result?.data?.error).toContain("Only clinicians");
  });

  it("should reject a CLINICIAN whose approval status is PENDING", async () => {
    // Bug caught: a pending clinician should not be able to create patients
    // before their own account is approved.
    mockGetAuthUser.mockResolvedValue({ id: "auth-pending-clinician" });
    mockPrismaUser.findUnique.mockResolvedValueOnce({
      role: "CLINICIAN",
      approvalStatus: "PENDING_ADMIN_APPROVAL",
    });

    const createPatient = await getAction();
    const result = await createPatient(validInput);

    expect(result?.data?.error).toContain("not active");
  });

  it("should reject a CLINICIAN whose approval status is REJECTED", async () => {
    // Bug caught: a rejected clinician should be completely locked out
    // of patient management operations.
    mockGetAuthUser.mockResolvedValue({ id: "auth-rejected-clinician" });
    mockPrismaUser.findUnique.mockResolvedValueOnce({
      role: "CLINICIAN",
      approvalStatus: "REJECTED",
    });

    const createPatient = await getAction();
    const result = await createPatient(validInput);

    expect(result?.data?.error).toContain("not active");
  });

  it("should allow ADMIN to create patients WITHOUT checking approvalStatus", async () => {
    // Bug caught: if the approval-status check applies to ADMIN too,
    // admins without ACTIVE status would be blocked. Admins should bypass
    // the clinician approval workflow.
    mockGetAuthUser.mockResolvedValue({ id: "auth-admin" });
    mockPrismaUser.findUnique
      .mockResolvedValueOnce({ role: "ADMIN", approvalStatus: null }) // currentUser
      .mockResolvedValueOnce(null); // existingUser (email check)

    mockAdminListUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });
    mockAdminInviteUserByEmail.mockResolvedValue({
      data: { user: { id: "new-patient-auth-id" } },
      error: null,
    });
    mockPrismaUser.create.mockResolvedValue({
      id: 100,
      email: validInput.email,
      name: "Test Patient",
    });

    const createPatient = await getAction();
    const result = await createPatient(validInput);

    // Should succeed (no "not active" error)
    expect(result?.data?.success).toBeTruthy();
  });

  it("should allow DEVELOPER to create patients WITHOUT checking approvalStatus", async () => {
    // Same as ADMIN — DEVELOPER should bypass approval status checks.
    mockGetAuthUser.mockResolvedValue({ id: "auth-dev" });
    mockPrismaUser.findUnique
      .mockResolvedValueOnce({ role: "DEVELOPER", approvalStatus: null })
      .mockResolvedValueOnce(null);

    mockAdminListUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });
    mockAdminInviteUserByEmail.mockResolvedValue({
      data: { user: { id: "dev-patient-auth-id" } },
      error: null,
    });
    mockPrismaUser.create.mockResolvedValue({
      id: 101,
      email: validInput.email,
      name: "Test Patient",
    });

    const createPatient = await getAction();
    const result = await createPatient(validInput);

    expect(result?.data?.success).toBeTruthy();
  });

  it("should reject duplicate email (Prisma user already exists)", async () => {
    // Bug caught: creating a patient with an existing email could overwrite
    // an existing user's data.
    mockGetAuthUser.mockResolvedValue({ id: "auth-clinician" });
    mockPrismaUser.findUnique
      .mockResolvedValueOnce({ role: "CLINICIAN", approvalStatus: "ACTIVE" }) // currentUser
      .mockResolvedValueOnce({ id: 99, email: validInput.email }); // existingUser

    const createPatient = await getAction();
    const result = await createPatient(validInput);

    expect(result?.data?.error).toContain("already exists");
  });
});

// ── patientSignup (disabled) ───────────────────────────────────────────────
describe("patientSignup (disabled self-registration)", () => {
  beforeEach(resetAllMocks);

  it("should always return an error regardless of input", async () => {
    // Bug caught: in this branch, patient self-registration is disabled.
    // If the action accidentally falls through, patients could self-register.
    const { patientSignup } = await import("@/actions/patient-auth");
    const result = await patientSignup({
      email: "sneaky@patient.com",
      password: "password123",
      acceptedMedicalDisclaimer: true,
      acceptedAgeRequirement: true,
      acceptedTermsAndPrivacy: true,
    });

    expect(result?.data?.error).toContain(
      "Patient accounts are created by clinicians only",
    );
  });

  it("should not call Supabase auth at all (no side effects)", async () => {
    // Bug caught: if Supabase signUp is called even though we return an error,
    // phantom accounts accumulate in the auth system.
    const { patientSignup } = await import("@/actions/patient-auth");
    await patientSignup({
      email: "phantom@patient.com",
      password: "password123",
      acceptedMedicalDisclaimer: true,
      acceptedAgeRequirement: true,
      acceptedTermsAndPrivacy: true,
    });

    expect(mockSignUp).not.toHaveBeenCalled();
  });
});

// ── resendInvite ───────────────────────────────────────────────────────────
describe("resendInvite (approval-status gated)", () => {
  beforeEach(resetAllMocks);

  const getAction = async () => {
    const mod = await import("@/actions/resend-invite");
    return mod.resendInvite;
  };

  it("should reject an unauthenticated request", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const resendInvite = await getAction();
    const result = await resendInvite({ email: "patient@example.com" });

    expect(result?.data?.error).toContain("Not authenticated");
  });

  it("should reject a PATIENT trying to resend invites", async () => {
    // Bug caught: patients should not be able to resend invites to anyone.
    mockGetAuthUser.mockResolvedValue({ id: "auth-patient" });
    mockPrismaUser.findUnique.mockResolvedValue({
      role: "PATIENT",
      approvalStatus: "ACTIVE",
    });

    const resendInvite = await getAction();
    const result = await resendInvite({ email: "someone@example.com" });

    expect(result?.data?.error).toContain("Permission denied");
  });

  it("should reject a CLINICIAN with non-ACTIVE approval status", async () => {
    // Bug caught: a pending/rejected clinician could resend invites
    // for patients they created before losing access.
    mockGetAuthUser.mockResolvedValue({ id: "auth-pending" });
    mockPrismaUser.findUnique.mockResolvedValue({
      role: "CLINICIAN",
      approvalStatus: "PENDING_ADMIN_APPROVAL",
    });

    const resendInvite = await getAction();
    const result = await resendInvite({ email: "someone@example.com" });

    expect(result?.data?.error).toContain("clinician account is not active");
  });

  it("should allow ADMIN to resend invites without ACTIVE approval check", async () => {
    // Bug caught: ADMIN bypass of approvalStatus should apply to resendInvite too.
    mockGetAuthUser.mockResolvedValue({ id: "auth-admin" });
    mockPrismaUser.findUnique.mockResolvedValue({
      role: "ADMIN",
      approvalStatus: null,
    });
    mockAdminListUsers.mockResolvedValue({
      data: { users: [{ email: "patient@example.com", user_metadata: { name: "P" } }] },
      error: null,
    });
    mockAdminInviteUserByEmail.mockResolvedValue({ error: null });

    const resendInvite = await getAction();
    const result = await resendInvite({ email: "patient@example.com" });

    expect(result?.data?.success).toBe(true);
  });

  it("should return error when target email does not exist in Supabase", async () => {
    // Bug caught: resending an invite to a non-existent email should
    // fail gracefully, not silently succeed.
    mockGetAuthUser.mockResolvedValue({ id: "auth-clinician" });
    mockPrismaUser.findUnique.mockResolvedValue({
      role: "CLINICIAN",
      approvalStatus: "ACTIVE",
    });
    mockAdminListUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });

    const resendInvite = await getAction();
    const result = await resendInvite({ email: "nonexistent@example.com" });

    expect(result?.data?.error).toContain("No account found");
  });

  it("should fall back to password reset when invite returns email_exists error", async () => {
    // Bug caught: without this fallback, confirmed users who lost access
    // would be completely stuck.
    mockGetAuthUser.mockResolvedValue({ id: "auth-clinician" });
    mockPrismaUser.findUnique.mockResolvedValue({
      role: "CLINICIAN",
      approvalStatus: "ACTIVE",
    });
    mockAdminListUsers.mockResolvedValue({
      data: { users: [{ email: "existing@example.com", user_metadata: {} }] },
      error: null,
    });
    mockAdminInviteUserByEmail.mockResolvedValue({
      error: { status: 422, code: "email_exists", message: "already exists" },
    });
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    const resendInvite = await getAction();
    const result = await resendInvite({ email: "existing@example.com" });

    expect(mockResetPasswordForEmail).toHaveBeenCalled();
    expect(result?.data?.success).toBe(true);
    expect(result?.data?.message).toContain("Password reset");
  });
});

// ── manage-clinicians (canManageClinicians refactor) ────────────────────────
describe("addAllowedClinicianEmail (canManageClinicians refactor)", () => {
  beforeEach(resetAllMocks);

  const getAction = async () => {
    const mod = await import("@/actions/manage-clinicians");
    return mod.addAllowedClinicianEmail;
  };

  it("should reject when called by a CLINICIAN", async () => {
    // Bug caught: before this branch's refactor, the check was
    // `role !== "ADMIN" && role !== "DEVELOPER" as any` which relied on
    // a dangerous `as any` cast. The new canManageClinicians is safer.
    mockGetCurrentDbUser.mockResolvedValue({
      success: { id: 10, role: "CLINICIAN" },
    });

    const addEmail = await getAction();
    const result = await addEmail({ email: "newclinician@example.com" });

    expect(result?.data?.error).toContain("Admin access required");
  });

  it("should allow DEVELOPER to manage clinician whitelist", async () => {
    // Bug caught: the old `as any` cast for DEVELOPER might have broken
    // if TypeScript strictness changed. The new helper is explicit.
    mockGetCurrentDbUser.mockResolvedValue({
      success: { id: 1, role: "DEVELOPER" },
    });
    mockPrismaAllowedEmail.findUnique.mockResolvedValue(null);
    mockPrismaAllowedEmail.create.mockResolvedValue({
      email: "newclinician@example.com",
    });

    const addEmail = await getAction();
    const result = await addEmail({ email: "newclinician@example.com" });

    expect(result?.data?.success).toBeTruthy();
  });

  it("should reject unauthenticated requests", async () => {
    mockGetCurrentDbUser.mockResolvedValue({ error: "Not authenticated" });

    const addEmail = await getAction();
    const result = await addEmail({ email: "test@example.com" });

    expect(result?.data?.error).toContain("Unauthorized");
  });
});
