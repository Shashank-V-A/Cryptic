import { asyncHandler } from '../lib/errors.js';
import { importService } from '../services/import.service.js';
import { AppError } from '../lib/errors.js';

export const importController = {
  preview: asyncHandler(async (req, res) => {
    const csvText = req.body?.csvText;
    if (!csvText || typeof csvText !== 'string') {
      throw new AppError('csvText is required', { status: 400, code: 'VALIDATION_ERROR' });
    }
    const data = await importService.preview(req.user.id, csvText, req.body.filename || 'upload.csv');
    res.status(200).json(data);
  }),

  confirm: asyncHandler(async (req, res) => {
    const previewId = req.body?.previewId;
    if (!previewId) {
      throw new AppError('previewId is required', { status: 400, code: 'VALIDATION_ERROR' });
    }
    const data = await importService.confirm(req.user.id, previewId);
    res.status(201).json(data);
  }),
};
