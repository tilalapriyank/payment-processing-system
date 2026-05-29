import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import { HttpError } from '../utils/httpError';

interface HttpErrorLike extends Error {
  status?: number;
  statusCode?: number;
  expose?: boolean;
}

export function errorHandler(
  err: HttpErrorLike,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(err);

  const status =
    err instanceof HttpError ? err.status : (err.status ?? err.statusCode ?? 500);
  const message =
    err instanceof HttpError && err.expose
      ? err.message
      : err.expose
        ? err.message
        : 'Internal Server Error';

  res.status(status).json({ error: message });
}
