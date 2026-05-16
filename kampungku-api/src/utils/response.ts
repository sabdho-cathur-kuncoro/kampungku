interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

interface ErrorItem {
  field: string;
  message: string;
}

export const successResponse = (message: string, data?: unknown, meta?: Meta) => ({
  success: true,
  message,
  data: data ?? null,
  ...(meta ? { meta } : {}),
});

export const errorResponse = (message: string, errors?: ErrorItem[]) => ({
  success: false,
  message,
  ...(errors ? { errors } : {}),
});
