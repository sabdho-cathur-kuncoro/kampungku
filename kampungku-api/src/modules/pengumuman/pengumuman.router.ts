import { Router } from 'express';
import type { Request } from 'express';
import {
  listPengumumanController,
  getPengumumanController,
  createPengumumanController,
  updatePengumumanController,
  deletePengumumanController,
} from './pengumuman.controller';
import { pengumumanService } from './pengumuman.service';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorizePermission, authorizeOwnerOr } from '../../middlewares/rbac.middleware';
import { tenantScope } from '../../middlewares/tenant.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  listPengumumanQuerySchema,
  pengumumanIdParamSchema,
  createPengumumanSchema,
  updatePengumumanSchema,
} from './pengumuman.schema';

export const pengumumanRouter = Router();

pengumumanRouter.use(authenticate, tenantScope);

const ownerFromId = (req: Request) =>
  pengumumanService.getAuthorId(req.tenantId!, String(req.params.id));

// GET /pengumuman
pengumumanRouter.get('/', validate(listPengumumanQuerySchema), listPengumumanController);

// GET /pengumuman/:id
pengumumanRouter.get(
  '/:id',
  validate(pengumumanIdParamSchema),
  getPengumumanController,
);

// POST /pengumuman
pengumumanRouter.post(
  '/',
  authorizePermission('PENGUMUMAN_CREATE'),
  validate(createPengumumanSchema),
  createPengumumanController,
);

// PUT /pengumuman/:id — author or allowed roles
pengumumanRouter.put(
  '/:id',
  authorizeOwnerOr(['ADMIN', 'KETUA_RT', 'SEKRETARIS'], ownerFromId),
  validate(updatePengumumanSchema),
  updatePengumumanController,
);

// DELETE /pengumuman/:id — author or allowed roles
pengumumanRouter.delete(
  '/:id',
  validate(pengumumanIdParamSchema),
  authorizeOwnerOr(['ADMIN', 'KETUA_RT', 'SEKRETARIS'], ownerFromId),
  deletePengumumanController,
);
