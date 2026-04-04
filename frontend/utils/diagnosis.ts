"use server";

import prisma from "@/prisma/prisma";
import { cacheLife, cacheTag } from "next/cache";
import { RELIABILITY_THRESHOLDS } from "@/constants/reliability-thresholds";

// Base diagnosis select - always includes these fields
const diagnosisWithUserSelect = {
  id: true,
  disease: true,
  confidence: true,
  uncertainty: true,
  symptoms: true,
  modelUsed: true,
  cdss: true,
  city: true,
  region: true,
  province: true,
  district: true,
  barangay: true,
  latitude: true,
  longitude: true,
  temperature: true,
  temperatureUnit: true,
  heightCm: true,
  weightKg: true,
  bmiAdvice: true,
  userId: true,
  chatId: true,
  createdAt: true,
  status: true,
  verifiedAt: true,
  verifiedBy: true,
  rejectedAt: true,
  rejectedBy: true,
  originalStatus: true,
  user: {
    select: {
      id: true,
      name: true,
      age: true,
      gender: true,
    },
  },
} as const;

export const getDiagnosisByChatId = async (chatId: string) => {
  "use cache";
  cacheLife("hours");
  cacheTag("diagnosis", `diagnosis-${chatId}`);

  try {
    const diagnosis = await prisma.diagnosis.findUnique({
      where: { chatId },
    });

    return { success: diagnosis };
  } catch (error) {
    console.error(`Error fetching diagnosis for chatId ${chatId}:`, error);

    return { error: `Could not fetch diagnosis for chatId ${chatId}` };
  }
};

export const getLatestTempDiagnosisByChatId = async (chatId: string) => {
  try {
    const temp = await prisma.tempDiagnosis.findFirst({
      where: { chatId },
      orderBy: { createdAt: "desc" },
    });

    return { success: temp };
  } catch (error) {
    console.error(
      `Error fetching latest temp diagnosis for chatId ${chatId}:`,
      error
    );

    return {
      error: `Could not fetch latest temp diagnosis for chatId ${chatId}`,
    };
  }
};

/**
 * Check if a chat is in a "limbo" state: has a TempDiagnosis and an
 * Explanation but no permanent Diagnosis record. This can happen if
 * auto-record fails (e.g. transient DB error). The caller should
 * attempt recovery by re-running auto-record.
 */
