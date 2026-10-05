-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT', 'DEPOSIT', 'WITHDRAWAL', 'FEE', 'REWARD', 'AIRDROP', 'GIFT', 'SWAP', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('POSTED', 'PENDING', 'NEEDS_REVIEW', 'IGNORED');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('EXCHANGE_SYNC', 'CSV_IMPORT', 'MANUAL', 'DEMO', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SipFrequency" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "TdsStatus" AS ENUM ('MATCHED', 'PARTIALLY_MATCHED', 'NOT_FOUND', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('RECONCILED', 'MISMATCH', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('CRYPTO_TAX', 'PORTFOLIO', 'TRANSACTION_LEDGER', 'TDS_RECONCILIATION', 'SCHEDULE_VDA', 'ITR_READY');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ExchangeSlug" AS ENUM ('COINDCX', 'BINANCE', 'KRAKEN', 'COINSWITCH', 'CSV', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "demoMode" BOOLEAN NOT NULL DEFAULT false,
    "passwordResetTokenHash" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "totpSecretEncrypted" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Primary',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exchange" (
    "id" TEXT NOT NULL,
    "slug" "ExchangeSlug" NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exchange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exchangeId" TEXT NOT NULL,
    "label" TEXT,
    "encryptedApiKey" TEXT,
    "encryptedApiSecret" TEXT,
    "permissionsScope" TEXT NOT NULL DEFAULT 'read',
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "lastTradeCursor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "jobId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "summary" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 8,
    "coingeckoId" TEXT,
    "isFiat" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetPrice" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "priceInr" DECIMAL(28,12) NOT NULL,
    "source" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exchangeId" TEXT,
    "externalTransactionId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "assetId" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "quantity" DECIMAL(28,18) NOT NULL,
    "price" DECIMAL(28,12),
    "grossValue" DECIMAL(28,12),
    "fee" DECIMAL(28,12),
    "feeAssetId" TEXT,
    "netValue" DECIMAL(28,12),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "source" "TransactionSource" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'POSTED',
    "financialYear" TEXT,
    "rawData" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionFee" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "feeAssetId" TEXT,
    "amount" DECIMAL(28,18) NOT NULL,
    "amountInr" DECIMAL(28,12),

    CONSTRAINT "TransactionFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionMetadata" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "classificationConfidence" DOUBLE PRECISION,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewReason" TEXT,
    "normalizedPayload" JSONB,
    "originalPayload" JSONB,

    CONSTRAINT "TransactionMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcquisitionLot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "sourceTransactionId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL,
    "originalQuantity" DECIMAL(28,18) NOT NULL,
    "remainingQuantity" DECIMAL(28,18) NOT NULL,
    "unitCostInr" DECIMAL(28,12) NOT NULL,
    "totalCostInr" DECIMAL(28,12) NOT NULL,
    "financialYear" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcquisitionLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotAllocation" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "sellTransactionId" TEXT NOT NULL,
    "quantity" DECIMAL(28,18) NOT NULL,
    "costBasisInr" DECIMAL(28,12) NOT NULL,
    "proceedsInr" DECIMAL(28,12) NOT NULL,
    "realizedPnlInr" DECIMAL(28,12) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "totalInvested" DECIMAL(28,12) NOT NULL,
    "currentValue" DECIMAL(28,12),
    "realizedPnl" DECIMAL(28,12) NOT NULL,
    "unrealizedPnl" DECIMAL(28,12),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioHoldingSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "quantity" DECIMAL(28,18) NOT NULL,
    "averageCostInr" DECIMAL(28,12) NOT NULL,
    "currentPriceInr" DECIMAL(28,12),
    "currentValueInr" DECIMAL(28,12),
    "unrealizedPnlInr" DECIMAL(28,12),

    CONSTRAINT "PortfolioHoldingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SipPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "frequency" "SipFrequency" NOT NULL,
    "amountInr" DECIMAL(28,12) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SipTransaction" (
    "id" TEXT NOT NULL,
    "sipPlanId" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL,
    "amountInr" DECIMAL(28,12) NOT NULL,
    "quantity" DECIMAL(28,18),
    "priceInr" DECIMAL(28,12),
    "ledgerTxnId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SipTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxYear" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRule" (
    "id" TEXT NOT NULL,
    "taxYearId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "officialSource" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxCalculation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taxRuleId" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "calculationVersion" TEXT NOT NULL,
    "calculationTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inputTransactionIds" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "saleConsideration" DECIMAL(28,12),
    "acquisitionCost" DECIMAL(28,12),
    "vdaIncome" DECIMAL(28,12),
    "estimatedTax" DECIMAL(28,12),
    "cess" DECIMAL(28,12),
    "tdsDeducted" DECIMAL(28,12),
    "estimatedRemaining" DECIMAL(28,12),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxTransaction" (
    "id" TEXT NOT NULL,
    "taxCalculationId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "consideration" DECIMAL(28,12) NOT NULL,
    "acquisitionCost" DECIMAL(28,12) NOT NULL,
    "income" DECIMAL(28,12) NOT NULL,
    "tax" DECIMAL(28,12) NOT NULL,
    "breakdown" JSONB,

    CONSTRAINT "TaxTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TdsRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "assetSymbol" TEXT,
    "saleValueInr" DECIMAL(28,12),
    "tdsAmountInr" DECIMAL(28,12) NOT NULL,
    "status" "TdsStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "source" TEXT NOT NULL,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TdsRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationItem" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "assetSymbol" TEXT NOT NULL,
    "exchangeQuantity" DECIMAL(28,18) NOT NULL,
    "ledgerQuantity" DECIMAL(28,18) NOT NULL,
    "difference" DECIMAL(28,18) NOT NULL,
    "status" "ReconciliationStatus" NOT NULL,
    "investigationNotes" TEXT,

    CONSTRAINT "ReconciliationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "financialYear" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "filePath" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportTransaction" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,

    CONSTRAINT "ReportTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" JSONB,
    "rawStorageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatchItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "rawRow" JSONB NOT NULL,
    "normalized" JSONB,
    "errorMessage" TEXT,
    "transactionId" TEXT,

    CONSTRAINT "ImportBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_passwordResetTokenHash_idx" ON "User"("passwordResetTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Exchange_slug_key" ON "Exchange"("slug");

-- CreateIndex
CREATE INDEX "ExchangeConnection_userId_idx" ON "ExchangeConnection"("userId");

-- CreateIndex
CREATE INDEX "ExchangeConnection_exchangeId_idx" ON "ExchangeConnection"("exchangeId");

-- CreateIndex
CREATE INDEX "SyncRun_userId_startedAt_idx" ON "SyncRun"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "SyncRun_connectionId_startedAt_idx" ON "SyncRun"("connectionId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_symbol_key" ON "Asset"("symbol");

-- CreateIndex
CREATE INDEX "Asset_symbol_idx" ON "Asset"("symbol");

-- CreateIndex
CREATE INDEX "AssetPrice_assetId_asOf_idx" ON "AssetPrice"("assetId", "asOf");

-- CreateIndex
CREATE UNIQUE INDEX "AssetPrice_assetId_asOf_source_key" ON "AssetPrice"("assetId", "asOf", "source");

-- CreateIndex
CREATE INDEX "Transaction_userId_timestamp_idx" ON "Transaction"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "Transaction_userId_assetId_idx" ON "Transaction"("userId", "assetId");

-- CreateIndex
CREATE INDEX "Transaction_userId_financialYear_idx" ON "Transaction"("userId", "financialYear");

-- CreateIndex
CREATE INDEX "Transaction_userId_transactionType_idx" ON "Transaction"("userId", "transactionType");

-- CreateIndex
CREATE INDEX "Transaction_externalTransactionId_idx" ON "Transaction"("externalTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_userId_exchangeId_externalTransactionId_key" ON "Transaction"("userId", "exchangeId", "externalTransactionId");

-- CreateIndex
CREATE INDEX "TransactionFee_transactionId_idx" ON "TransactionFee"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionMetadata_transactionId_key" ON "TransactionMetadata"("transactionId");

-- CreateIndex
CREATE INDEX "AcquisitionLot_userId_assetId_acquiredAt_idx" ON "AcquisitionLot"("userId", "assetId", "acquiredAt");

-- CreateIndex
CREATE INDEX "AcquisitionLot_sourceTransactionId_idx" ON "AcquisitionLot"("sourceTransactionId");

-- CreateIndex
CREATE INDEX "LotAllocation_lotId_idx" ON "LotAllocation"("lotId");

-- CreateIndex
CREATE INDEX "LotAllocation_sellTransactionId_idx" ON "LotAllocation"("sellTransactionId");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_userId_asOf_idx" ON "PortfolioSnapshot"("userId", "asOf");

-- CreateIndex
CREATE INDEX "PortfolioHoldingSnapshot_snapshotId_idx" ON "PortfolioHoldingSnapshot"("snapshotId");

-- CreateIndex
CREATE INDEX "PortfolioHoldingSnapshot_assetId_idx" ON "PortfolioHoldingSnapshot"("assetId");

-- CreateIndex
CREATE INDEX "SipPlan_userId_isActive_idx" ON "SipPlan"("userId", "isActive");

-- CreateIndex
CREATE INDEX "SipTransaction_sipPlanId_executedAt_idx" ON "SipTransaction"("sipPlanId", "executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TaxYear_code_key" ON "TaxYear"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRule_ruleSetId_key" ON "TaxRule"("ruleSetId");

-- CreateIndex
CREATE INDEX "TaxRule_taxYearId_version_idx" ON "TaxRule"("taxYearId", "version");

-- CreateIndex
CREATE INDEX "TaxCalculation_userId_financialYear_idx" ON "TaxCalculation"("userId", "financialYear");

-- CreateIndex
CREATE INDEX "TaxCalculation_taxRuleId_idx" ON "TaxCalculation"("taxRuleId");

-- CreateIndex
CREATE INDEX "TaxTransaction_taxCalculationId_idx" ON "TaxTransaction"("taxCalculationId");

-- CreateIndex
CREATE INDEX "TaxTransaction_transactionId_idx" ON "TaxTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "TdsRecord_userId_date_idx" ON "TdsRecord"("userId", "date");

-- CreateIndex
CREATE INDEX "TdsRecord_transactionId_idx" ON "TdsRecord"("transactionId");

-- CreateIndex
CREATE INDEX "TdsRecord_status_idx" ON "TdsRecord"("status");

-- CreateIndex
CREATE INDEX "ReconciliationRun_userId_ranAt_idx" ON "ReconciliationRun"("userId", "ranAt");

-- CreateIndex
CREATE INDEX "ReconciliationItem_runId_idx" ON "ReconciliationItem"("runId");

-- CreateIndex
CREATE INDEX "ReconciliationItem_status_idx" ON "ReconciliationItem"("status");

-- CreateIndex
CREATE INDEX "Report_userId_type_idx" ON "Report"("userId", "type");

-- CreateIndex
CREATE INDEX "Report_financialYear_idx" ON "Report"("financialYear");

-- CreateIndex
CREATE UNIQUE INDEX "ReportTransaction_reportId_transactionId_key" ON "ReportTransaction"("reportId", "transactionId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportBatch_userId_createdAt_idx" ON "ImportBatch"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportBatchItem_batchId_status_idx" ON "ImportBatchItem"("batchId", "status");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeConnection" ADD CONSTRAINT "ExchangeConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeConnection" ADD CONSTRAINT "ExchangeConnection_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ExchangeConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetPrice" ADD CONSTRAINT "AssetPrice_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionFee" ADD CONSTRAINT "TransactionFee_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionMetadata" ADD CONSTRAINT "TransactionMetadata_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcquisitionLot" ADD CONSTRAINT "AcquisitionLot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcquisitionLot" ADD CONSTRAINT "AcquisitionLot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcquisitionLot" ADD CONSTRAINT "AcquisitionLot_sourceTransactionId_fkey" FOREIGN KEY ("sourceTransactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotAllocation" ADD CONSTRAINT "LotAllocation_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "AcquisitionLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotAllocation" ADD CONSTRAINT "LotAllocation_sellTransactionId_fkey" FOREIGN KEY ("sellTransactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioSnapshot" ADD CONSTRAINT "PortfolioSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioHoldingSnapshot" ADD CONSTRAINT "PortfolioHoldingSnapshot_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PortfolioSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioHoldingSnapshot" ADD CONSTRAINT "PortfolioHoldingSnapshot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SipPlan" ADD CONSTRAINT "SipPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SipPlan" ADD CONSTRAINT "SipPlan_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SipTransaction" ADD CONSTRAINT "SipTransaction_sipPlanId_fkey" FOREIGN KEY ("sipPlanId") REFERENCES "SipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRule" ADD CONSTRAINT "TaxRule_taxYearId_fkey" FOREIGN KEY ("taxYearId") REFERENCES "TaxYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxCalculation" ADD CONSTRAINT "TaxCalculation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxCalculation" ADD CONSTRAINT "TaxCalculation_taxRuleId_fkey" FOREIGN KEY ("taxRuleId") REFERENCES "TaxRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxTransaction" ADD CONSTRAINT "TaxTransaction_taxCalculationId_fkey" FOREIGN KEY ("taxCalculationId") REFERENCES "TaxCalculation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxTransaction" ADD CONSTRAINT "TaxTransaction_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TdsRecord" ADD CONSTRAINT "TdsRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TdsRecord" ADD CONSTRAINT "TdsRecord_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRun" ADD CONSTRAINT "ReconciliationRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationItem" ADD CONSTRAINT "ReconciliationItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTransaction" ADD CONSTRAINT "ReportTransaction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTransaction" ADD CONSTRAINT "ReportTransaction_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatchItem" ADD CONSTRAINT "ImportBatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatchItem" ADD CONSTRAINT "ImportBatchItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

