import { Router } from 'express';
import fs from 'node:fs';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { reportService } from '../services/report.service.js';

export const reportRouter = Router();

reportRouter.use(requireAuth);

reportRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await reportService.list(req.user.id);
    res.json(data);
  }),
);

reportRouter.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const type = String(req.body?.type || '');
    const financialYear = String(req.body?.financialYear || '');
    const payerKind = req.body?.payerKind === 'other_person' ? 'other_person' : 'specified_person';
    const data = await reportService.generate(
      req.user.id,
      { type, financialYear, payerKind },
      req.ip,
    );
    res.status(201).json(data);
  }),
);

reportRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = await reportService.get(req.user.id, req.params.id);
    res.json(data);
  }),
);

reportRouter.get(
  '/:id/download.pdf',
  asyncHandler(async (req, res) => {
    const { report, filePath } = await reportService.getPdfPath(req.user.id, req.params.id);
    if (!fs.existsSync(filePath)) {
      throw new AppError('PDF file missing on disk', { status: 404, code: 'FILE_MISSING' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="vda-ledger-${report.type}-${report.financialYear}.pdf"`,
    );
    fs.createReadStream(filePath).pipe(res);
  }),
);

reportRouter.get(
  '/:id/download.json',
  asyncHandler(async (req, res) => {
    const { report, jsonPath, payload } = await reportService.getJsonPath(
      req.user.id,
      req.params.id,
    );
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="vda-ledger-${report.type}-${report.financialYear}.json"`,
    );
    if (jsonPath && fs.existsSync(jsonPath)) {
      fs.createReadStream(jsonPath).pipe(res);
      return;
    }
    res.send(JSON.stringify(payload, null, 2));
  }),
);
