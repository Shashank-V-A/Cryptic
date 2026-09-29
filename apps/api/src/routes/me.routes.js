import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/errors.js';
import { FINANCIAL_YEARS, DISCLAIMERS, APP_NAME, APP_TAGLINE } from '@vda-ledger/shared';
import { loadApiConfig } from '@vda-ledger/config';

const config = loadApiConfig();

export const meRouter = Router();

meRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({
      user: req.user,
      app: {
        name: APP_NAME,
        tagline: APP_TAGLINE,
        demoMode: config.demoMode || req.user.demoMode,
      },
      financialYears: FINANCIAL_YEARS,
      disclaimers: DISCLAIMERS,
    });
  }),
);
