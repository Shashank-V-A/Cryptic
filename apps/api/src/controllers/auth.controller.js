import { ZodError } from 'zod';
import { authService } from '../services/auth.service.js';
import {
  COOKIE_NAME,
  getSessionCookieOptions,
} from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { loadApiConfig } from '@vda-ledger/config';

const config = loadApiConfig();

function mapZod(err) {
  return new AppError('Validation failed', {
    status: 400,
    code: 'VALIDATION_ERROR',
    details: err.flatten(),
  });
}

export const authController = {
  signup: asyncHandler(async (req, res) => {
    try {
      const result = await authService.signup(req.body, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      res.cookie(COOKIE_NAME, result.token, getSessionCookieOptions(config));
      res.status(201).json({ user: result.user });
    } catch (err) {
      if (err instanceof ZodError) throw mapZod(err);
      throw err;
    }
  }),

  login: asyncHandler(async (req, res) => {
    try {
      const result = await authService.login(req.body, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      res.cookie(COOKIE_NAME, result.token, getSessionCookieOptions(config));
      res.json({ user: result.user });
    } catch (err) {
      if (err instanceof ZodError) throw mapZod(err);
      throw err;
    }
  }),

  logout: asyncHandler(async (req, res) => {
    await authService.logout({
      sessionId: req.sessionId,
      userId: req.user?.id,
      token: req.cookies?.[COOKIE_NAME],
      ipAddress: req.ip,
    });
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  }),
};
