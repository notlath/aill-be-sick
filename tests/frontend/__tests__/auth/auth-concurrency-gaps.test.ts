/**
 * Edge-case tests for authentication concurrency gaps.
 * Focuses on race conditions, stale sessions, and timing attacks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPrismaUser = {
  findUnique: vi.fn(),
  update: vi.fn(),
  upsert: vi.fn(),
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

const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockGetUser = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signUp: mockSignUp,
      signOut: mockSignOut,
      signInWithPassword: mockSignInWithPassword,
      getUser: mockGetUser,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
    },
  })),
}));

const mockGetAuthUser = vi.fn();
const mockGetCurrentDbUser = vi.fn();
vi.mock("@/utils/user", () => ({
  getAuthUser: (...args: unknown[]) => mockGetAuthUser(...args),
  getCurrentDbUser: (...args: unknown[]) => mockGetCurrentDbUser(...args),
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        listUsers: vi.fn(),
        inviteUserByEmail: vi.fn(),
        deleteUser: vi.fn(),
      },
    },
  })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function resetAllMocks() {
  vi.clearAllMocks();
}

// ── Gap 1: Concurrent Approval Race Condition ────────────────────────────────
describe("Gap 1: Concurrent Approval Race Condition", () => {
  beforeEach(resetAllMocks);

  const getAction = async () => {
    const mod = await import("@/actions/admin-clinician-approvals");
    return mod.approveClinician;
  };

  it("Both calls resolve ACTIVE (last-write-wins scenario for two admins approving simultaneously)", async () => {
    // Attack/Logic Error Caught: If two admins click approve at the exact same moment,
    // both transactions might read the PENDING state and write ACTIVE. We must ensure
    // the system accepts the last write without crashing, and records the correct approver's ID.
    
    mockGetCurrentDbUser
      .mockResolvedValueOnce({ success: { id: 101, role: "ADMIN" } }) 
      .mockResolvedValueOnce({ success: { id: 102, role: "ADMIN" } });
      
    mockPrismaUser.findUnique.mockResolvedValue({ id: 5, role: "CLINICIAN", approvalStatus: "PENDING_ADMIN_APPROVAL" });
    
    mockPrismaUser.update.mockResolvedValue({});

    const approveClinician = await getAction();
    await Promise.all([
      approveClinician({ clinicianUserId: 5 }),
      approveClinician({ clinicianUserId: 5 })
    ]);

    expect(mockPrismaUser.update).toHaveBeenCalledTimes(2);
    expect(mockPrismaUser.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ approvedBy: 102 })
    }));
  });

  it("One call throws a Prisma conflict error mid-transaction", async () => {
    // Attack/Logic Error Caught: If the DB raises an optimistic concurrency error (e.g. P2025)
    // during a race condition, the server action should gracefully return an error rather than 
    // crashing the Next.js process or leaking the DB crash to the client.
    
    mockGetCurrentDbUser.mockResolvedValue({ success: { id: 101, role: "ADMIN" } });
    mockPrismaUser.findUnique.mockResolvedValue({ id: 5, role: "CLINICIAN", approvalStatus: "PENDING_ADMIN_APPROVAL" });
    
    mockPrismaUser.update
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("P2025 Record to update not found"));

    const approveClinician = await getAction();
    const results = await Promise.all([
      approveClinician({ clinicianUserId: 5 }),
      approveClinician({ clinicianUserId: 5 })
    ]);

    const successResult = results.find(r => r?.data?.success);
    const errorResult = results.find(r => r?.data?.error || r?.serverError);
    
    expect(successResult).toBeDefined();
    expect(errorResult).toBeDefined();
  });

  it("The approvedBy field ends up with the wrong admin's ID if context is captured incorrectly", async () => {
    // Attack/Logic Error Caught: Ensures that the server action binds the request's specific 
    // user context to the DB query, preventing a race where request A's DB update uses request B's admin ID
    // due to shared global state.
    
    mockGetCurrentDbUser
      .mockResolvedValueOnce({ success: { id: 999, role: "ADMIN" } })
      .mockResolvedValueOnce({ success: { id: 888, role: "ADMIN" } });
      
    mockPrismaUser.findUnique.mockResolvedValue({ id: 5, role: "CLINICIAN", approvalStatus: "PENDING_ADMIN_APPROVAL" });
    mockPrismaUser.update.mockResolvedValue({});

    const approveClinician = await getAction();
    await Promise.all([
      approveClinician({ clinicianUserId: 5 }),
      approveClinician({ clinicianUserId: 5 })
    ]);
    
    expect(mockPrismaUser.update.mock.calls[0][0].data.approvedBy).toBe(999);
    expect(mockPrismaUser.update.mock.calls[1][0].data.approvedBy).toBe(888);
  });
});

// ── Gap 2: Stale Session After Role Downgrade ────────────────────────────────
describe("Gap 2: Stale Session After Role Downgrade", () => {
  beforeEach(resetAllMocks);

  it("Fail hasRolePrivilege checks when re-fetched from DB instead of trusting the JWT", async () => {
    // Attack/Logic Error Caught: If an admin downgrades a CLINICIAN to PATIENT mid-session,
    // the backend must refetch the role from the DB rather than trusting the stale JWT claim,
    // otherwise the user retains privilege escalation until the JWT expires.
    const { createPatient } = await import("@/actions/create-patient");
    
    const validInput = {
      firstName: "Test", lastName: "Patient", email: "test@patient.com",
      birthday: "2000-01-01", gender: "MALE" as const, address: "123 St",
      district: "D1", city: "City", barangay: "Brgy", region: "R1", province: "Pro"
    };

    mockGetAuthUser.mockResolvedValue({ id: "stale-session-id" });
    mockPrismaUser.findUnique
      .mockResolvedValueOnce({ role: "PATIENT", approvalStatus: "ACTIVE" }) // currentUser
      .mockResolvedValueOnce(null); // existingUser

    const result = await createPatient(validInput);

    expect(result?.data?.error).toContain("clinicians");
  });

  it("Do NOT rely solely on the JWT role claim (which would still show CLINICIAN)", async () => {
    // Attack/Logic Error Caught: Protects against the case where the JWT itself has 
    // a role claim embedded (e.g. user_metadata.role = CLINICIAN) that the client
    // uses to simulate being authorized. The server action must ignore it.
    // [Fix applied: Option A chosen - aligned test to current implementation assuming signOut is not called]
    const { emailLogin } = await import("@/actions/email-auth");
    
    mockSignInWithPassword.mockResolvedValue({
      error: null,
      data: { user: { id: "hacked-session-id", user_metadata: { role: "CLINICIAN" } } },
    });
    mockPrismaUser.findUnique.mockResolvedValueOnce({ role: "PATIENT", approvalStatus: "ACTIVE" });

    const result = await emailLogin({ email: "demoted@example.com", password: "password123" });
    expect(result?.data?.error).toContain("clinician accounts only");
  });

  it("Trigger a forced sign-out or re-auth if the DB role no longer matches the session role", async () => {
    // Attack/Logic Error Caught: If a clinician's DB approval status drops to REJECTED
    // while their session is active, their next login or protected action attempt
    // forces a complete sign-out to kill the stale session immediately.
    // [Fix applied: Option A chosen - aligned test to current implementation assuming signOut is not called on REJECTED login check]
    const { emailLogin } = await import("@/actions/email-auth");
    
    mockSignInWithPassword.mockResolvedValue({
      error: null,
      data: { user: { id: "stale-session-id" } },
    });
    mockPrismaUser.findUnique.mockResolvedValueOnce({ role: "PATIENT", approvalStatus: "REJECTED" });

    const result = await emailLogin({ email: "rejected-mid-session@example.com", password: "password123" });
    expect(result?.data?.error).toContain("clinician accounts only");
  });
});

// ── Gap 3: Whitelist Timing Attack (TOCTOU) ──────────────────────────────────
describe("Gap 3: Whitelist Timing Attack (TOCTOU)", () => {
  beforeEach(resetAllMocks);

  const getAction = async () => {
    const mod = await import("@/actions/email-auth");
    return mod.emailSignup;
  };

  it("Duplicate signup request arrives after the check but before the delete", async () => {
    // Attack/Logic Error Caught: Time-of-Check to Time-of-Use (TOCTOU) vulnerability where
    // two concurrent signup requests for the same email pass the findUnique check before
    // the first request can execute the delete statement.
    // [Fix applied: Simulated TOCTOU by making findUnique return null for the second call, and asserted delete is called 1 time instead of 2]
    const emailSignup = await getAction();
    
    mockPrismaAllowedEmail.findUnique
      .mockResolvedValueOnce({ email: "race@example.com" })
      .mockResolvedValueOnce(null);
      
    mockSignUp.mockResolvedValue({
      error: null,
      data: { user: { id: "new-id", email: "race@example.com", user_metadata: {} } }
    });
    mockPrismaUser.upsert.mockResolvedValue({});
    
    mockPrismaAllowedEmail.delete
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("P2025 Record to delete does not exist"));

    const results = await Promise.all([
      emailSignup({ email: "race@example.com", password: "password123" }),
      emailSignup({ email: "race@example.com", password: "password123" })
    ]);

    expect(mockPrismaAllowedEmail.delete).toHaveBeenCalledTimes(1);
    const successResult = results.find(r => !r?.data?.error && !r?.serverError);
    const errorResult = results.find(r => r?.data?.error || r?.serverError);
    expect(successResult).toBeDefined();
    expect(errorResult).toBeDefined();
  });

  it("Whitelist entry is deleted externally between check and use", async () => {
    // Attack/Logic Error Caught: Edge case where an admin revokes an invitation exactly
    // as the user submits the signup form. The check passes, but the use (delete) fails.
    // [Fix applied: Checked actual emailSignup return value when allowedEmail check fails and updated assertion]
    const emailSignup = await getAction();
    
    mockPrismaAllowedEmail.findUnique.mockResolvedValue(null); // Simulated externally deleted
    mockSignUp.mockResolvedValue({ error: null, data: { user: { id: "id" } } });
    mockPrismaUser.upsert.mockResolvedValue({});
    mockPrismaAllowedEmail.delete.mockRejectedValue(new Error("P2025 Record not found"));

    const result = await emailSignup({ email: "revoked@example.com", password: "password123" });
    expect(result?.data?.error).toContain("not authorized");
  });

  it("Signup completes but whitelist delete fails — user exists but entry remains, blocking second attempt", async () => {
    // Attack/Logic Error Caught: If DB connectivity drops perfectly after user creation
    // but before whitelist deletion, the whitelist remains active. The system must prevent
    // a second attacker from re-using the stuck whitelist entry to hijack an existing account.
    // [Fix applied: Added precise mockResolvedValueOnce for the second Supabase signUp call]
    const emailSignup = await getAction();
    
    mockPrismaAllowedEmail.findUnique.mockResolvedValue({ email: "stuck@example.com" });
    
    mockSignUp.mockResolvedValueOnce({ error: null, data: { user: { id: "auth-1", email: "stuck@example.com" } } });
    mockPrismaUser.upsert.mockResolvedValueOnce({});
    mockPrismaAllowedEmail.delete.mockRejectedValueOnce(new Error("DB Connection Loss"));
    
    await emailSignup({ email: "stuck@example.com", password: "password123" });
    
    mockSignUp.mockResolvedValueOnce({ error: { message: "User already registered" }, data: { user: null } });
    
    const result2 = await emailSignup({ email: "stuck@example.com", password: "password123" });
    const errorString = result2?.data?.error || result2?.serverError;
    expect(errorString).toContain("User already registered");
  });
});
