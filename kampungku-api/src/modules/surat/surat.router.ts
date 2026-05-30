import { Router } from 'express';
import type { Request } from 'express';
import {
  listSuratController,
  listSayaController,
  getSuratController,
  ajukanSuratController,
  approveSuratController,
  tolakSuratController,
  downloadSuratController,
} from './surat.controller';
import { suratService } from './surat.service';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorizePermission, authorizeOwnerOr } from '../../middlewares/rbac.middleware';
import { tenantScope } from '../../middlewares/tenant.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  listSuratQuerySchema,
  suratIdParamSchema,
  ajukanSuratSchema,
  tolakSuratSchema,
} from './surat.schema';

export const suratRouter = Router();

suratRouter.use(authenticate, tenantScope);

const ownerFromId = (req: Request) =>
  suratService.getOwnerUserId(req.tenantId!, String(req.params.id));

// Static sub-paths before /:id
// GET /surat/saya — own requests
suratRouter.get('/saya', validate(listSuratQuerySchema), listSayaController);

// GET /surat — all (ADMIN, KETUA_RT)
suratRouter.get(
  '/',
  authorizePermission('SURAT_APPROVE'),
  validate(listSuratQuerySchema),
  listSuratController,
);

// GET /surat/:id — owner or approvers
suratRouter.get(
  '/:id',
  validate(suratIdParamSchema),
  authorizeOwnerOr(['ADMIN', 'KETUA_RT'], ownerFromId),
  getSuratController,
);

// POST /surat/ajukan
suratRouter.post(
  '/ajukan',
  authorizePermission('SURAT_REQUEST'),
  validate(ajukanSuratSchema),
  ajukanSuratController,
);

// PUT /surat/:id/approve
suratRouter.put(
  '/:id/approve',
  validate(suratIdParamSchema),
  authorizePermission('SURAT_APPROVE'),
  approveSuratController,
);

// PUT /surat/:id/tolak
suratRouter.put(
  '/:id/tolak',
  authorizePermission('SURAT_APPROVE'),
  validate(tolakSuratSchema),
  tolakSuratController,
);

// GET /surat/:id/download — owner or approvers
suratRouter.get(
  '/:id/download',
  validate(suratIdParamSchema),
  authorizeOwnerOr(['ADMIN', 'KETUA_RT'], ownerFromId),
  downloadSuratController,
);
