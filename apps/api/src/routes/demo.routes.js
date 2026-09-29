import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/errors.js';
import { demoService } from '../services/demo.service.js';
import { loadApiConfig } from '@vda-ledger/config';

const config = loadApiConfig();

export const demoRouter = Router();

demoRouter.use(requireAuth);

/**
 * Load (or reload) fictional demo portfolio into the current user's ledger.
 * Available when server DEMO_MODE is on, or the user is already marked demo.
 */
demoRouter.post(
  '/load',
  asyncHandler(async (req, res) => {
    if (!config.demoMode && !req.user.demoMode) {
      return res.status(403).json({
        error: {
          code: 'DEMO_DISABLED',
          message: 'Demo ledger loading is disabled on this server.',
        },
      });
    }

    const result = await demoService.loadDemoLedgerForUser(req.user.id);
    res.json({
      ok: true,
      ...result,
    });
  }),
);
