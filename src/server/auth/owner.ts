import "server-only";

/**
 * The site owner (OWNER_EMAIL) is the only person who can grant or remove
 * admin access, and their own account can't be demoted or deactivated by
 * other admins. When OWNER_EMAIL is unset, any admin can manage roles.
 */
export function ownerEmail(): string | null {
  return process.env.OWNER_EMAIL?.trim().toLowerCase() || null;
}

export function isOwner(user: { email: string }): boolean {
  return user.email.toLowerCase() === ownerEmail();
}

export function canManageAdmins(user: { email: string }): boolean {
  return ownerEmail() === null || isOwner(user);
}
