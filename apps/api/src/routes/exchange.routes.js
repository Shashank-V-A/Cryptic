import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/errors.js';
import { exchangeService } from '../services/exchange.service.js';

export const exchangeRouter = Router();

exchangeRouter.use(requireAuth);

exchangeRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await exchangeService.listExchanges();
    res.json({ items });
  }),
);

exchangeRouter.get(
  '/connections',
  asyncHandler(async (req, res) => {
    const data = await exchangeService.listConnections(req.user.id);
    res.json(data);
  }),
);

exchangeRouter.post(
  '/connections',
  asyncHandler(async (req, res) => {
    const data = await exchangeService.upsertConnection(
      req.user.id,
      {
        exchangeSlug: req.body?.exchangeSlug || 'COINDCX',
        label: req.body?.label,
        apiKey: req.body?.apiKey,
        apiSecret: req.body?.apiSecret,
      },
      req.ip,
    );
    res.status(201).json(data);
  }),
);

exchangeRouter.delete(
  '/connections/:id',
  asyncHandler(async (req, res) => {
    const data = await exchangeService.disconnect(req.user.id, req.params.id, req.ip);
    res.json(data);
  }),
);

exchangeRouter.post(
  '/connections/:id/sync',
  asyncHandler(async (req, res) => {
    const data = await exchangeService.requestSync(req.user.id, req.params.id, req.ip);
    res.status(202).json(data);
  }),
);

exchangeRouter.get(
  '/sync-runs',
  asyncHandler(async (req, res) => {
    const data = await exchangeService.listSyncRuns(req.user.id, {
      connectionId: req.query.connectionId,
    });
    res.json(data);
  }),
);