export const getTempDiagnosisRecoveryState = async (chatId: string) => {
  try {
    const [tempDiagnosis, permanentDiagnosis] = await Promise.all([
      prisma.tempDiagnosis.findFirst({
        where: { chatId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.diagnosis.findUnique({
        where: { chatId },
        select: { id: true },
      }),
    ]);

    return {
      success: {
        needsRecovery: !!tempDiagnosis && !permanentDiagnosis,
        hasTempDiagnosis: !!tempDiagnosis,
        hasPermanentDiagnosis: !!permanentDiagnosis,
      },
    };
  } catch (error) {
    console.error(
      `Error checking temp diagnosis recovery state for chatId ${chatId}:`,
      error,
    );
    return { error: `Could not check recovery state for chatId ${chatId}` };
  }
};

export const getAllDiagnoses = async ({
  skip,
  take,
  includeStatus,
}: {
  skip?: number;
  take?: number;
  includeStatus?: "VERIFIED" | "PENDING" | "REJECTED" | "INCONCLUSIVE";
}) => {
  try {
    const includeRelations = {
      user: true,
      override: {
        select: {
          clinicianDisease: true,
          clinicianNotes: true,
          createdAt: true,
        },
      },
      notes: {
        include: {
          clinician: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc" as const,
        },
      },
    };

    // Build where clause based on status filter
    // Default to VERIFIED for backward compatibility in healthcare reports
    const whereClause = includeStatus 
      ? { status: includeStatus } 
      : { status: "VERIFIED" };

    if (skip || take) {
      const diagnoses = await prisma.diagnosis.findMany({
        skip,
        take,
        where: whereClause as any,
        include: includeRelations,
        orderBy: { createdAt: "desc" },
      });

      return { success: diagnoses };
    }

    const diagnoses = await prisma.diagnosis.findMany({
      where: whereClause as any,
      include: includeRelations,
      orderBy: { createdAt: "desc" },
    });

    return { success: diagnoses };
  } catch (error) {
    console.error(`Error fetching all diagnoses:`, error);

    return { error: `Could not fetch all diagnoses` };
  }
};

/**
 * Get all pending diagnoses awaiting clinician verification.
 * Used for the Pending Diagnoses queue.
 */
export const getPendingDiagnoses = async ({
  skip,
  take,
}: {
  skip?: number;
  take?: number;
}) => {
  try {
    const includeRelations = {
      user: {
        select: {
          id: true,
          name: true,
          age: true,
          gender: true,
          email: true,
          city: true,
          province: true,
          district: true,
          barangay: true,
        },
      },
      notes: {
        include: {
          clinician: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc" as const,
        },
      },
    };

    if (skip || take) {
      const diagnoses = await prisma.diagnosis.findMany({
        skip,
        take,
        where: { status: "PENDING" } as any,
        include: includeRelations,
        orderBy: { createdAt: "desc" },
      });

      return { success: diagnoses };
    }

    const diagnoses = await prisma.diagnosis.findMany({
      where: { status: "PENDING" } as any,
      include: includeRelations,
      orderBy: { createdAt: "desc" },
    });

    return { success: diagnoses };
  } catch (error) {
    console.error(`Error fetching pending diagnoses:`, error);

    return { error: `Could not fetch pending diagnoses` };
  }
};

/**
 * Get the count of pending diagnoses.
 */
export const getPendingDiagnosesCount = async () => {
  try {
    const count = await prisma.diagnosis.count({
      where: { status: "PENDING" } as any,
    });

    return { success: count };
  } catch (error) {
    console.error(`Error fetching pending diagnoses count: ${error}`);

    return { error: `Error fetching pending diagnoses count: ${error}` };
  }
};

export const getTotalDiagnosesCount = async () => {
  try {
    const count = await prisma.diagnosis.count();

    return { success: count };
  } catch (error) {
    console.error(`Error fetching total diagnoses count: ${error}`);

    return { error: `Error fetching total diagnoses count: ${error}` };
  }
};

export const getDiseaseDiagnosesByDistricts = async (
  disease: string,
  startDate?: string,
  endDate?: string
) => {
  try {
    // Filter by VERIFIED status and complete patient demographics for surveillance dashboards
    const statusFilter = { status: "VERIFIED" } as any;
    const userFilter = {
      user: {
        age: { not: null },
        gender: { not: null },
      },
    };

    if (disease === 'all') {
      const [diagnoses, grouped] = await Promise.all([
        prisma.diagnosis.findMany({
          where: {
            district: { not: null },
            createdAt: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined,
            },
            ...statusFilter,
            ...userFilter,
          },
          select: diagnosisWithUserSelect,
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.diagnosis.groupBy({
          by: ["district"],
          where: {
            district: { not: null },
            createdAt: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined,
            },
            ...statusFilter,
            ...userFilter,
          },
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: "desc",
            },
          },
        }),
      ]);

      return { success: { diagnoses, grouped } };
    }

    const [diagnoses, grouped] = await Promise.all([
      prisma.diagnosis.findMany({
        where: {
          disease: disease.toUpperCase() as any,
          district: { not: null },
          createdAt: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          },
          ...statusFilter,
          ...userFilter,
        },
        select: diagnosisWithUserSelect,
      }),
      prisma.diagnosis.groupBy({
        by: ["district"],
        where: {
          disease: disease.toUpperCase() as any,
          district: { not: null },
          createdAt: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          },
          ...statusFilter,
          ...userFilter,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
      }),
    ]);

    return { success: { diagnoses, grouped } };
  } catch (error) {
    console.error(`Error fetching diagnoses for disease ${disease}`, error);

    return { error: `Could not fetch diagnoses for disease ${disease}` };
  }
}

