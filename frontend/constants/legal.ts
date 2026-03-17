/**
 * Legal constants for Privacy Policy and Terms of Service
 * These placeholders should be updated with actual information before deployment.
 */

export const LEGAL_CONSTANTS = {
  // Organization Information
  HOSPITAL_NAME: "Bagong Silangan Health Center",
  HOSPITAL_EMAIL: "contact@bsHealthCenter.ph", // TODO: Update with real email
  HOSPITAL_PHONE: "+63 XXX XXX XXXX", // TODO: Update with real phone
  HOSPITAL_ADDRESS: "Bagong Silangan, Quezon City, Philippines", // TODO: Update with real address
  BARANGAY_NAME: "Bagong Silangan, Quezon City",

  // Research Team Information (Placeholders)
  RESEARCH_TEAM: "[Your Names]", // TODO: Update with actual names
  RESEARCH_EMAIL: "[Your Email]", // TODO: Update with actual email
  UNIVERSITY: "[Your University]", // TODO: Update with actual university
  THESIS_TITLE: "AI'll Be Sick: AI-Powered Disease Detection System",

  // Version Tracking
  TERMS_VERSION: "1.0",
  PRIVACY_VERSION: "1.0",
  LAST_UPDATED: "March 2026",

  // System Capabilities - Detected Diseases
  DISEASES: [
    "Dengue",
    "Pneumonia",
    "Typhoid",
    "Impetigo",
    "Diarrhea",
    "Measles",
    "Influenza",
  ] as const,

  // Ethics Status
  ETHICS_STATUS: "Pending institutional review", // TODO: Update when ethics approval obtained
} as const;

export type Disease = (typeof LEGAL_CONSTANTS.DISEASES)[number];
