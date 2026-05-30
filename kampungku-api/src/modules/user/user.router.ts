import { Router } from 'express';
import type { Request } from 'express';
import {
  listUsersController,
  getUserController,
  createUserController,
  updateProfileController,
  changeRoleController,
  changePasswordController,
  activateUserController,
  deactivateUserController,
  deleteUserController,
} from './user.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorizePermission, authorizeOwnerOr } from '../../middlewares/rbac.middleware';
import { tenantScope } from '../../middlewares/tenant.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  listUsersQuerySchema,
  userIdParamSchema,
  createUserSchema,
  updateProfileSchema,
  changeRoleSchema,
  changePasswordSchema,
} from './user.schema';

export const userRouter = Router();

userRouter.use(authenticate, tenantScope);

const selfOrAdmin = (req: Request) =>
  Promise.resolve(req.user!.id === String(req.params.id) ? req.user!.id : null);

// GET /users — ADMIN
userRouter.get(
  '/',
  authorizePermission('USER_MANAGE_TENANT'),
  validate(listUsersQuerySchema),
  listUsersController,
);

// GET /users/:id — ADMIN or self
userRouter.get(
  '/:id',
  validate(userIdParamSchema),
  authorizeOwnerOr(['ADMIN'], selfOrAdmin),
  getUserController,
);

// POST /users — ADMIN
userRouter.post(
  '/',
  authorizePermission('USER_MANAGE_TENANT'),
  validate(createUserSchema),
  createUserController,
);

// PUT /users/:id — ADMIN or self (profile only: name, phone)
userRouter.put(
  '/:id',
  authorizeOwnerOr(['ADMIN'], selfOrAdmin),
  validate(updateProfileSchema),
  updateProfileController,
);

// PUT /users/:id/role — ADMIN only
userRouter.put(
  '/:id/role',
  validate(userIdParamSchema),
  authorizePermission('USER_MANAGE_TENANT'),
  validate(changeRoleSchema),
  changeRoleController,
);

// PUT /users/:id/password — self (requires oldPassword) or ADMIN (reset, no oldPassword)
userRouter.put(
  '/:id/password',
  authorizeOwnerOr(['ADMIN'], selfOrAdmin),
  validate(changePasswordSchema),
  changePasswordController,
);

// PUT /users/:id/activate — ADMIN
userRouter.put(
  '/:id/activate',
  validate(userIdParamSchema),
  authorizePermission('USER_MANAGE_TENANT'),
  activateUserController,
);

// PUT /users/:id/deactivate — ADMIN
userRouter.put(
  '/:id/deactivate',
  validate(userIdParamSchema),
  authorizePermission('USER_MANAGE_TENANT'),
  deactivateUserController,
);

// DELETE /users/:id — ADMIN (hard delete; blocked if self)
userRouter.delete(
  '/:id',
  validate(userIdParamSchema),
  authorizePermission('USER_MANAGE_TENANT'),
  deleteUserController,
);
