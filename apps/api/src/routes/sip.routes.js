import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { sipService } from '../services/sip.service.js';
import { ZodError } from 'zod';

export const sipRouter = Router();

sipRouter.use(requireAuth);

sipRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await sipService.list(req.user.id);
    res.json(data);
  }),
);

sipRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const data = await sipService.create(req.user.id, req.body);
      res.status(201).json(data);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new AppError('Validation failed', {
          status: 400,
          code: 'VALIDATION_ERROR',
          details: err.flatten(),
        });
      }
      throw err;
    }
  }),
);

sipRouter.post(
  '/:id/pause',
  asyncHandler(async (req, res) => {
    const data = await sipService.setActive(req.user.id, req.params.id, false);
    res.json(data);
  }),
);

sipRouter.post(
  '/:id/resume',
  asyncHandler(async (req, res) => {
    const data = await sipService.setActive(req.user.id, req.params.id, true);
    res.json(data);
  }),
);

sipRouter.post(
  '/:id/execute-next',
  asyncHandler(async (req, res) => {
    const data = await sipService.executeNext(req.user.id, req.params.id);
    res.json(data);
  }),
);
