import { asyncHandler } from '../lib/errors.js';
import { transactionService } from '../services/transaction.service.js';

export const transactionController = {
  list: asyncHandler(async (req, res) => {
    const data = await transactionService.list(req.user.id, req.query);
    res.json(data);
  }),

  detail: asyncHandler(async (req, res) => {
    const data = await transactionService.detail(req.user.id, req.params.id);
    res.json(data);
  }),
};
