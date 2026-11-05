/**
 * Operational error with an HTTP status and a stable error `code`.
 * The frontend translates `code` via the `errors` i18n namespace (e.g. errors:INVITE_EXPIRED).
 */
export class ApiError extends Error {
  constructor(statusCode, code, message, details) {
    super(message || code);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    if (details !== undefined) this.details = details;
  }

  static badRequest(code = 'BAD_REQUEST', message = 'Bad request', details) {
    return new ApiError(400, code, message, details);
  }

  static unauthorized(code = 'UNAUTHORIZED', message = 'Authentication required') {
    return new ApiError(401, code, message);
  }

  static forbidden(code = 'FORBIDDEN', message = 'You do not have permission to do this') {
    return new ApiError(403, code, message);
  }

  static notFound(code = 'NOT_FOUND', message = 'Resource not found') {
    return new ApiError(404, code, message);
  }

  static conflict(code = 'CONFLICT', message = 'Conflict') {
    return new ApiError(409, code, message);
  }

  static internal(code = 'INTERNAL_ERROR', message = 'Something went wrong') {
    return new ApiError(500, code, message);
  }
}
