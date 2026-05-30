import { Router } from 'express';
import {
  listJenisIuranController,
  getJenisIuranController,
  createJenisIuranController,
  updateJenisIuranController,
  deleteJenisIuranController,
} from './jenis-iuran.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorizePermission } from '../../middlewares/rbac.middleware';
import { tenantScope } from '../../middlewares/tenant.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  listJenisIuranQuerySchema,
  jenisIuranIdParamSchema,
  createJenisIuranSchema,
  updateJenisIuranSchema,
} from './jenis-iuran.schema';

export const jenisIuranRouter = Router();

jenisIuranRouter.use(authenticate, tenantScope);

// GET /jenis-iuran — all authenticated users (needed when submitting tagihan)
jenisIuranRouter.get('/', validate(listJenisIuranQuerySchema), listJenisIuranController);

// GET /jenis-iuran/:id
jenisIuranRouter.get('/:id', validate(jenisIuranIdParamSchema), getJenisIuranController);

// POST /jenis-iuran — ADMIN, BENDAHARA
jenisIuranRouter.post(
  '/',
  authorizePermission('IURAN_MANAGE'),
  validate(createJenisIuranSchema),
  createJenisIuranController,
);

// PUT /jenis-iuran/:id — ADMIN, BENDAHARA
jenisIuranRouter.put(
  '/:id',
  authorizePermission('IURAN_MANAGE'),
  validate(updateJenisIuranSchema),
  updateJenisIuranController,
);

// DELETE /jenis-iuran/:id — ADMIN, BENDAHARA (blocked if tagihan exist)
jenisIuranRouter.delete(
  '/:id',
  validate(jenisIuranIdParamSchema),
  authorizePermission('IURAN_MANAGE'),
  deleteJenisIuranController,
);
