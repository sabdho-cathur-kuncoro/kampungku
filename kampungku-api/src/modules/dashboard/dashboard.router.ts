import { Router } from 'express';
import {
  getStatsController,
  getDemografiController,
  getKeuanganController,
} from './dashboard.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorizePermission } from '../../middlewares/rbac.middleware';
import { tenantScope } from '../../middlewares/tenant.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { keuanganQuerySchema } from './dashboard.schema';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, tenantScope, authorizePermission('DASHBOARD_STATS'));

dashboardRouter.get('/stats', getStatsController);
dashboardRouter.get('/demografi', getDemografiController);
dashboardRouter.get('/keuangan', validate(keuanganQuerySchema), getKeuanganController);
