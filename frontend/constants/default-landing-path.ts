export type AppRole = "PATIENT" | "CLINICIAN" | "ADMIN" | "DEVELOPER";

export type DeveloperView = "PATIENT" | "CLINICIAN";

// Shared source of truth for role landing routes.
// Keep primary nav links in nav-items.ts aligned with this map.
export const DEFAULT_LANDING_PATH_BY_ROLE: Record<
  Exclude<AppRole, "DEVELOPER">,
  string
> = {
  PATIENT: "/diagnosis",
  CLINICIAN: "/map",
  ADMIN: "/map",
};

export const getDefaultLandingPathForDeveloperView = (
  view?: DeveloperView | null,
) => {
  return view === "CLINICIAN"
    ? DEFAULT_LANDING_PATH_BY_ROLE.CLINICIAN
    : DEFAULT_LANDING_PATH_BY_ROLE.PATIENT;
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
