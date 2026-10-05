import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { transactionController } from '../controllers/transaction.controller.js';

export const transactionRouter = Router();

transactionRouter.use(requireAuth);
transactionRouter.get('/', transactionController.list);
transactionRouter.patch('/:id/review', transactionController.review);
transactionRouter.get('/:id', transactionController.detail);
