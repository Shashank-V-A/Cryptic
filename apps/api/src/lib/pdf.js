import PDFDocument from 'pdfkit';

/**
 * Generate a simple, auditable PDF buffer for a report payload.
 * No invented figures — prints values already computed by the tax/report engines.
 */
export function renderReportPdf(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', info: {
      Title: report.title || 'VDA Ledger Report',
      Author: 'VDA Ledger',
      Subject: report.type || 'Tax report',
    }});
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const payload = report.payload || {};
    const summary = payload.summary || payload.estimatedVdaTax || {};

    doc.fontSize(18).fillColor('#1a1a1a').text('VDA Ledger', { continued: false });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#3d5a45').text(report.title || report.type);
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#6b7166');
    doc.text(`Financial year: ${report.financialYear || payload.financialYear || '—'}`);
    if (payload.assessmentYear?.label) {
      doc.text(`Assessment year: ${payload.assessmentYear.label}`);
    }
    doc.text(`Generated: ${report.createdAt || payload.generatedAt || new Date().toISOString()}`);
    doc.text(`Report ID: ${report.id}`);
    doc.text(`Engine: tax ${payload.taxEngineVersion || '—'} · report ${payload.reportEngineVersion || '—'}`);
    doc.text(`Rule set: ${payload.ruleSetId || '—'} v${payload.ruleSetVersion || ''}`);
    doc.moveDown();

    doc.fontSize(10).fillColor('#1a1a1a').text('Summary', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(9).fillColor('#333');
    const lines = [
      ['Sale consideration', summary.saleConsiderationInr],
      ['Acquisition cost', summary.acquisitionCostInr],
      ['VDA income', summary.vdaIncomeInr],
      ['Estimated VDA tax', summary.estimatedVdaTaxInr],
      ['Cess', summary.cessInr],
      ['TDS deducted', summary.tdsDeductedInr],
      ['Estimated remaining', summary.estimatedRemainingInr],
    ];
    for (const [label, value] of lines) {
      if (value == null) continue;
      doc.text(`${label}: INR ${value}`);
    }

    if (payload.scheduleVda?.rows?.length) {
      doc.moveDown();
      doc.fontSize(10).fillColor('#1a1a1a').text('Schedule VDA (structured)', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(8).fillColor('#333');
      doc.text(
        `Schema: ${payload.scheduleVdaSchemaId || payload.scheduleVda?.schema?.id || 'Schedule VDA'} · rows ${payload.scheduleVda.rows.length} · total positive income INR ${payload.scheduleVda.totalPositiveIncomeInr || payload.scheduleVda?.totalPositiveIncomeInr || '—'}`,
      );
      doc.moveDown(0.3);

      const rows = payload.scheduleVda.rows.slice(0, 40);
      for (const r of rows) {
        const trail = (payload.transactionTrail || []).find((t) => t.serialNo === r.serialNo);
        doc.text(
          `#${r.serialNo} ${r.dateOfAcquisition} → ${r.dateOfTransfer} | cost ${r.costOfAcquisitionInr} | cons ${r.considerationReceivedInr} | income ${r.incomeFromTransferInr}${trail?.sellTransactionId ? ` | txn ${trail.sellTransactionId}` : ''}`,
        );
      }
      if (payload.scheduleVda.rows.length > 40) {
        doc.text(`… ${payload.scheduleVda.rows.length - 40} more rows in JSON download`);
      }
    }

    if (payload.scheduleValidation || payload.validation) {
      const v = payload.scheduleValidation || payload.validation;
      doc.moveDown();
      doc.fontSize(10).fillColor('#1a1a1a').text('Validation', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor(v.ok ? '#3d5a45' : '#a33');
      doc.text(v.ok ? 'PASSED — no blocking errors' : `FAILED — ${v.errors?.length || 0} error(s)`);
      for (const e of v.errors || []) {
        doc.fillColor('#a33').text(`• ${e.message}`);
      }
      for (const w of (v.warnings || []).slice(0, 10)) {
        doc.fillColor('#8a6d3b').text(`• ${w.message}`);
      }
    }

    doc.moveDown();
    doc.fontSize(8).fillColor('#6b7166');
    doc.text(
      'Disclaimer: Estimated VDA Tax is not Final Total Income-Tax Liability. This PDF is not a certified e-filing package. Every Schedule VDA row is traceable to ledger lot allocations / sell transactions in the companion JSON.',
      { align: 'left' },
    );

    if (payload.sources?.sections) {
      doc.moveDown(0.5);
      doc.text(`s.115BBH: ${payload.sources.sections['115BBH'] || ''}`);
      doc.text(`s.194S: ${payload.sources.sections['194S'] || ''}`);
    }

    doc.end();
  });
}
