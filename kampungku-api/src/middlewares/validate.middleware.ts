import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

type AnyZodSchema = z.ZodTypeAny;

export const validate = (schema: AnyZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const errors = result.error.issues.map((issue: z.ZodIssue) => ({
        field: issue.path.slice(1).join('.'),
        message: issue.message,
      }));
      res.status(400).json(errorResponse('Validasi gagal', errors));
      return;
    }

    next();
  };
