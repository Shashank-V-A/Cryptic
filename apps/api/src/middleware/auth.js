import { prisma } from '../lib/prisma.js';
import { hashToken } from '../lib/crypto.js';
import { AppError } from '../lib/errors.js';

const COOKIE_NAME = 'vda_session';

export function getSessionCookieOptions(config) {
  const sameSite = ['lax', 'strict', 'none'].includes(config.cookieSameSite)
    ? config.cookieSameSite
    : 'lax';
  return {
    httpOnly: true,
    secure: sameSite === 'none' ? true : config.cookieSecure,
    sameSite,
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
  };
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      throw new AppError('Authentication required', { status: 401, code: 'UNAUTHENTICATED' });
    }

    const tokenHash = hashToken(token);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            demoMode: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      throw new AppError('Session expired', { status: 401, code: 'SESSION_EXPIRED' });
    }

    req.user = session.user;
    req.sessionId = session.id;
    next();
  } catch (err) {
    next(err);
  }
}

export { COOKIE_NAME };
