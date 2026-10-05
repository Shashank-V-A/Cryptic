import crypto from 'node:crypto';
import { loadApiConfig } from '@vda-ledger/config';
import { AppError } from '../lib/errors.js';

const config = loadApiConfig();
export const CSRF_COOKIE = 'vda_csrf';
const CSRF_HEADER = 'x-csrf-token';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function getCsrfCookieOptions() {
  return {
    httpOnly: false,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite === 'none' ? 'none' : config.cookieSameSite || 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24,
  };
}

export function setCsrfCookie(res, token = generateCsrfToken()) {
  res.cookie(CSRF_COOKIE, token, getCsrfCookieOptions());
  return token;
}

export function csrfProtection(req, res, next) {
  if (!config.csrfEnabled) {
    return next();
  }
  if (!STATE_CHANGING.has(req.method)) {
    return next();
  }
  if (req.path.startsWith('/api/health')) {
    return next();
  }
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(
      new AppError('Invalid or missing CSRF token', { status: 403, code: 'CSRF_INVALID' }),
    );
  }
  return next();
}
