import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { sendError } from '../utils/response.js';
import { isProd } from '../config/env.js';

/** 404 for unknown /api routes. */
export const notFound = (req, _res, next) => {
  next(ApiError.notFound('ROUTE_NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`));
};

/** Maps known error types to an ApiError. */
function normalize(err) {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return ApiError.badRequest('VALIDATION_ERROR', 'Invalid request data', details);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return ApiError.badRequest('VALIDATION_ERROR', 'Invalid data', details);
  }

  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest('INVALID_ID', `Invalid value for ${err.path}`);
  }

  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    return ApiError.conflict('DUPLICATE_KEY', `A record with this ${field} already exists`);
  }

  if (err?.name === 'JsonWebTokenError') return ApiError.unauthorized('TOKEN_INVALID', 'Invalid token');
  if (err?.name === 'TokenExpiredError') return ApiError.unauthorized('TOKEN_EXPIRED', 'Token expired');

  if (err?.name === 'MulterError') {
    const code = err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR';
    return ApiError.badRequest(code, err.message);
  }

  if (err?.type === 'entity.parse.failed') return ApiError.badRequest('INVALID_JSON', 'Malformed JSON body');
  if (err?.type === 'entity.too.large') return new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body too large');

  return null;
}

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  const apiErr = normalize(err);

  if (!apiErr) {
    console.error('💥 Unhandled error:', err);
    return sendError(res, {
      status: 500,
      code: 'INTERNAL_ERROR',
      message: isProd ? 'Something went wrong' : err?.message || 'Something went wrong',
    });
  }

  if (apiErr.statusCode >= 500) console.error('💥', apiErr);

  return sendError(res, {
    status: apiErr.statusCode,
    code: apiErr.code,
    message: apiErr.message,
    details: apiErr.details,
  });
};
