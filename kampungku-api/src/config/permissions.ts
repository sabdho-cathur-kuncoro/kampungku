import type { Role } from '@prisma/client';

/**
 * Single source of truth for tenant-scoped feature permissions.
 *
 * Roles listed here grant access; SUPER_ADMIN is NOT listed because it bypasses
 * `authorize()` automatically (platform-level admin can access any route by default).
 *
 * To grant a permission, add the role. To revoke, remove it. Routes reference
 * permission keys via `authorizePermission('WARGA_CREATE')` instead of duplicating
 * role lists across files.
 *
 * Keep this map in sync with the "Role & Akses" table in CLAUDE.md.
 */
export const PERMISSIONS = {
  // Warga (residents)
  WARGA_CREATE:       ['ADMIN', 'KETUA_RT'],
  WARGA_UPDATE:       ['ADMIN', 'KETUA_RT'],   // ownership ("warga itu sendiri") handled via authorizeOwnerOr
  WARGA_DELETE:       ['ADMIN'],
  WARGA_VIEW_ALL:     ['ADMIN', 'KETUA_RT', 'BENDAHARA', 'SEKRETARIS'],

  // Iuran (dues)
  IURAN_MANAGE:       ['ADMIN', 'BENDAHARA'],
  IURAN_PAY_SELF:     ['ADMIN', 'KETUA_RT', 'BENDAHARA', 'SEKRETARIS', 'WARGA'],

  // Pengumuman (announcements)
  PENGUMUMAN_CREATE:  ['ADMIN', 'KETUA_RT', 'SEKRETARIS'],

  // Surat (letters)
  SURAT_APPROVE:      ['ADMIN', 'KETUA_RT'],
  SURAT_REQUEST:      ['ADMIN', 'KETUA_RT', 'BENDAHARA', 'SEKRETARIS', 'WARGA'],

  // Pengaduan (complaints)
  PENGADUAN_CREATE:   ['ADMIN', 'KETUA_RT', 'BENDAHARA', 'SEKRETARIS', 'WARGA'],
  PENGADUAN_VIEW_ALL: ['ADMIN', 'KETUA_RT'],

  // Dashboard
  DASHBOARD_STATS:    ['ADMIN', 'KETUA_RT', 'BENDAHARA', 'SEKRETARIS'],

  // Intra-tenant user/role management
  USER_MANAGE_TENANT: ['ADMIN'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;
