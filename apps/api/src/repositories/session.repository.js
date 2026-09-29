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
};
