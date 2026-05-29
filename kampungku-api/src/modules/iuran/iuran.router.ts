import { Router } from 'express';
import type { Request } from 'express';
import {
  listIuranController,
  getByWargaController,
  listTunggakanController,
  createTagihanController,
  bayarController,
  verifikasiController,
  getLaporanController,
} from './iuran.controller';
import { iuranService } from './iuran.service';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorizePermission, authorizeOwnerOr } from '../../middlewares/rbac.middleware';
import { tenantScope } from '../../middlewares/tenant.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  listIuranQuerySchema,
  iuranIdParamSchema,
  wargaParamSchema,
  createTagihanSchema,
  bayarSchema,
  verifikasiSchema,
  laporanQuerySchema,
} from './iuran.schema';

export const iuranRouter = Router();

iuranRouter.use(authenticate, tenantScope);

const ownerFromWargaId = (req: Request) =>
  iuranService.getOwnerUserIdByWargaId(req.tenantId!, String(req.params.wargaId));

// Static sub-paths must come before /:id to avoid route shadowing
// GET /iuran/tunggakan
iuranRouter.get('/tunggakan', authorizePermission('IURAN_MANAGE'), listTunggakanController);

// GET /iuran/laporan
iuranRouter.get(
  '/laporan',
  authorizePermission('IURAN_MANAGE'),
  validate(laporanQuerySchema),
  getLaporanController,
);

// GET /iuran/warga/:wargaId — owner or management roles
iuranRouter.get(
  '/warga/:wargaId',
  validate(wargaParamSchema),
  authorizeOwnerOr(['ADMIN', 'BENDAHARA', 'KETUA_RT', 'SEKRETARIS'], ownerFromWargaId),
  getByWargaController,
);

// GET /iuran
iuranRouter.get(
  '/',
  authorizePermission('IURAN_MANAGE'),
  validate(listIuranQuerySchema),
  listIuranController,
);

// POST /iuran/tagihan
iuranRouter.post(
  '/tagihan',
  authorizePermission('IURAN_MANAGE'),
  validate(createTagihanSchema),
  createTagihanController,
);

// POST /iuran/bayar — all roles (ownership check inside service)
iuranRouter.post(
  '/bayar',
  authorizePermission('IURAN_PAY_SELF'),
  validate(bayarSchema),
  bayarController,
);

// PUT /iuran/:id/verifikasi
iuranRouter.put(
  '/:id/verifikasi',
  validate(iuranIdParamSchema),
  authorizePermission('IURAN_MANAGE'),
  validate(verifikasiSchema),
  verifikasiController,
);
