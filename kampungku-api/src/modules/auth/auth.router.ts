import { Router } from 'express';
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
  meController,
} from './auth.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { registerSchema, loginSchema, refreshTokenSchema, logoutSchema } from './auth.schema';

export const authRouter = Router();

// Register requires existing authenticated context (no public self-signup).
// SUPER_ADMIN auto-bypasses; only ADMIN needs to be listed explicitly.
authRouter.post(
  '/register',
  authenticate,
  authorize('ADMIN'),
  validate(registerSchema),
  registerController,
);
authRouter.post('/login', validate(loginSchema), loginController);
authRouter.post('/refresh', validate(refreshTokenSchema), refreshController);
authRouter.post('/logout', validate(logoutSchema), logoutController);
authRouter.get('/me', authenticate, meController);
