import { asyncHandler } from '../lib/errors.js';
import { portfolioService } from '../services/portfolio.service.js';
import { AppError } from '../lib/errors.js';

export const portfolioController = {
  summary: asyncHandler(async (req, res) => {
    const data = await portfolioService.calculate(req.user.id);
    res.json(data);
  }),

  asset: asyncHandler(async (req, res) => {
    const data = await portfolioService.calculate(req.user.id);
    const symbol = String(req.params.asset || '').toUpperCase();
    const holding = data.holdings.find((h) => h.assetSymbol === symbol);
    if (!holding) {
      throw new AppError(`No holding for ${symbol}`, { status: 404, code: 'NOT_FOUND' });
    }
    res.json({
      ...holding,
      methodology: data.methodology,
      asOf: data.asOf,
      priceSource: data.priceSource,
      warnings: data.warnings.filter((w) => w.message?.includes(symbol)),
    });
  }),

  recalculate: asyncHandler(async (req, res) => {
    const data = await portfolioService.recalculateAndPersistLots(req.user.id);
    res.json(data);
  }),
};
