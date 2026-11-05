import { ApiError } from '../utils/ApiError.js';

/**
 * validate(zodSchema) — parses req.body (or 'params' / 'query') and replaces it with the parsed value.
 * On failure responds 400 VALIDATION_ERROR with field errors as `details`.
 */
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return next(ApiError.badRequest('VALIDATION_ERROR', 'Invalid request data', details));
    }

    if (source === 'query') {
      // Express 5 exposes req.query as a getter, so store the parsed copy separately.
      req.validatedQuery = result.data;
    } else {
      req[source] = result.data;
    }
    next();
  };
