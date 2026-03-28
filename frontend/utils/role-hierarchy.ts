/**
 * Role hierarchy utility for consistent permission checks across the application.
 *
 * Hierarchy (highest to lowest privilege):
 *   DEVELOPER > ADMIN > CLINICIAN > PATIENT
 *
 * Higher roles inherit permissions of lower roles.
 */

export type AppRole = "PATIENT" | "CLINICIAN" | "ADMIN" | "DEVELOPER";

/**
 * Role hierarchy levels (higher number = higher privilege)
 */
const ROLE_HIERARCHY: Record<AppRole, number> = {
  PATIENT: 0,
  CLINICIAN: 1,
  ADMIN: 2,
  DEVELOPER: 3,
};

/**
 * Check if a role has at least the required privilege level.
 * Higher roles inherit permissions of lower roles.
 *
 * @param userRole - The user's current role
 * @param requiredRole - The minimum required role
 * @returns true if userRole has at least requiredRole privilege
 */
export function hasRolePrivilege(
  userRole: string,
  requiredRole: AppRole,
): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as AppRole];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  if (userLevel === undefined || requiredLevel === undefined) {
    return false;
  }

  return userLevel >= requiredLevel;
}

/**
 * Check if a role is in the allowed roles list.
 * This is a convenience function for explicit role lists.
 *
 * @param userRole - The user's current role
 * @param allowedRoles - Array of allowed roles
 * @returns true if userRole is in allowedRoles
 */
export function isRoleAllowed(
  userRole: string,
  allowedRoles: AppRole[],
): boolean {
  return allowedRoles.includes(userRole as AppRole);
}

/**
 * Check if a role is admin-like (ADMIN or DEVELOPER).
 * Used for admin-only actions like approving clinicians.
 *
 * @param role - The role to check
 * @returns true if role is ADMIN or DEVELOPER
 */
export function isAdminLike(role: string): boolean {
  return role === "ADMIN" || role === "DEVELOPER";
}

/**
 * Check if a role can create patient accounts.
 * CLINICIAN, ADMIN, and DEVELOPER can create patients.
 *
 * @param role - The role to check
 * @returns true if role can create patients
 */
export function canCreatePatient(role: string): boolean {
  return hasRolePrivilege(role, "CLINICIAN");
}

/**
 * Check if a role can override diagnoses.
 * CLINICIAN, ADMIN, and DEVELOPER can override diagnoses.
 *
 * @param role - The role to check
 * @returns true if role can override diagnoses
 */
export function canOverrideDiagnosis(role: string): boolean {
  return hasRolePrivilege(role, "CLINICIAN");
}

/**
 * Check if a role can manage clinicians.
 * Only ADMIN and DEVELOPER can manage clinicians.
 *
 * @param role - The role to check
 * @returns true if role can manage clinicians
 */
export function canManageClinicians(role: string): boolean {
  return isAdminLike(role);
}

/**
 * Check if a role can approve/reject clinician accounts.
 * Only ADMIN and DEVELOPER can approve clinicians.
 *
 * @param role - The role to check
 * @returns true if role can approve clinicians
 */
export function canApproveClinicians(role: string): boolean {
  return isAdminLike(role);
}
