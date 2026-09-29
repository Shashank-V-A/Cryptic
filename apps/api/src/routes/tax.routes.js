import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/errors.js';
import { taxService } from '../services/tax.service.js';

export const taxRouter = Router();

taxRouter.use(requireAuth);

taxRouter.get(
  '/rules',
  asyncHandler(async (_req, res) => {
    res.json({ items: taxService.listRuleSets() });
  }),
);

taxRouter.get(
  '/audit',
  asyncHandler(async (req, res) => {
    const items = await taxService.listAudit(req.user.id);
    res.json({ items });
  }),
);

taxRouter.get(
  '/transactions/:id/breakdown',
  asyncHandler(async (req, res) => {
    const data = await taxService.transactionBreakdown(req.user.id, req.params.id);
    res.json(data);
  }),
);

taxRouter.get(
  '/transactions/:id/why',
  asyncHandler(async (req, res) => {
    const data = await taxService.whyPaying(req.user.id, req.params.id);
    res.json(data);
  }),
);

taxRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const fy = String(req.query.financialYear || 'FY_2026_27');
    const data = await taxService.getCenter(req.user.id, fy);
    res.json(data);
  }),
);

taxRouter.get(
  '/:financialYear',
  asyncHandler(async (req, res) => {
    const data = await taxService.getCenter(req.user.id, req.params.financialYear);
    res.json(data);
  }),
);

taxRouter.post(
  '/:financialYear/calculate',
  asyncHandler(async (req, res) => {
    const payerKind = req.body?.payerKind === 'other_person' ? 'other_person' : 'specified_person';
    const data = await taxService.calculate(req.user.id, req.params.financialYear, {
      payerKind,
      ipAddress: req.ip,
    });
    res.json(data);
  }),
);
