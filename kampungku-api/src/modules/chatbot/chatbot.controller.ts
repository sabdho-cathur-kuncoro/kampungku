import { Request, Response, NextFunction } from 'express';
import { chatbotService } from './chatbot.service';
import { successResponse } from '../../utils/response';

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const tenantId = req.tenantId!;
    const { message } = req.body as { message: string };

    const result = await chatbotService.send(userId, tenantId, message);
    return res.status(200).json(successResponse('Pesan berhasil diproses', result));
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const tenantId = req.tenantId!;
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const result = await chatbotService.getHistory(userId, tenantId, limit);
    return res.status(200).json(successResponse('Riwayat percakapan berhasil diambil', result));
  } catch (error) {
    next(error);
  }
};

export const clearHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const tenantId = req.tenantId!;

    await chatbotService.clearHistory(userId, tenantId);
    return res.status(200).json(successResponse('Riwayat percakapan berhasil dihapus'));
  } catch (error) {
    next(error);
  }
};
