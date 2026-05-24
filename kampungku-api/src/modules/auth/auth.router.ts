import { Router } from 'express';
import { registerController, loginController, refreshController, logoutController, meController } from './auth.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { registerSchema, loginSchema, refreshTokenSchema, logoutSchema } from './auth.schema';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), registerController);
authRouter.post('/login', validate(loginSchema), loginController);
authRouter.post('/refresh', validate(refreshTokenSchema), refreshController);
authRouter.post('/logout', validate(logoutSchema), logoutController);
authRouter.get('/me', authenticate, meController);
