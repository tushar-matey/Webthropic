import type { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (!isProduction || statusCode >= 500) {
    console.error('[ErrorMiddleware] Exception caught:', err);
  }

  res.status(statusCode).json({
    success: false,
    message: isProduction && statusCode === 500 ? 'An unexpected error occurred' : message,
    ...(isProduction ? {} : { stack: err.stack })
  });
}
