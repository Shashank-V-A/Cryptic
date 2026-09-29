import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { transactionController } from '../controllers/transaction.controller.js';

export const transactionRouter = Router();

transactionRouter.use(requireAuth);
transactionRouter.get('/', transactionController.list);
transactionRouter.get('/:id', transactionController.detail);
