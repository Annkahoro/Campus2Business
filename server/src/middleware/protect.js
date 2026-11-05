import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyJwt } from '../utils/tokens.js';
import { asyncHandler } from './asyncHandler.js';

const bearerToken = (req) => {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  return scheme === 'Bearer' && token ? token : null;
};

/** Verifies the Bearer JWT, loads the active user and attaches it as req.user. */
export const protect = asyncHandler(async (req, _res, next) => {
  const token = bearerToken(req);
  if (!token) throw ApiError.unauthorized('UNAUTHORIZED', 'Authentication required');

  const payload = verifyJwt(token); // throws JsonWebTokenError / TokenExpiredError → errorHandler → 401

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('UNAUTHORIZED', 'User no longer exists');
  if (!user.isActive) throw ApiError.unauthorized('ACCOUNT_DISABLED', 'This account has been disabled');

  req.user = user;
  next();
});

/**
 * For public routes whose response depends on who is asking (e.g. admins may preview drafts).
 * Attaches req.user when a valid token is sent; otherwise continues as a guest. Never fails.
 */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = bearerToken(req);
  if (token) {
    try {
      const payload = verifyJwt(token);
      const user = await User.findById(payload.sub);
      if (user?.isActive) req.user = user;
    } catch {
      /* invalid/expired token → treat as guest */
    }
  }
  next();
});
