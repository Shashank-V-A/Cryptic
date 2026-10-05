import { ZodError } from 'zod';
import { authService } from '../services/auth.service.js';
import {
  COOKIE_NAME,
  getSessionCookieOptions,
} from '../middleware/auth.js';
import { setCsrfCookie } from '../middleware/csrf.js';
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

function attachCsrf(res) {
  const token = setCsrfCookie(res);
  return token;
}

export const authController = {
  csrf: asyncHandler(async (_req, res) => {
    const token = attachCsrf(res);
    res.json({ csrfToken: token });
  }),

  signup: asyncHandler(async (req, res) => {
    try {
      const result = await authService.signup(req.body, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      res.cookie(COOKIE_NAME, result.token, getSessionCookieOptions(config));
      const csrfToken = attachCsrf(res);
      res.status(201).json({ user: result.user, csrfToken });
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
      const csrfToken = attachCsrf(res);
      res.json({ user: result.user, csrfToken });
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
    res.clearCookie(COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'lax',
    });
    res.json({ ok: true });
  }),

  changePassword: asyncHandler(async (req, res) => {
    try {
      const data = await authService.changePassword(req.user.id, req.body);
      res.json(data);
    } catch (err) {
      if (err instanceof ZodError) throw mapZod(err);
      throw err;
    }
  }),

  listSessions: asyncHandler(async (req, res) => {
    const data = await authService.listSessions(req.user.id, req.sessionId);
    res.json(data);
  }),

  revokeSession: asyncHandler(async (req, res) => {
    const data = await authService.revokeSession(
      req.user.id,
      req.params.id,
      req.sessionId,
    );
    if (data.revokedCurrent) {
      res.clearCookie(COOKIE_NAME, {
        path: '/',
        httpOnly: true,
        secure: config.cookieSecure,
        sameSite: 'lax',
      });
    }
    res.json(data);
  }),

  requestPasswordReset: asyncHandler(async (req, res) => {
    const email = req.body?.email;
    const data = await authService.requestPasswordReset(email);
    res.json(data);
  }),

  confirmPasswordReset: asyncHandler(async (req, res) => {
    try {
      const data = await authService.confirmPasswordReset(req.body);
      res.json(data);
    } catch (err) {
      if (err instanceof ZodError) throw mapZod(err);
      throw err;
    }
  }),

  setupTotp: asyncHandler(async (req, res) => {
    const data = await authService.setupTotp(req.user.id);
    res.json(data);
  }),

  enableTotp: asyncHandler(async (req, res) => {
    const data = await authService.enableTotp(req.user.id, req.body?.code);
    res.json(data);
  }),

  disableTotp: asyncHandler(async (req, res) => {
    const data = await authService.disableTotp(req.user.id, req.body?.password);
    res.json(data);
  }),
};
