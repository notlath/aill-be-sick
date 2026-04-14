import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = {
  chat: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  diagnosis: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  tempDiagnosis: {
    findFirst: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  explanation: {
    findUnique: vi.fn(),
  },
};

const mockGetCurrentDbUser = vi.fn();
const mockHasActiveDeletionSchedule = vi.fn();
const mockRevalidatePath = vi.fn();
const mockRevalidateTag = vi.fn();

vi.mock("@/prisma/prisma", () => ({
  default: mockPrisma,
}));

vi.mock("@/utils/user", () => ({
  getCurrentDbUser: (...args: unknown[]) => mockGetCurrentDbUser(...args),
}));

vi.mock("@/utils/check-deletion-schedule", () => ({
  hasActiveDeletionSchedule: (...args: unknown[]) =>
    mockHasActiveDeletionSchedule(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

describe("clinical verification actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetCurrentDbUser.mockResolvedValue({
      success: {
        id: 7,
        role: "PATIENT",
        latitude: null,
        longitude: null,
        city: null,
        province: null,
        region: null,
        barangay: null,
        district: null,
      },
    });
    mockHasActiveDeletionSchedule.mockResolvedValue(false);
  });

  it("updates the permanent Diagnosis when one already exists for the chat", async () => {
    const { saveClinicalVerification } = await import(
      "@/actions/save-clinical-verification"
    );

    mockPrisma.chat.findFirst.mockResolvedValue({
      chatId: "chat-1",
      userId: 7,
    });
    mockPrisma.diagnosis.findUnique.mockResolvedValue({
      id: 41,
      disease: "DENGUE",
    });
    mockPrisma.diagnosis.update.mockResolvedValue({});

    await saveClinicalVerification({
      chatId: "chat-1",
      disease: "Dengue",
      selectedSymptomIds: [
        "high_fever",
        "severe_body_aches",
        "severe_headache",
        "extreme_fatigue",
      ],
    });

    expect(mockPrisma.diagnosis.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 41 },
        data: expect.objectContaining({
          clinicalVerificationStatus: "CONFIRMED",
        }),
      }),
    );
    expect(mockPrisma.tempDiagnosis.findFirst).not.toHaveBeenCalled();
  });

  it("falls back to the latest TempDiagnosis when the permanent record does not exist yet", async () => {
    const { saveClinicalVerification } = await import(
      "@/actions/save-clinical-verification"
    );

    mockPrisma.chat.findFirst.mockResolvedValue({
      chatId: "chat-2",
      userId: 7,
    });
    mockPrisma.diagnosis.findUnique.mockResolvedValue(null);
    mockPrisma.tempDiagnosis.findFirst.mockResolvedValue({
      id: 9,
      disease: "DENGUE",
    });
    mockPrisma.tempDiagnosis.update.mockResolvedValue({});

    await saveClinicalVerification({
      chatId: "chat-2",
      disease: "DENGUE",
      selectedSymptomIds: [
        "high_fever",
        "severe_body_aches",
        "severe_headache",
        "extreme_fatigue",
        "cough_or_runny_nose",
      ],
    });

    expect(mockPrisma.tempDiagnosis.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 9 },
        data: expect.objectContaining({
          clinicalVerificationStatus: "BORDERLINE",
        }),
      }),
    );
  });

  it("copies saved clinical verification from TempDiagnosis to Diagnosis during auto-record", async () => {
    const { autoRecordDiagnosis } = await import(
      "@/actions/auto-record-diagnosis"
    );

    const savedVerification = {
      protocolVersion: "2026-04-13",
      selectedSymptomIds: [
        "high_fever",
        "severe_body_aches",
        "severe_headache",
        "extreme_fatigue",
      ],
      matchedSymptomIds: [
        "high_fever",
        "severe_body_aches",
        "severe_headache",
        "extreme_fatigue",
      ],
      missingCoreSymptomIds: ["pain_behind_eyes", "mild_bleeding", "rash_red_spots"],
      contradictionSymptomIds: [],
      matchedCount: 4,
      minRequiredCount: 4,
      coreMatchedCount: 2,
      minCoreCount: 2,
      contradictionCount: 0,
      submittedAt: "2026-04-13T10:00:00.000Z",
    };

    mockPrisma.chat.findUnique.mockResolvedValue({ hasDiagnosis: false });
    mockPrisma.tempDiagnosis.findFirst.mockResolvedValue({
      id: 15,
      confidence: 0.96,
      uncertainty: 0.08,
      modelUsed: "BIOCLINICAL_MODERNBERT",
      disease: "DENGUE",
      chatId: "chat-3",
      symptoms: "fever, headache, body aches",
      cdss: null,
      isValid: true,
      clinicalVerificationStatus: "CONFIRMED",
      clinicalVerification: savedVerification,
    });
    mockPrisma.explanation.findUnique.mockResolvedValue(null);
    mockPrisma.diagnosis.create.mockResolvedValue({ id: 100 });
    mockPrisma.chat.update.mockResolvedValue({});
    mockPrisma.tempDiagnosis.deleteMany.mockResolvedValue({ count: 1 });

    await autoRecordDiagnosis({
      messageId: 11,
      chatId: "chat-3",
    });

    expect(mockPrisma.diagnosis.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clinicalVerificationStatus: "CONFIRMED",
          clinicalVerification: savedVerification,
        }),
      }),
    );
    expect(mockPrisma.tempDiagnosis.deleteMany).toHaveBeenCalledWith({
      where: { chatId: "chat-3" },
    });
  });
});
