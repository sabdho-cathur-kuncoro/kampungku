import { Request, Response, NextFunction } from 'express';
import type { StatusTinggal } from '@prisma/client';
import { wargaService } from './warga.service';
import { successResponse } from '../../utils/response';
import { streamWargaXlsx, streamWargaPDF } from '../../utils/exportWarga';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import type { CreateWargaInput, UpdateWargaInput, CreateKeluargaInput, UpdateKeluargaInput } from './warga.schema';

export const listWargaController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { search, status, page, limit } = req.query;
    const result = await wargaService.list(req.tenantId!, {
      search: typeof search === 'string' ? search : undefined,
      status: typeof status === 'string' ? (status as StatusTinggal) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    res.status(200).json(successResponse('Daftar warga berhasil diambil', result.data, result.meta));
  } catch (err) {
    next(err);
  }
};

export const getWargaController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await wargaService.getById(req.tenantId!, String(req.params.id));
    res.status(200).json(successResponse('Data warga berhasil diambil', data));
  } catch (err) {
    next(err);
  }
};

export const createWargaController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await wargaService.create(req.tenantId!, req.body as CreateWargaInput);
    res.status(201).json(successResponse('Warga berhasil ditambahkan', data));
  } catch (err) {
    next(err);
  }
};

export const updateWargaController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await wargaService.update(
      req.tenantId!,
      String(req.params.id),
      req.body as UpdateWargaInput,
    );
    res.status(200).json(successResponse('Data warga berhasil diupdate', data));
  } catch (err) {
    next(err);
  }
};

export const deleteWargaController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await wargaService.delete(req.tenantId!, String(req.params.id));
    res.status(200).json(successResponse('Warga berhasil dihapus'));
  } catch (err) {
    next(err);
  }
};

export const listKeluargaController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await wargaService.listKeluarga(req.tenantId!, String(req.params.id));
    res.status(200).json(successResponse('Daftar anggota keluarga berhasil diambil', data));
  } catch (err) {
    next(err);
  }
};

export const addKeluargaController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await wargaService.addKeluarga(
      req.tenantId!,
      String(req.params.id),
      req.body as CreateKeluargaInput,
    );
    res.status(201).json(successResponse('Anggota keluarga berhasil ditambahkan', data));
  } catch (err) {
    next(err);
  }
};

export const updateKeluargaController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await wargaService.updateKeluarga(
      req.tenantId!,
      String(req.params.id),
      String(req.params.kid),
      req.body as UpdateKeluargaInput,
    );
    res.status(200).json(successResponse('Anggota keluarga berhasil diupdate', data));
  } catch (err) {
    next(err);
  }
};

export const deleteKeluargaController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await wargaService.deleteKeluarga(
      req.tenantId!,
      String(req.params.id),
      String(req.params.kid),
    );
    res.status(200).json(successResponse('Anggota keluarga berhasil dihapus'));
  } catch (err) {
    next(err);
  }
};

export const exportWargaController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const format = typeof req.query.format === 'string' ? req.query.format : 'xlsx';
    if (format !== 'pdf' && format !== 'xlsx') {
      throw new AppError('Format tidak valid. Gunakan ?format=pdf atau ?format=xlsx', 400);
    }

    const status =
      typeof req.query.status === 'string' ? (req.query.status as StatusTinggal) : undefined;

    const [rows, rt] = await Promise.all([
      wargaService.exportAll(req.tenantId!, status),
      prisma.rT.findUnique({ where: { id: req.tenantId! }, select: { nama: true } }),
    ]);

    const namaRT = rt?.nama ?? 'RT';

    if (format === 'xlsx') {
      await streamWargaXlsx(res, rows, namaRT);
    } else {
      streamWargaPDF(res, rows, namaRT);
    }
  } catch (err) {
    next(err);
  }
};
