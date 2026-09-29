import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { reconciliationService } from '../services/reconciliation.service.js';

export const reconciliationRouter = Router();

reconciliationRouter.use(requireAuth);

reconciliationRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await reconciliationService.list(req.user.id);
    res.json(data);
  }),
);

reconciliationRouter.post(
  '/run',
  asyncHandler(async (req, res) => {
    const data = await reconciliationService.run(
      req.user.id,
      {
        connectionId: req.body?.connectionId || null,
        notes: req.body?.notes || null,
      },
      req.ip,
    );
    res.status(201).json(data);
  }),
);

reconciliationRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = await reconciliationService.get(req.user.id, req.params.id);
    res.json(data);
  }),
);

reconciliationRouter.patch(
  '/:runId/items/:itemId',
  asyncHandler(async (req, res) => {
    if (req.body?.investigationNotes == null) {
      throw new AppError('investigationNotes is required', { status: 400, code: 'VALIDATION' });
    }
    const data = await reconciliationService.updateItemNotes(
      req.user.id,
      req.params.runId,
      req.params.itemId,
      String(req.body.investigationNotes),
    );
    res.json(data);
  }),
);
