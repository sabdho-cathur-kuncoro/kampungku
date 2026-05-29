import { Request, Response, NextFunction } from 'express';
import type { StatusIuran } from '@prisma/client';
import { iuranService } from './iuran.service';
import { successResponse } from '../../utils/response';
import type { CreateTagihanInput, BayarInput, VerifikasiInput } from './iuran.schema';

export const listIuranController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { bulan, tahun, status } = req.query;
    const data = await iuranService.list(req.tenantId!, {
      bulan: bulan ? Number(bulan) : undefined,
      tahun: tahun ? Number(tahun) : undefined,
      status: typeof status === 'string' ? (status as StatusIuran) : undefined,
    });
    res.status(200).json(successResponse('Daftar tagihan berhasil diambil', data));
  } catch (err) {
    next(err);
  }
};

export const getByWargaController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await iuranService.getByWarga(req.tenantId!, String(req.params.wargaId));
    res.status(200).json(successResponse('Tagihan warga berhasil diambil', data));
  } catch (err) {
    next(err);
  }
};

export const listTunggakanController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await iuranService.getTunggakan(req.tenantId!);
    res.status(200).json(successResponse('Daftar tunggakan berhasil diambil', data));
  } catch (err) {
    next(err);
  }
};

export const createTagihanController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await iuranService.createTagihan(
      req.tenantId!,
      req.body as CreateTagihanInput,
    );
    res.status(201).json(successResponse('Tagihan berhasil dibuat', data));
  } catch (err) {
    next(err);
  }
};

export const bayarController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await iuranService.bayar(req.tenantId!, req.body as BayarInput, {
      id: req.user!.id,
      role: req.user!.role,
    });
    res.status(200).json(successResponse('Pembayaran berhasil dikonfirmasi', data));
  } catch (err) {
    next(err);
  }
};

export const verifikasiController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await iuranService.verifikasi(
      req.tenantId!,
      String(req.params.id),
      req.body as VerifikasiInput,
      req.user!.id,
    );
    res.status(200).json(successResponse('Verifikasi berhasil', data));
  } catch (err) {
    next(err);
  }
};

export const getLaporanController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { bulan, tahun } = req.query;
    const data = await iuranService.getLaporan(req.tenantId!, {
      bulan: bulan ? Number(bulan) : undefined,
      tahun: tahun ? Number(tahun) : undefined,
    });
    res.status(200).json(successResponse('Laporan iuran berhasil diambil', data));
  } catch (err) {
    next(err);
  }
};
