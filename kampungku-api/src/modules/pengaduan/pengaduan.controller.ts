import { Request, Response, NextFunction } from 'express';
import type { StatusPengaduan } from '@prisma/client';
import { pengaduanService } from './pengaduan.service';
import { successResponse } from '../../utils/response';
import type { CreatePengaduanInput, UpdateStatusInput } from './pengaduan.schema';

export const listPengaduanController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, page, limit } = req.query;
    const result = await pengaduanService.list(req.tenantId!, {
      status: typeof status === 'string' ? (status as StatusPengaduan) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    res.status(200).json(successResponse('Daftar pengaduan berhasil diambil', result.data, result.meta));
  } catch (err) {
    next(err);
  }
};

export const getPengaduanController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await pengaduanService.getById(req.tenantId!, String(req.params.id));
    res.status(200).json(successResponse('Pengaduan berhasil diambil', data));
  } catch (err) {
    next(err);
  }
};

export const createPengaduanController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await pengaduanService.create(
      req.tenantId!,
      req.user!.id,
      req.body as CreatePengaduanInput,
    );
    res.status(201).json(successResponse('Pengaduan berhasil dibuat', data));
  } catch (err) {
    next(err);
  }
};

export const updateStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await pengaduanService.updateStatus(
      req.tenantId!,
      String(req.params.id),
      req.body as UpdateStatusInput,
    );
    res.status(200).json(successResponse('Status pengaduan berhasil diperbarui', data));
  } catch (err) {
    next(err);
  }
};
