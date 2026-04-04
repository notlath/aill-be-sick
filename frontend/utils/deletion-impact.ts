import { Eye, Trash2, Database } from "lucide-react";

export interface DeletionImpactItem {
  label: string;
  detail: string;
}

export interface DeletionImpactSummary {
  anonymized: DeletionImpactItem[];
  deleted: DeletionImpactItem[];
  kept: DeletionImpactItem[];
}

export function getDeletionImpactSummary(): DeletionImpactSummary {
  return {
    anonymized: [
      {
        label: "Name and email",
        detail: "Your name becomes 'Anonymous User' and your email is replaced with a placeholder.",
      },
      {
        label: "Personal details",
        detail: "Age, gender, and birthday will be removed.",
      },
      {
        label: "Location information",
        detail: "Address, city, region, province, barangay, district, and coordinates will be cleared.",
      },
      {
        label: "Consent records",
        detail: "Terms and privacy acceptance timestamps will be cleared.",
      },
    ],
    deleted: [
      {
        label: "Chat conversations",
        detail: "All chat sessions and messages will be permanently removed.",
      },
    ],
    kept: [
      {
        label: "Diagnosis records (anonymous)",
        detail: "Disease predictions and symptom data will be kept without any personal or location information, for public health tracking.",
      },
    ],
  };
}

export const ImpactIcons = {
  anonymized: Eye,
  deleted: Trash2,
  kept: Database,
};
