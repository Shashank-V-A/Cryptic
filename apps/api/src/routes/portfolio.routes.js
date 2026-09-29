import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { portfolioController } from '../controllers/portfolio.controller.js';

export const portfolioRouter = Router();

portfolioRouter.use(requireAuth);
portfolioRouter.get('/', portfolioController.summary);
portfolioRouter.get('/performance', portfolioController.performance);
portfolioRouter.get('/snapshots', portfolioController.snapshots);
portfolioRouter.post('/recalculate', portfolioController.recalculate);
portfolioRouter.get('/:asset', portfolioController.asset);
