import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';

/** JWT payload: { sub: userId, role, org } (docs/04 §1). */
export function signJwt(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      org: user.organization ? String(user.organization._id ?? user.organization) : null,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );
}

export function verifyJwt(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

/** Unguessable random token (used for invite links). */
export const randomToken = (size = 24) => nanoid(size);
