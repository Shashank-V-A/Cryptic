import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

export const notificationService = {
  async notify(userId, title, body) {
    return prisma.notification.create({
      data: { userId, title, body },
    });
  },

  async list(userId, { take = 50 } = {}) {
    const rows = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 100),
    });
    return {
      unreadCount: rows.filter((r) => !r.readAt).length,
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        readAt: r.readAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  },

  async markRead(userId, id) {
    const row = await prisma.notification.findFirst({ where: { id, userId } });
    if (!row) {
      throw new AppError('Notification not found', { status: 404, code: 'NOT_FOUND' });
    }
    if (!row.readAt) {
      await prisma.notification.update({
        where: { id },
        data: { readAt: new Date() },
      });
    }
    return { ok: true };
  },

  async markAllRead(userId) {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  },
};

/** @param {string} userId @param {string} title @param {string} body */
export function notify(userId, title, body) {
  return notificationService.notify(userId, title, body);
}
