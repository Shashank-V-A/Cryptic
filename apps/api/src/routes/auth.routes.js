import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many auth attempts' } },
});

authRouter.get('/csrf', authController.csrf);
authRouter.post('/signup', authLimiter, authController.signup);
authRouter.post('/login', authLimiter, authController.login);
authRouter.post('/logout', requireAuth, authController.logout);
authRouter.post('/change-password', requireAuth, authController.changePassword);
authRouter.get('/sessions', requireAuth, authController.listSessions);
authRouter.delete('/sessions/:id', requireAuth, authController.revokeSession);
authRouter.post('/password-reset/request', authLimiter, authController.requestPasswordReset);
authRouter.post('/password-reset/confirm', authLimiter, authController.confirmPasswordReset);
authRouter.post('/totp/setup', requireAuth, authController.setupTotp);
authRouter.post('/totp/enable', requireAuth, authController.enableTotp);
authRouter.post('/totp/disable', requireAuth, authController.disableTotp);
