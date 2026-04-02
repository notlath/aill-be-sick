"use server";

import prisma from "@/prisma/prisma";
import { cacheLife, cacheTag } from "next/cache";

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

export const getAllDiagnoses = async ({
  skip,
  take,
  includeStatus,
}: {
  skip?: number;
  take?: number;
  includeStatus?: "VERIFIED" | "PENDING" | "REJECTED";
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
