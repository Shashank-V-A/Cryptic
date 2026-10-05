import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { userRepository } from '../repositories/user.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { generateSessionToken, hashToken, encryptSecret, decryptSecret } from '../lib/crypto.js';
import { AppError } from '../lib/errors.js';
import { generateTotpSecret, verifyTotp, buildOtpauthUrl } from '../lib/totp.js';
import { loadApiConfig } from '@vda-ledger/config';

const config = loadApiConfig();

const signupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(120),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
  totpCode: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const SESSION_DAYS = 14;

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    demoMode: user.demoMode,
    createdAt: user.createdAt,
    totpEnabled: Boolean(user.totpEnabled),
  };
}

export const authService = {
  async signup(input, { ipAddress, userAgent } = {}) {
    const data = signupSchema.parse(input);
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError('An account with this email already exists', {
        status: 409,
        code: 'EMAIL_TAKEN',
      });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await userRepository.create({
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      demoMode: false,
    });

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await sessionRepository.create({
      userId: user.id,
      token,
      expiresAt,
      userAgent,
      ipAddress,
    });

    await auditRepository.create({
      userId: user.id,
      action: 'user.signup',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
    });

    return { user: publicUser(user), token, expiresAt };
  },

  async login(input, { ipAddress, userAgent } = {}) {
    const data = loginSchema.parse(input);
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      throw new AppError('Invalid email or password', {
        status: 401,
        code: 'INVALID_CREDENTIALS',
      });
    }

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) {
      throw new AppError('Invalid email or password', {
        status: 401,
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (user.totpEnabled) {
      if (!data.totpCode) {
        throw new AppError('Two-factor code required', {
          status: 401,
          code: 'TOTP_REQUIRED',
        });
      }
      if (!user.totpSecretEncrypted) {
        throw new AppError('Two-factor misconfigured', {
          status: 500,
          code: 'TOTP_MISCONFIGURED',
        });
      }
      const secret = decryptSecret(user.totpSecretEncrypted, config.encryptionKey);
      if (!verifyTotp(secret, data.totpCode)) {
        throw new AppError('Invalid two-factor code', {
          status: 401,
          code: 'TOTP_INVALID',
        });
      }
    }

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await sessionRepository.create({
      userId: user.id,
      token,
      expiresAt,
      userAgent,
      ipAddress,
    });

    await auditRepository.create({
      userId: user.id,
      action: 'user.login',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
    });

    return {
      user: publicUser(user),
      token,
      expiresAt,
    };
  },

  async logout({ sessionId, userId, token, ipAddress }) {
    if (sessionId) {
      await sessionRepository.deleteById(sessionId).catch(() => {});
    } else if (token) {
      await sessionRepository.deleteByToken(token).catch(() => {});
    }

    if (userId) {
      await auditRepository.create({
        userId,
        action: 'user.logout',
        entityType: 'user',
        entityId: userId,
        ipAddress,
      });
    }
  },

  async changePassword(userId, input) {
    const data = changePasswordSchema.parse(input);
    const user = await userRepository.findByIdForAuth(userId);
    if (!user) {
      throw new AppError('User not found', { status: 404, code: 'NOT_FOUND' });
    }
    const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!ok) {
      throw new AppError('Current password is incorrect', {
        status: 400,
        code: 'INVALID_PASSWORD',
      });
    }
    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await userRepository.updatePassword(userId, passwordHash);
    await auditRepository.create({
      userId,
      action: 'user.password_change',
      entityType: 'user',
      entityId: userId,
    });
    return { ok: true };
  },

  async listSessions(userId, currentSessionId) {
    const rows = await sessionRepository.listForUser(userId);
    return {
      items: rows.map((s) => ({
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        current: s.id === currentSessionId,
      })),
    };
  },

  async revokeSession(userId, sessionId, currentSessionId) {
    const result = await sessionRepository.deleteByIdForUser(sessionId, userId);
    if (result.count === 0) {
      throw new AppError('Session not found', { status: 404, code: 'NOT_FOUND' });
    }
    await auditRepository.create({
      userId,
      action: 'user.session_revoke',
      entityType: 'session',
      entityId: sessionId,
      metadata: { revokedCurrent: sessionId === currentSessionId },
    });
    return { ok: true, revokedCurrent: sessionId === currentSessionId };
  },

  async requestPasswordReset(email) {
    const normalized = String(email || '')
      .trim()
      .toLowerCase();
    if (!normalized) return { ok: true };
    const user = await userRepository.findByEmail(normalized);
    if (!user) return { ok: true };

    const rawToken = crypto.randomBytes(32).toString('hex');
    const passwordResetTokenHash = hashToken(rawToken);
    const passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await userRepository.setPasswordResetToken(
      user.id,
      passwordResetTokenHash,
      passwordResetExpiresAt,
    );

    if (config.nodeEnv !== 'production') {
      return { ok: true, devResetToken: rawToken };
    }
    return { ok: true };
  },

  async confirmPasswordReset(input) {
    const data = passwordResetConfirmSchema.parse(input);
    const tokenHash = hashToken(data.token);
    const user = await userRepository.findByPasswordResetTokenHash(tokenHash);
    if (!user) {
      throw new AppError('Invalid or expired reset token', {
        status: 400,
        code: 'RESET_TOKEN_INVALID',
      });
    }
    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await userRepository.updatePassword(user.id, passwordHash);
    await userRepository.clearPasswordResetToken(user.id);
    await auditRepository.create({
      userId: user.id,
      action: 'user.password_reset',
      entityType: 'user',
      entityId: user.id,
    });
    return { ok: true };
  },

  async setupTotp(userId) {
    const user = await userRepository.findByIdForAuth(userId);
    if (!user) {
      throw new AppError('User not found', { status: 404, code: 'NOT_FOUND' });
    }
    const secret = generateTotpSecret();
    const encrypted = encryptSecret(secret, config.encryptionKey);
    await userRepository.updateTotp(userId, {
      totpSecretEncrypted: encrypted,
      totpEnabled: false,
    });
    return {
      secret,
      otpauthUrl: buildOtpauthUrl({ secret, email: user.email }),
    };
  },

  async enableTotp(userId, code) {
    const user = await userRepository.findByIdForAuth(userId);
    if (!user?.totpSecretEncrypted) {
      throw new AppError('Set up authenticator first', { status: 400, code: 'TOTP_NOT_SETUP' });
    }
    const secret = decryptSecret(user.totpSecretEncrypted, config.encryptionKey);
    if (!verifyTotp(secret, code)) {
      throw new AppError('Invalid authenticator code', { status: 400, code: 'TOTP_INVALID' });
    }
    await userRepository.updateTotp(userId, { totpEnabled: true });
    await auditRepository.create({
      userId,
      action: 'user.totp_enable',
      entityType: 'user',
      entityId: userId,
    });
    return { ok: true, totpEnabled: true };
  },

  async disableTotp(userId, password) {
    const user = await userRepository.findByIdForAuth(userId);
    if (!user) {
      throw new AppError('User not found', { status: 404, code: 'NOT_FOUND' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new AppError('Password is incorrect', { status: 400, code: 'INVALID_PASSWORD' });
    }
    await userRepository.updateTotp(userId, {
      totpSecretEncrypted: null,
      totpEnabled: false,
    });
    await auditRepository.create({
      userId,
      action: 'user.totp_disable',
      entityType: 'user',
      entityId: userId,
    });
    return { ok: true, totpEnabled: false };
  },
};
