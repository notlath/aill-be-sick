export const RELIABILITY_THRESHOLDS = {
  reliable: {
    minConfidence: 0.9,
    maxUncertainty: 0.03,
  },
  reviewRecommended: {
    minConfidence: 0.7,
    maxUncertainty: 0.08,
  },
} as const;
