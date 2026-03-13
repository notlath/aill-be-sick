"use server";

import prisma from "@/prisma/prisma";
import { cacheLife, cacheTag } from "next/cache";

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
}: {
  skip?: number;
  take?: number;
}) => {
  try {
    if (skip || take) {
      const diagnoses = await prisma.diagnosis.findMany({
        skip,
        take,
        include: { user: true },
      });

      return { success: diagnoses };
    }

    const diagnoses = await prisma.diagnosis.findMany({
      include: { user: true },
    });

    return { success: diagnoses };
  } catch (error) {
    console.error(`Error fetching all diagnoses:`, error);

    return { error: `Could not fetch all diagnoses` };
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

    if (disease === 'all') {
      const [diagnoses, grouped] = await Promise.all([
        prisma.diagnosis.findMany({
          where: {
            district: { not: null },
            createdAt: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined,
            },
          },
          include: {
            user: true,
          },
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
        },
        include: {
          user: true,
        },
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

    if (disease === "all") {
      const [diagnoses, unpinnedDiagnoses, totalCount] = await Promise.all([
        prisma.diagnosis.findMany({
          where: {
            latitude: { not: null },
            longitude: { not: null },
            createdAt: dateFilter,
          },
          include: { user: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.diagnosis.findMany({
          where: {
            OR: [{ latitude: null }, { longitude: null }],
            createdAt: dateFilter,
          },
          include: { user: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.diagnosis.count({
          where: { createdAt: dateFilter },
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
        },
        include: { user: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.diagnosis.findMany({
        where: {
          disease: disease.toUpperCase() as any,
          OR: [{ latitude: null }, { longitude: null }],
          createdAt: dateFilter,
        },
        include: { user: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.diagnosis.count({
        where: {
          disease: disease.toUpperCase() as any,
          createdAt: dateFilter,
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