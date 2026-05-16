import { Router } from 'express';
import { registerController } from './auth.controller';
import { validate } from '../../middlewares/validate.middleware';
import { registerSchema } from './auth.schema';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), registerController);
