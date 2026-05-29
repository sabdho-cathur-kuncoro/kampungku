import { Request, Response, NextFunction } from 'express';
import { tenantService } from './tenant.service';
import { successResponse } from '../../utils/response';
import type { CreateTenantInput, UpdateTenantInput } from './tenant.schema';

export const listTenantsController = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await tenantService.list();
    res.status(200).json(successResponse('Daftar tenant berhasil diambil', data));
  } catch (error) {
    next(error);
  }
};

export const getTenantController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await tenantService.getById(String(req.params.id));
    res.status(200).json(successResponse('Tenant berhasil diambil', data));
  } catch (error) {
    next(error);
  }
};

export const createTenantController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await tenantService.create(req.body as CreateTenantInput);
    res.status(201).json(successResponse('Tenant berhasil dibuat', data));
  } catch (error) {
    next(error);
  }
};

export const updateTenantController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await tenantService.update(String(req.params.id), req.body as UpdateTenantInput);
    res.status(200).json(successResponse('Tenant berhasil diupdate', data));
  } catch (error) {
    next(error);
  }
};

export const activateTenantController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await tenantService.setActive(String(req.params.id), true);
    res.status(200).json(successResponse('Tenant diaktifkan', data));
  } catch (error) {
    next(error);
  }
};

export const deactivateTenantController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await tenantService.setActive(String(req.params.id), false);
    res.status(200).json(successResponse('Tenant dinonaktifkan', data));
  } catch (error) {
    next(error);
  }
};

export const listUsersController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tenantId = typeof req.query.tenantId === 'string' ? req.query.tenantId : undefined;
    const data = await tenantService.listUsers(tenantId);
    res.status(200).json(successResponse('Daftar user berhasil diambil', data));
  } catch (error) {
    next(error);
  }
};
