import { Router } from 'express';
import {
  listWargaController,
  getWargaController,
  createWargaController,
  updateWargaController,
  deleteWargaController,
  listKeluargaController,
  addKeluargaController,
  updateKeluargaController,
  deleteKeluargaController,
  exportWargaController,
} from './warga.controller';
import { wargaService } from './warga.service';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorizePermission, authorizeOwnerOr } from '../../middlewares/rbac.middleware';
import { tenantScope } from '../../middlewares/tenant.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  listWargaQuerySchema,
  wargaIdParamSchema,
  createWargaSchema,
  updateWargaSchema,
  createKeluargaSchema,
  updateKeluargaSchema,
  keluargaIdParamSchema,
} from './warga.schema';
import type { Request } from 'express';

export const wargaRouter = Router();

// All warga routes: must be authenticated and tenant-scoped
wargaRouter.use(authenticate, tenantScope);

const ownerFromWargaId = (req: Request) =>
  wargaService.getOwnerUserId(req.tenantId!, String(req.params.id));

// GET /warga/export — must precede /:id to avoid route conflict
wargaRouter.get(
  '/export',
  authorizePermission('WARGA_VIEW_ALL'),
  exportWargaController,
);

// GET /warga
wargaRouter.get(
  '/',
  authorizePermission('WARGA_VIEW_ALL'),
  validate(listWargaQuerySchema),
  listWargaController,
);

// GET /warga/:id — owner or privileged role
wargaRouter.get(
  '/:id',
  validate(wargaIdParamSchema),
  authorizeOwnerOr(['ADMIN', 'KETUA_RT', 'BENDAHARA', 'SEKRETARIS'], ownerFromWargaId),
  getWargaController,
);

// POST /warga
wargaRouter.post(
  '/',
  authorizePermission('WARGA_CREATE'),
  validate(createWargaSchema),
  createWargaController,
);

// PUT /warga/:id — owner or ADMIN/KETUA_RT
wargaRouter.put(
  '/:id',
  validate(updateWargaSchema),
  authorizeOwnerOr(['ADMIN', 'KETUA_RT'], ownerFromWargaId),
  updateWargaController,
);

// DELETE /warga/:id — ADMIN only
wargaRouter.delete(
  '/:id',
  validate(wargaIdParamSchema),
  authorizePermission('WARGA_DELETE'),
  deleteWargaController,
);

// --- Keluarga sub-routes ---

// GET /warga/:id/keluarga — owner or privileged role
wargaRouter.get(
  '/:id/keluarga',
  validate(wargaIdParamSchema),
  authorizeOwnerOr(['ADMIN', 'KETUA_RT', 'BENDAHARA', 'SEKRETARIS'], ownerFromWargaId),
  listKeluargaController,
);

// POST /warga/:id/keluarga — owner or ADMIN/KETUA_RT
wargaRouter.post(
  '/:id/keluarga',
  authorizeOwnerOr(['ADMIN', 'KETUA_RT'], ownerFromWargaId),
  validate(createKeluargaSchema),
  addKeluargaController,
);

// PUT /warga/:id/keluarga/:kid — owner or ADMIN/KETUA_RT
wargaRouter.put(
  '/:id/keluarga/:kid',
  authorizeOwnerOr(['ADMIN', 'KETUA_RT'], ownerFromWargaId),
  validate(updateKeluargaSchema),
  updateKeluargaController,
);

// DELETE /warga/:id/keluarga/:kid — owner or ADMIN
wargaRouter.delete(
  '/:id/keluarga/:kid',
  authorizeOwnerOr(['ADMIN'], ownerFromWargaId),
  validate(keluargaIdParamSchema),
  deleteKeluargaController,
);
