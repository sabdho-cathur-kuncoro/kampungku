import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { successResponse } from '../../utils/response';
import type { RegisterInput, LoginInput } from './auth.schema';

export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await authService.register(req.body as RegisterInput);
    res.status(201).json(successResponse('Registrasi berhasil', data));
  } catch (error) {
    next(error);
  }
};

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await authService.login(req.body as LoginInput);
    res.status(200).json(successResponse('Login berhasil', data));
  } catch (error) {
    next(error);
  }
};
