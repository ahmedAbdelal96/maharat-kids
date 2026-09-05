export const REVIEW_PERMISSIONS = {
  view: "reviews.view",
  moderate: "reviews.moderate",
} as const;

export const reviewStatusLabels = {
  PENDING: "Pending review",
  APPROVED: "Published",
  REJECTED: "Needs changes",
} as const;
