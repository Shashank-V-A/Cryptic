import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { tdsService } from '../services/tax.service.js';

export const tdsRouter = Router();

tdsRouter.use(requireAuth);

tdsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await tdsService.list(req.user.id, {
      financialYear: req.query.financialYear,
    });
    res.json(data);
  }),
);

tdsRouter.post(
  '/records',
  asyncHandler(async (req, res) => {
    if (!req.body?.tdsAmountInr || !req.body?.date) {
      throw new AppError('date and tdsAmountInr are required', {
        status: 400,
        code: 'VALIDATION',
      });
    }
    const created = await tdsService.createRecord(req.user.id, req.body, req.ip);
    res.status(201).json({
      id: created.id,
      tdsAmountInr: created.tdsAmountInr.toString(),
      status: created.status,
    });
  }),
);

tdsRouter.post(
  '/reconcile',
  asyncHandler(async (req, res) => {
    const financialYear = String(req.body?.financialYear || req.query.financialYear || '');
    if (!financialYear) {
      throw new AppError('financialYear is required', { status: 400, code: 'VALIDATION' });
    }
    const payerKind = req.body?.payerKind === 'other_person' ? 'other_person' : 'specified_person';
    const data = await tdsService.reconcile(req.user.id, financialYear, { payerKind });
    res.json(data);
  }),
);
