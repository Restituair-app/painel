export const normalizeRole = (role: unknown): string => {
  if (typeof role !== 'string') {
    return '';
  }

  return role.trim().toLowerCase();
};

export const hasRoleValue = (role: unknown): boolean => normalizeRole(role).length > 0;

export const isAdminRole = (role: unknown): boolean => normalizeRole(role) === 'admin';
