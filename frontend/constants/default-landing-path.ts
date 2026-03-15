export type AppRole = "PATIENT" | "CLINICIAN" | "ADMIN" | "DEVELOPER";

export type DeveloperView = "PATIENT" | "CLINICIAN";

const LANDING_PATH_BY_ROLE: Record<Exclude<AppRole, "DEVELOPER">, string> = {
  PATIENT: "/diagnosis",
  CLINICIAN: "/map",
  ADMIN: "/map",
};

export const getDefaultLandingPathForDeveloperView = (
  view?: DeveloperView | null,
) => {
  return view === "CLINICIAN"
    ? LANDING_PATH_BY_ROLE.CLINICIAN
    : LANDING_PATH_BY_ROLE.PATIENT;
};

export const getDefaultLandingPath = (
  role: AppRole,
  developerView?: DeveloperView | null,
) => {
  if (role === "DEVELOPER") {
    return getDefaultLandingPathForDeveloperView(developerView);
  }

  return LANDING_PATH_BY_ROLE[role];
};
