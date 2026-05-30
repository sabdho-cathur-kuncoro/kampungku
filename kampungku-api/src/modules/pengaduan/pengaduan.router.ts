import { Router } from 'express';
import type { Request } from 'express';
import {
  listPengaduanController,
  getPengaduanController,
  createPengaduanController,
  updateStatusController,
} from './pengaduan.controller';
import { pengaduanService } from './pengaduan.service';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorizePermission, authorizeOwnerOr } from '../../middlewares/rbac.middleware';
import { tenantScope } from '../../middlewares/tenant.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  listPengaduanQuerySchema,
  pengaduanIdParamSchema,
  createPengaduanSchema,
  updateStatusSchema,
} from './pengaduan.schema';

export const pengaduanRouter = Router();

pengaduanRouter.use(authenticate, tenantScope);

const ownerFromId = (req: Request) =>
  pengaduanService.getOwnerUserId(req.tenantId!, String(req.params.id));

// GET /pengaduan — ADMIN, KETUA_RT only
pengaduanRouter.get(
  '/',
  authorizePermission('PENGADUAN_VIEW_ALL'),
  validate(listPengaduanQuerySchema),
  listPengaduanController,
);

// GET /pengaduan/:id — owner (non-anonim) or ADMIN, KETUA_RT
pengaduanRouter.get(
  '/:id',
  validate(pengaduanIdParamSchema),
  authorizeOwnerOr(['ADMIN', 'KETUA_RT'], ownerFromId),
  getPengaduanController,
);

// POST /pengaduan — all roles, anonim supported
pengaduanRouter.post(
  '/',
  authorizePermission('PENGADUAN_CREATE'),
  validate(createPengaduanSchema),
  createPengaduanController,
);

// PUT /pengaduan/:id/status — ADMIN, KETUA_RT
pengaduanRouter.put(
  '/:id/status',
  authorizePermission('PENGADUAN_VIEW_ALL'),
  validate(updateStatusSchema),
  updateStatusController,
);
