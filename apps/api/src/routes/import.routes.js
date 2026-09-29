import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { importController } from '../controllers/import.controller.js';

export const importRouter = Router();

importRouter.use(requireAuth);
importRouter.post('/csv/preview', importController.preview);
importRouter.post('/csv/confirm', importController.confirm);
