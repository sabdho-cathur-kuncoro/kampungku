import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { successResponse } from '../../utils/response';
import type {
  CreateUserInput,
  UpdateProfileInput,
  ChangeRoleInput,
  ChangePasswordInput,
} from './user.schema';

export const listUsersController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { role, isActive, page, limit } = req.query;
    const result = await userService.list(req.tenantId!, {
      role: typeof role === 'string' ? role : undefined,
      isActive: typeof isActive === 'string' ? isActive === 'true' : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    res.status(200).json(successResponse('Daftar user berhasil diambil', result.data, result.meta));
  } catch (err) {
    next(err);
  }
};

export const getUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await userService.getById(req.tenantId!, String(req.params.id));
    res.status(200).json(successResponse('User berhasil diambil', data));
  } catch (err) {
    next(err);
  }
};

export const createUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await userService.create(req.tenantId!, req.body as CreateUserInput);
    res.status(201).json(successResponse('User berhasil dibuat', data));
  } catch (err) {
    next(err);
  }
};

export const updateProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await userService.updateProfile(
      req.tenantId!,
      String(req.params.id),
      req.body as UpdateProfileInput,
    );
    res.status(200).json(successResponse('Profil user berhasil diperbarui', data));
  } catch (err) {
    next(err);
  }
};

export const changeRoleController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await userService.changeRole(
      req.tenantId!,
      String(req.params.id),
      req.body as ChangeRoleInput,
    );
    res.status(200).json(successResponse('Role user berhasil diubah', data));
  } catch (err) {
    next(err);
  }
};

export const changePasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await userService.changePassword(
      req.tenantId!,
      String(req.params.id),
      req.body as ChangePasswordInput,
      req.user!.id,
      req.user!.role,
    );
    res.status(200).json(successResponse('Password berhasil diubah'));
  } catch (err) {
    next(err);
  }
};

export const activateUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await userService.setActive(req.tenantId!, String(req.params.id), true);
    res.status(200).json(successResponse('User berhasil diaktifkan', data));
  } catch (err) {
    next(err);
  }
};

export const deactivateUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await userService.setActive(req.tenantId!, String(req.params.id), false);
    res.status(200).json(successResponse('User berhasil dinonaktifkan', data));
  } catch (err) {
    next(err);
  }
};

export const deleteUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await userService.delete(req.tenantId!, String(req.params.id), req.user!.id);
    res.status(200).json(successResponse('User berhasil dihapus'));
  } catch (err) {
    next(err);
  }
};
