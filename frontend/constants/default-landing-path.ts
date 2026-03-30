export type AppRole = "PATIENT" | "CLINICIAN" | "ADMIN" | "DEVELOPER";

export type DeveloperView = "PATIENT" | "CLINICIAN" | "ADMIN";

// Shared source of truth for role landing routes.
// Keep primary nav links in nav-items.ts aligned with this map.
export const DEFAULT_LANDING_PATH_BY_ROLE: Record<
  Exclude<AppRole, "DEVELOPER">,
  string
> = {
  PATIENT: "/diagnosis",
  CLINICIAN: "/map",
  ADMIN: "/pending-clinicians",
};

export const getDefaultLandingPathForDeveloperView = (
  view?: DeveloperView | null,
) => {
  if (view === "ADMIN") {
    return DEFAULT_LANDING_PATH_BY_ROLE.ADMIN;
  }
  if (view === "CLINICIAN") {
    return DEFAULT_LANDING_PATH_BY_ROLE.CLINICIAN;
  }
  return DEFAULT_LANDING_PATH_BY_ROLE.PATIENT;
};

export const getDefaultLandingPath = (
  role: AppRole,
  developerView?: DeveloperView | null,
) => {
  if (role === "DEVELOPER") {
    return getDefaultLandingPathForDeveloperView(developerView);
  }

  return DEFAULT_LANDING_PATH_BY_ROLE[role];
};
