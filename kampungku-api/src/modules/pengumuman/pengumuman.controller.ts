import { Request, Response, NextFunction } from 'express';
import type { KategoriPengumuman } from '@prisma/client';
import { pengumumanService } from './pengumuman.service';
import { successResponse } from '../../utils/response';
import type { CreatePengumumanInput, UpdatePengumumanInput } from './pengumuman.schema';

export const listPengumumanController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { kategori, isPinned, page, limit } = req.query;
    const result = await pengumumanService.list(req.tenantId!, {
      kategori: typeof kategori === 'string' ? (kategori as KategoriPengumuman) : undefined,
      isPinned: typeof isPinned === 'string' ? isPinned === 'true' : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    res.status(200).json(successResponse('Daftar pengumuman berhasil diambil', result.data, result.meta));
  } catch (err) {
    next(err);
  }
};

export const getPengumumanController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await pengumumanService.getById(req.tenantId!, String(req.params.id));
    res.status(200).json(successResponse('Pengumuman berhasil diambil', data));
  } catch (err) {
    next(err);
  }
};

export const createPengumumanController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await pengumumanService.create(
      req.tenantId!,
      req.user!.id,
      req.body as CreatePengumumanInput,
    );
    res.status(201).json(successResponse('Pengumuman berhasil dibuat', data));
  } catch (err) {
    next(err);
  }
};

export const updatePengumumanController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await pengumumanService.update(
      req.tenantId!,
      String(req.params.id),
      req.body as UpdatePengumumanInput,
    );
    res.status(200).json(successResponse('Pengumuman berhasil diupdate', data));
  } catch (err) {
    next(err);
  }
};

export const deletePengumumanController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await pengumumanService.delete(req.tenantId!, String(req.params.id));
    res.status(200).json(successResponse('Pengumuman berhasil dihapus'));
  } catch (err) {
    next(err);
  }
};
