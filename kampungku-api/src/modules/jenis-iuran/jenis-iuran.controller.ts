import { Request, Response, NextFunction } from 'express';
import { jenisIuranService } from './jenis-iuran.service';
import { successResponse } from '../../utils/response';
import type { CreateJenisIuranInput, UpdateJenisIuranInput } from './jenis-iuran.schema';

export const listJenisIuranController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const aktif =
      typeof req.query.aktif === 'string' ? req.query.aktif === 'true' : undefined;
    const data = await jenisIuranService.list(req.tenantId!, aktif);
    res.status(200).json(successResponse('Daftar jenis iuran berhasil diambil', data));
  } catch (err) {
    next(err);
  }
};

export const getJenisIuranController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await jenisIuranService.getById(req.tenantId!, String(req.params.id));
    res.status(200).json(successResponse('Jenis iuran berhasil diambil', data));
  } catch (err) {
    next(err);
  }
};

export const createJenisIuranController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await jenisIuranService.create(
      req.tenantId!,
      req.body as CreateJenisIuranInput,
    );
    res.status(201).json(successResponse('Jenis iuran berhasil dibuat', data));
  } catch (err) {
    next(err);
  }
};

export const updateJenisIuranController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await jenisIuranService.update(
      req.tenantId!,
      String(req.params.id),
      req.body as UpdateJenisIuranInput,
    );
    res.status(200).json(successResponse('Jenis iuran berhasil diperbarui', data));
  } catch (err) {
    next(err);
  }
};

export const deleteJenisIuranController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await jenisIuranService.delete(req.tenantId!, String(req.params.id));
    res.status(200).json(successResponse('Jenis iuran berhasil dihapus'));
  } catch (err) {
    next(err);
  }
};
