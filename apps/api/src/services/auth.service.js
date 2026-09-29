import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { userRepository } from '../repositories/user.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { generateSessionToken } from '../lib/crypto.js';
import { AppError } from '../lib/errors.js';

const signupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(120),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

const SESSION_DAYS = 14;

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

    return { user, token, expiresAt };
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
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        demoMode: user.demoMode,
        createdAt: user.createdAt,
      },
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
};
