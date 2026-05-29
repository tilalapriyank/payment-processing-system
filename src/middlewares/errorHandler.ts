import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  expose?: boolean;
}

export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(err);

  const status = err.status ?? err.statusCode ?? 500;
  const message = err.expose ? err.message : 'Internal Server Error';

  res.status(status).json({ error: message });
}
