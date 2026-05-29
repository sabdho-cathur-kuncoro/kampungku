import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { successResponse } from '../../utils/response';
import { AppError } from '../../utils/errors';
import type { RegisterInput, LoginInput, RefreshTokenInput, LogoutInput } from './auth.schema';

/**
 * Register requires authenticated context — SUPER_ADMIN provisioning,
 * or existing tenant ADMIN adding a user to their own tenant.
 * tenantId source priority:
 *   1. SUPER_ADMIN  → X-Tenant-Id header / ?tenantId= query (explicit)
 *   2. Other roles  → req.user.tenantId (their own tenant)
 */
export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Registrasi memerlukan autentikasi (tenant context)', 401);
    }

    let tenantId: string | undefined;
    if (req.user.role === 'SUPER_ADMIN') {
      const headerTenant = req.header('X-Tenant-Id');
      const queryTenant = typeof req.query.tenantId === 'string' ? req.query.tenantId : undefined;
      tenantId = headerTenant ?? queryTenant;
      if (!tenantId) {
        throw new AppError(
          'SUPER_ADMIN harus menyertakan tenantId via X-Tenant-Id atau ?tenantId=',
          400,
        );
      }
    } else {
      if (!req.user.tenantId) {
        throw new AppError('User tidak terhubung ke tenant', 403);
      }
      tenantId = req.user.tenantId;
    }

    const data = await authService.register(req.body as RegisterInput, tenantId);
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

export const refreshController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refreshToken } = req.body as RefreshTokenInput;
    const data = await authService.refresh(refreshToken);
    res.status(200).json(successResponse('Token diperbarui', data));
  } catch (error) {
    next(error);
  }
};

export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refreshToken } = req.body as LogoutInput;
    await authService.logout(refreshToken);
    res.status(200).json(successResponse('Logout berhasil'));
  } catch (error) {
    next(error);
  }
};

export const meController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await authService.me(req.user!.id);
    res.status(200).json(successResponse('Data berhasil diambil', data));
  } catch (error) {
    next(error);
  }
};