export const getDiagnosesWithCoordinates = async (
  disease: string,
  startDate?: string,
  endDate?: string
) => {
  try {
    const dateFilter = {
      gte: startDate ? new Date(startDate) : undefined,
      lte: endDate ? new Date(endDate) : undefined,
    };

    // Filter by VERIFIED status and complete patient demographics for surveillance dashboards
    const statusFilter = { status: "VERIFIED" } as any;
    const userFilter = {
      user: {
        age: { not: null },
        gender: { not: null },
      },
    };

    if (disease === "all") {
      const [diagnoses, unpinnedDiagnoses, totalCount] = await Promise.all([
        prisma.diagnosis.findMany({
          where: {
            latitude: { not: null },
            longitude: { not: null },
            createdAt: dateFilter,
            ...statusFilter,
            ...userFilter,
          },
          select: diagnosisWithUserSelect,
          orderBy: { createdAt: "desc" },
        }),
        prisma.diagnosis.findMany({
          where: {
            OR: [{ latitude: null }, { longitude: null }],
            createdAt: dateFilter,
            ...statusFilter,
            ...userFilter,
          },
          select: diagnosisWithUserSelect,
          orderBy: { createdAt: "desc" },
        }),
        prisma.diagnosis.count({
          where: { createdAt: dateFilter, ...statusFilter, ...userFilter },
        }),
      ]);

      return { success: { diagnoses, unpinnedDiagnoses, totalCount } };
    }

    const [diagnoses, unpinnedDiagnoses, totalCount] = await Promise.all([
      prisma.diagnosis.findMany({
        where: {
          disease: disease.toUpperCase() as any,
          latitude: { not: null },
          longitude: { not: null },
          createdAt: dateFilter,
          ...statusFilter,
          ...userFilter,
        },
        select: diagnosisWithUserSelect,
        orderBy: { createdAt: "desc" },
      }),
      prisma.diagnosis.findMany({
        where: {
          disease: disease.toUpperCase() as any,
          OR: [{ latitude: null }, { longitude: null }],
          createdAt: dateFilter,
          ...statusFilter,
          ...userFilter,
        },
        select: diagnosisWithUserSelect,
        orderBy: { createdAt: "desc" },
      }),
      prisma.diagnosis.count({
        where: {
          disease: disease.toUpperCase() as any,
          createdAt: dateFilter,
          ...statusFilter,
          ...userFilter,
        },
      }),
    ]);

    return { success: { diagnoses, unpinnedDiagnoses, totalCount } };
  } catch (error) {
    console.error(
      `Error fetching diagnoses with coordinates for disease ${disease}`,
      error
    );

    return {
      error: `Could not fetch diagnoses with coordinates for disease ${disease}`,
    };
  }
};

/**
 * Get the count of diagnoses verified within a specific date range.
 */
export const getVerifiedTodayCount = async (
  startOfDay: Date,
  endOfDay: Date,
) => {
  try {
    const count = await prisma.diagnosis.count({
      where: {
        status: "VERIFIED",
        verifiedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      } as any,
    });

    return { success: count };
  } catch (error) {
    console.error(`Error fetching verified today count: ${error}`);
    return { error: `Error fetching verified today count: ${error}` };
  }
};

/**
 * Get the count of pending diagnoses with low reliability
 * (Review Recommended or Expert Review Needed).
 */
