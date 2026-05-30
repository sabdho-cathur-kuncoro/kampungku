import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';
import { successResponse } from '../../utils/response';

export const getStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await dashboardService.getStats(req.tenantId!);
    res.status(200).json(successResponse('Statistik dashboard berhasil diambil', data));
  } catch (err) {
    next(err);
  }
};

export const getDemografiController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await dashboardService.getDemografi(req.tenantId!);
    res.status(200).json(successResponse('Data demografi berhasil diambil', data));
  } catch (err) {
    next(err);
  }
};

export const getKeuanganController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tahun = req.query.tahun ? Number(req.query.tahun) : undefined;
    const data = await dashboardService.getKeuangan(req.tenantId!, tahun);
    res.status(200).json(successResponse('Data keuangan dashboard berhasil diambil', data));
  } catch (err) {
    next(err);
  }
};
