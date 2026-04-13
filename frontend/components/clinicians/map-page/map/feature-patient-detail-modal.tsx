"use client";

import { Diagnosis } from "@/lib/generated/prisma";
import { useEffect, useState } from "react";
import { ReportDetailModal } from "@/components/clinicians/healthcare-reports-page/report-detail-modal";
import type { DiagnosisRow } from "@/components/clinicians/healthcare-reports-page/columns";

interface FeaturePatientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnosis: Diagnosis | null;
}

export function FeaturePatientDetailModal({
  isOpen,
  onClose,
  diagnosis,
}: FeaturePatientDetailModalProps) {
  const [report, setReport] = useState<DiagnosisRow | null>(null);

  useEffect(() => {
    if (!isOpen || !diagnosis) {
      setReport(null);
      return;
    }

    setReport({
      id: diagnosis.id,
      disease: diagnosis.disease,
      confidence: diagnosis.confidence,
      uncertainty: diagnosis.uncertainty,
      symptoms: diagnosis.symptoms,
      userId: diagnosis.userId,
      district: diagnosis.district,
      barangay: diagnosis.barangay,
      createdAt: diagnosis.createdAt,
      override: (diagnosis as any).override ?? null,
      notes: (diagnosis as any).notes ?? [],
      status: diagnosis.status,
      clinicalVerification: diagnosis.clinicalVerification as any,
      clinicalVerificationStatus:
        diagnosis.clinicalVerificationStatus as any,
    });
  }, [isOpen, diagnosis]);

  if (!isOpen || !report) return null;

  return (
    <ReportDetailModal
      isOpen={isOpen}
      onClose={onClose}
      report={report}
    />
  );
}