export const getLowReliabilityPendingCount = async () => {
  try {
    const diagnoses = await prisma.diagnosis.findMany({
      where: { status: "PENDING" } as any,
      select: { confidence: true, uncertainty: true },
    });

    let lowReliabilityCount = 0;
    for (const d of diagnoses) {
      const { confidence, uncertainty } = d;
      const isReliable =
        confidence >= RELIABILITY_THRESHOLDS.reliable.minConfidence &&
        uncertainty < RELIABILITY_THRESHOLDS.reliable.maxUncertainty;
      if (!isReliable) {
        lowReliabilityCount++;
      }
    }

    return { success: lowReliabilityCount };
  } catch (error) {
    console.error(`Error fetching low reliability count: ${error}`);
    return { error: `Error fetching low reliability count: ${error}` };
  }
};

/**
 * Get all inconclusive diagnoses.
 * These are cases where the AI model could not reach a confident prediction
 * (is_valid=false from backend). Clinicians can verify or override them.
 */
export const getInconclusiveDiagnoses = async ({
  skip,
  take,
}: {
  skip?: number;
  take?: number;
} = {}) => {
  try {
    const includeRelations = {
      user: {
        select: {
          id: true,
          name: true,
          age: true,
          gender: true,
          email: true,
          city: true,
          province: true,
          district: true,
          barangay: true,
        },
      },
      notes: {
        include: {
          clinician: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc" as const,
        },
      },
    };

    const whereClause = { status: "INCONCLUSIVE" } as any;

    if (skip !== undefined || take !== undefined) {
      const diagnoses = await prisma.diagnosis.findMany({
        skip,
        take,
        where: whereClause,
        include: includeRelations,
        orderBy: { createdAt: "desc" },
      });

      return { success: diagnoses };
    }

    const diagnoses = await prisma.diagnosis.findMany({
      where: whereClause,
      include: includeRelations,
      orderBy: { createdAt: "desc" },
    });

    return { success: diagnoses };
  } catch (error) {
    console.error(`Error fetching inconclusive diagnoses:`, error);
    return { error: `Could not fetch inconclusive diagnoses` };
  }
};

/**
 * Get the count of inconclusive diagnoses.
 */
export const getInconclusiveDiagnosesCount = async () => {
  try {
    const count = await prisma.diagnosis.count({
      where: { status: "INCONCLUSIVE" } as any,
    });

    return { success: count };
  } catch (error) {
    console.error(`Error fetching inconclusive diagnoses count: ${error}`);
    return { error: `Error fetching inconclusive diagnoses count: ${error}` };
  }
};

/**
 * Get all rejected diagnoses.
 * These are cases that clinicians have rejected.
 */
export const getRejectedDiagnoses = async ({
  skip,
  take,
}: {
  skip?: number;
  take?: number;
} = {}) => {
  try {
    const includeRelations = {
      user: {
        select: {
          id: true,
          name: true,
          age: true,
          gender: true,
          email: true,
          city: true,
          province: true,
          district: true,
          barangay: true,
        },
      },
      notes: {
        include: {
          clinician: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc" as const,
        },
      },
      rejectedByUser: {
        select: {
          id: true,
          name: true,
        },
      },
    };

    const whereClause = { status: "REJECTED" } as any;

    if (skip !== undefined || take !== undefined) {
      const diagnoses = await prisma.diagnosis.findMany({
        skip,
        take,
        where: whereClause,
        include: includeRelations,
        orderBy: { createdAt: "desc" },
      });

      return { success: diagnoses };
    }

    const diagnoses = await prisma.diagnosis.findMany({
      where: whereClause,
      include: includeRelations,
      orderBy: { createdAt: "desc" },
    });

    return { success: diagnoses };
  } catch (error) {
    console.error(`Error fetching rejected diagnoses:`, error);
    return { error: `Could not fetch rejected diagnoses` };
  }
};

/**
 * Get the count of rejected diagnoses.
 */
export const getRejectedDiagnosesCount = async () => {
  try {
    const count = await prisma.diagnosis.count({
      where: { status: "REJECTED" } as any,
    });

    return { success: count };
  } catch (error) {
    console.error(`Error fetching rejected diagnoses count: ${error}`);
    return { error: `Error fetching rejected diagnoses count: ${error}` };
  }
};
