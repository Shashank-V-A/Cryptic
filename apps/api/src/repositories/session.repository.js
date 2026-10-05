import { prisma } from '../lib/prisma.js';
import { hashToken } from '../lib/crypto.js';

export const sessionRepository = {
  create({ userId, token, expiresAt, userAgent, ipAddress }) {
    return prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt,
        userAgent,
        ipAddress,
      },
    });
  },

  deleteById(id) {
    return prisma.session.delete({ where: { id } });
  },

  deleteByToken(token) {
    return prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  },

  listForUser(userId) {
    return prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  },

  deleteByIdForUser(id, userId) {
    return prisma.session.deleteMany({ where: { id, userId } });
  },
};
