import { Router } from 'express';
import {
  listTenantsController,
  getTenantController,
  createTenantController,
  updateTenantController,
  activateTenantController,
  deactivateTenantController,
  listUsersController,
} from './tenant.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createTenantSchema,
  updateTenantSchema,
  tenantIdParamSchema,
  listUsersQuerySchema,
} from './tenant.schema';

export const adminRouter = Router();

// All routes require SUPER_ADMIN. By design these are cross-tenant —
// they bypass the tenantScope middleware that scopes the rest of the API.
adminRouter.use(authenticate, authorize('SUPER_ADMIN'));

adminRouter.get('/tenants', listTenantsController);
adminRouter.get('/tenants/:id', validate(tenantIdParamSchema), getTenantController);
adminRouter.post('/tenants', validate(createTenantSchema), createTenantController);
adminRouter.put('/tenants/:id', validate(updateTenantSchema), updateTenantController);
adminRouter.put(
  '/tenants/:id/activate',
  validate(tenantIdParamSchema),
  activateTenantController,
);
adminRouter.put(
  '/tenants/:id/deactivate',
  validate(tenantIdParamSchema),
  deactivateTenantController,
);

adminRouter.get('/users', validate(listUsersQuerySchema), listUsersController);
