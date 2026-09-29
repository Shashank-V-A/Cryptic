import { toDec, zero, decStr } from './decimal.js';
import { getTaxRuleSet } from './rules.js';

/**
 * Expected TDS under s.194S for consideration paid on VDA transfers in a FY.
 *
 * @param {{
 *   events: Array<{ transactionId: string, considerationInr: string|number, timestamp?: string }>,
 *   financialYear: string,
 *   payerKind?: 'specified_person' | 'other_person',
 * }} input
 */
export function calculateExpectedTds(input) {
  const ruleSet = getTaxRuleSet(input.financialYear);
  const payerKind = input.payerKind === 'other_person' ? 'other_person' : 'specified_person';
  const threshold =
    payerKind === 'specified_person'
      ? toDec(ruleSet.tds.thresholdSpecifiedPersonInr)
      : toDec(ruleSet.tds.thresholdOtherPersonInr);
  const rate = toDec(ruleSet.tds.rate);

  const events = [...(input.events || [])].sort((a, b) =>
    String(a.timestamp || '').localeCompare(String(b.timestamp || '')),
  );

  let aggregate = zero();
  const lines = [];

  for (const e of events) {
    const consideration = toDec(e.considerationInr);
    const previous = aggregate;
    aggregate = aggregate.plus(consideration);

    let expected = zero();
    let reason = '';

    if (aggregate.lte(threshold)) {
      expected = zero();
      reason = `Aggregate consideration ${decStr(aggregate)} does not exceed threshold ${decStr(threshold)} for ${payerKind} under s.194S(3) — no TDS.`;
    } else if (previous.lte(threshold)) {
      // First crossing: TDS on entire aggregate once threshold exceeded (statutory: no tax where aggregate does not exceed; once exceeded, 1% applies on sums paid).
      // Conservative operational approach used by exchanges: deduct 1% on each payment once FY aggregate will exceed threshold.
      // We apply 1% on this consideration (and note prior below-threshold amounts may also become taxable depending on timing).
      // Strict reading: once aggregate exceeds threshold, deduction applies; amounts already paid without TDS before crossing may need catch-up.
      // Documented approach: expected TDS on this payment = rate * consideration once aggregate > threshold; plus catch-up on prior aggregate if this payment crosses.
      const catchUpBase = previous;
      expected = consideration.times(rate).plus(catchUpBase.times(rate));
      reason = `Aggregate crossed threshold ${decStr(threshold)} (s.194S(3)). Expected TDS = 1% of this consideration plus catch-up 1% on prior FY aggregate ${decStr(catchUpBase)}.`;
    } else {
      expected = consideration.times(rate);
      reason = `Aggregate already above threshold. Expected TDS = 1% of consideration (s.194S(1)).`;
    }

    lines.push({
      transactionId: e.transactionId,
      considerationInr: decStr(consideration),
      aggregateConsiderationInr: decStr(aggregate),
      expectedTdsInr: decStr(expected),
      reason,
    });
  }

  const totalExpected = lines.reduce((s, l) => s.plus(toDec(l.expectedTdsInr)), zero());

  return {
    financialYear: input.financialYear,
    ruleSetId: ruleSet.id,
    section: ruleSet.tds.section,
    source: ruleSet.tds.source,
    payerKind,
    thresholdInr: decStr(threshold),
    rate: ruleSet.tds.rate,
    totalExpectedTdsInr: decStr(totalExpected),
    totalConsiderationInr: decStr(aggregate),
    lines,
    notes: ruleSet.tds.notes,
  };
}

/**
 * Match recorded TDS rows to expected amounts.
 * Statuses: MATCHED | PARTIALLY_MATCHED | NOT_FOUND | NEEDS_REVIEW
 */
export function reconcileTds({ expectedLines, recorded = [], toleranceInr = '1' }) {
  const tol = toDec(toleranceInr);
  const byTxn = new Map();
  for (const r of recorded) {
    if (!r.transactionId) continue;
    const prev = byTxn.get(r.transactionId) || zero();
    byTxn.set(r.transactionId, prev.plus(toDec(r.tdsAmountInr)));
  }

  const items = [];
  for (const line of expectedLines) {
    const recordedAmt = byTxn.get(line.transactionId) || zero();
    const expected = toDec(line.expectedTdsInr);
    let status = 'NEEDS_REVIEW';
    let difference = recordedAmt.minus(expected);

    if (expected.isZero() && recordedAmt.isZero()) {
      status = 'MATCHED';
    } else if (!byTxn.has(line.transactionId) && expected.gt(0)) {
      status = 'NOT_FOUND';
      difference = expected.neg();
    } else if (recordedAmt.minus(expected).abs().lte(tol)) {
      status = 'MATCHED';
    } else if (recordedAmt.gt(0) && expected.gt(0)) {
      status = 'PARTIALLY_MATCHED';
    } else {
      status = 'NEEDS_REVIEW';
    }

    items.push({
      transactionId: line.transactionId,
      expectedTdsInr: line.expectedTdsInr,
      recordedTdsInr: decStr(recordedAmt),
      differenceInr: decStr(difference),
      status,
    });
  }

  // Recorded TDS without a matching expected sell → needs review
  for (const [txnId, amt] of byTxn.entries()) {
    if (expectedLines.some((l) => l.transactionId === txnId)) continue;
    items.push({
      transactionId: txnId,
      expectedTdsInr: '0',
      recordedTdsInr: decStr(amt),
      differenceInr: decStr(amt),
      status: 'NEEDS_REVIEW',
    });
  }

  return { items, toleranceInr: decStr(tol) };
}
