import { asyncHandler } from '../lib/errors.js';
import { portfolioService } from '../services/portfolio.service.js';
import { AppError } from '../lib/errors.js';

export const portfolioController = {
  summary: asyncHandler(async (req, res) => {
    const data = await portfolioService.calculate(req.user.id);
    res.json(data);
  }),

  performance: asyncHandler(async (req, res) => {
    const days = Math.min(Number(req.query.days) || 90, 365);
    const data = await portfolioService.performanceSeries(req.user.id, { days });
    res.json(data);
  }),

  snapshots: asyncHandler(async (req, res) => {
    const data = await portfolioService.listSnapshots(req.user.id);
    res.json({ items: data });
  }),

  asset: asyncHandler(async (req, res) => {
    const symbol = String(req.params.asset || '').toUpperCase();
    const data = await portfolioService.assetDetail(req.user.id, symbol);
    if (!data) {
      throw new AppError(`No holding for ${symbol}`, { status: 404, code: 'NOT_FOUND' });
    }
    res.json(data);
  }),

  recalculate: asyncHandler(async (req, res) => {
    const data = await portfolioService.recalculateAndPersistLots(req.user.id);
    res.json(data);
  }),
};
