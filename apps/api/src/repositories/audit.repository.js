import { prisma } from '../lib/prisma.js';

export const auditRepository = {
  create({ userId, action, entityType, entityId, metadata, ipAddress }) {
    return prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata,
        ipAddress,
      },
    });
  },
};
