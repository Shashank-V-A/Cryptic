import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/errors.js';
import { notificationService } from '../services/notification.service.js';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await notificationService.list(req.user.id, {
      take: Number(req.query.limit) || 50,
    });
    res.json(data);
  }),
);

notificationRouter.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    const data = await notificationService.markAllRead(req.user.id);
    res.json(data);
  }),
);

notificationRouter.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const data = await notificationService.markRead(req.user.id, req.params.id);
    res.json(data);
  }),
);
