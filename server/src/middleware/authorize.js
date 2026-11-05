import { ApiError } from '../utils/ApiError.js';

/** authorize('c2b_admin', 'org_admin') — must run after protect. */
export const authorize =
  (...roles) =>
  (req, _res, next) =>
    req.user && roles.includes(req.user.role) ? next() : next(new ApiError(403, 'FORBIDDEN', 'Not allowed'));
