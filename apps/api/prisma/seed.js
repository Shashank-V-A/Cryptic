import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { TAX_RULE_SETS } from '@vda-ledger/tax-engine';
import { FINANCIAL_YEARS } from '@vda-ledger/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('[seed] Starting Phase 1 foundation seed…');

  for (const fy of FINANCIAL_YEARS) {
    await prisma.taxYear.upsert({
      where: { code: fy.id },
      update: {
        label: fy.label,
        startDate: new Date(fy.start),
        endDate: new Date(fy.end),
      },
      create: {
        code: fy.id,
        label: fy.label,
        startDate: new Date(fy.start),
        endDate: new Date(fy.end),
      },
    });
  }

  for (const rule of TAX_RULE_SETS) {
    const taxYear = await prisma.taxYear.findUnique({ where: { code: rule.financialYear } });
    if (!taxYear) continue;
    await prisma.taxRule.upsert({
      where: { ruleSetId: rule.id },
      update: {
        version: rule.version,
        payload: rule,
        officialSource: rule.officialSourceNotes,
        isDraft: rule.isDraft ?? true,
        effectiveFrom: new Date(rule.effectiveFrom),
        effectiveTo: new Date(rule.effectiveTo),
      },
      create: {
        taxYearId: taxYear.id,
        version: rule.version,
        ruleSetId: rule.id,
        payload: rule,
        officialSource: rule.officialSourceNotes,
        isDraft: rule.isDraft ?? true,
        effectiveFrom: new Date(rule.effectiveFrom),
        effectiveTo: new Date(rule.effectiveTo),
      },
    });
  }

  const exchanges = [
    { slug: 'COINDCX', name: 'CoinDCX', website: 'https://coindcx.com' },
    { slug: 'BINANCE', name: 'Binance', website: 'https://binance.com' },
    { slug: 'KRAKEN', name: 'Kraken', website: 'https://kraken.com' },
    { slug: 'COINSWITCH', name: 'CoinSwitch', website: 'https://coinswitch.co' },
    { slug: 'CSV', name: 'CSV Import', website: null },
  ];

  for (const ex of exchanges) {
    await prisma.exchange.upsert({
      where: { slug: ex.slug },
      update: { name: ex.name, website: ex.website },
      create: ex,
    });
  }

  const assets = [
    { symbol: 'BTC', name: 'Bitcoin', decimals: 8, coingeckoId: 'bitcoin' },
    { symbol: 'ETH', name: 'Ethereum', decimals: 8, coingeckoId: 'ethereum' },
    { symbol: 'SOL', name: 'Solana', decimals: 8, coingeckoId: 'solana' },
    { symbol: 'USDT', name: 'Tether', decimals: 6, coingeckoId: 'tether' },
    { symbol: 'INR', name: 'Indian Rupee', decimals: 2, isFiat: true },
  ];

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: {
        name: asset.name,
        decimals: asset.decimals,
        coingeckoId: asset.coingeckoId,
        isFiat: asset.isFiat || false,
      },
      create: asset,
    });
  }

  const demoEmail = 'demo@vdaledger.in';
  const passwordHash = await bcrypt.hash('DemoPass123!', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      fullName: 'Shashank',
      demoMode: true,
      passwordHash,
    },
    create: {
      email: demoEmail,
      fullName: 'Shashank',
      demoMode: true,
      passwordHash,
      accounts: { create: { label: 'Primary', currency: 'INR' } },
    },
  });

  const csvExchange = await prisma.exchange.findUnique({ where: { slug: 'CSV' } });
  const assetMap = Object.fromEntries(
    (await prisma.asset.findMany()).map((a) => [a.symbol, a.id]),
  );

  const { DEMO_TRANSACTIONS } = await import('../src/services/demo.service.js');
  const { portfolioService } = await import('../src/services/portfolio.service.js');

  // Reset demo ledger (keep user)
  await prisma.lotAllocation.deleteMany({ where: { sellTransaction: { userId: demoUser.id } } });
  await prisma.acquisitionLot.deleteMany({ where: { userId: demoUser.id } });
  await prisma.portfolioHoldingSnapshot.deleteMany({
    where: { snapshot: { userId: demoUser.id } },
  });
  await prisma.portfolioSnapshot.deleteMany({ where: { userId: demoUser.id } });
  await prisma.importBatchItem.deleteMany({ where: { batch: { userId: demoUser.id } } });
  await prisma.importBatch.deleteMany({ where: { userId: demoUser.id } });
  await prisma.transactionMetadata.deleteMany({
    where: { transaction: { userId: demoUser.id } },
  });
  await prisma.transactionFee.deleteMany({ where: { transaction: { userId: demoUser.id } } });
  await prisma.transaction.deleteMany({ where: { userId: demoUser.id } });

  const demoTxns = DEMO_TRANSACTIONS;

  for (const d of demoTxns) {
    await prisma.transaction.create({
      data: {
        userId: demoUser.id,
        exchangeId: csvExchange?.id || null,
        externalTransactionId: d.externalTransactionId,
        timestamp: new Date(d.timestamp),
        assetId: assetMap[d.asset],
        transactionType: d.type,
        quantity: d.quantity,
        price: d.price,
        grossValue: d.grossValue,
        fee: d.fee,
        netValue: d.netValue,
        currency: 'INR',
        source: 'DEMO',
        status: d.needsReview ? 'NEEDS_REVIEW' : 'POSTED',
        financialYear: d.fy,
        rawData: { demo: true, ...d },
        notes: 'Demo seed — fictional data',
        metadata: {
          create: {
            needsReview: Boolean(d.needsReview),
            reviewReason: d.reviewReason || null,
            classificationConfidence: d.type === 'UNKNOWN' ? 0 : 1,
            originalPayload: d,
            normalizedPayload: d,
          },
        },
      },
    });
  }

  // Persist lots via same engine as production path
  const portfolio = await portfolioService.recalculateAndPersistLots(demoUser.id);

  console.log('[seed] Demo user ready:', demoEmail, '/ DemoPass123!');
  console.log('[seed] Demo transactions:', demoTxns.length);
  console.log('[seed] Holdings:', portfolio.holdings.map((h) => h.assetSymbol).join(', '));
  console.log('[seed] Realized P&L:', portfolio.summary.realizedPnl);
  console.log('[seed] TaxRuleSets are marked isDraft=true until official verification.');
  console.log('[seed] Done. userId=', demoUser.id);
}

main()
  .catch((err) => {
    console.error('[seed] Failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
