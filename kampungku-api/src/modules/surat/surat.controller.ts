import { Request, Response, NextFunction } from 'express';
import type { StatusSurat, JenisSurat } from '@prisma/client';
import { suratService } from './surat.service';
import { streamSuratPDF } from '../../utils/generatePDF';
import { successResponse } from '../../utils/response';
import type { AjukanSuratInput, TolakSuratInput } from './surat.schema';

export const listSuratController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, jenisSurat, page, limit } = req.query;
    const result = await suratService.list(req.tenantId!, {
      status: typeof status === 'string' ? (status as StatusSurat) : undefined,
      jenisSurat: typeof jenisSurat === 'string' ? (jenisSurat as JenisSurat) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    res.status(200).json(successResponse('Daftar permohonan surat berhasil diambil', result.data, result.meta));
  } catch (err) {
    next(err);
  }
};

export const listSayaController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, jenisSurat, page, limit } = req.query;
    const result = await suratService.listSaya(req.tenantId!, req.user!.id, {
      status: typeof status === 'string' ? (status as StatusSurat) : undefined,
      jenisSurat: typeof jenisSurat === 'string' ? (jenisSurat as JenisSurat) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    res.status(200).json(successResponse('Daftar permohonan surat saya berhasil diambil', result.data, result.meta));
  } catch (err) {
    next(err);
  }
};

export const getSuratController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await suratService.getById(req.tenantId!, String(req.params.id));
    res.status(200).json(successResponse('Permohonan surat berhasil diambil', data));
  } catch (err) {
    next(err);
  }
};

export const ajukanSuratController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await suratService.ajukan(
      req.tenantId!,
      req.user!.id,
      req.body as AjukanSuratInput,
    );
    res.status(201).json(successResponse('Permohonan surat berhasil diajukan', data));
  } catch (err) {
    next(err);
  }
};

export const approveSuratController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await suratService.approve(req.tenantId!, String(req.params.id), req.user!.id);
    res.status(200).json(successResponse('Permohonan surat berhasil disetujui', data));
  } catch (err) {
    next(err);
  }
};

export const tolakSuratController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await suratService.tolak(
      req.tenantId!,
      String(req.params.id),
      req.user!.id,
      req.body as TolakSuratInput,
    );
    res.status(200).json(successResponse('Permohonan surat berhasil ditolak', data));
  } catch (err) {
    next(err);
  }
};

export const downloadSuratController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const surat = await suratService.getForDownload(req.tenantId!, String(req.params.id));
    streamSuratPDF(res, {
      noSurat: surat.noSurat!,
      jenisSurat: surat.jenisSurat,
      namaWarga: surat.warga.user.name,
      nik: surat.warga.nik,
      alamat: surat.warga.alamat,
      keperluan: surat.keperluan,
      namaRT: surat.tenant.nama,
      tglDiproses: surat.tglDiproses!,
    });
  } catch (err) {
    next(err);
  }
};
