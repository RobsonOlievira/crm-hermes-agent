-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ENTRY', 'IN_PROGRESS', 'CLOSED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReferralModel" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'PROVISION', 'PROVISION_REALIZED', 'INVESTMENT', 'TAX', 'REFUND', 'COMMISSION');

-- CreateEnum
CREATE TYPE "TransactionOrigin" AS ENUM ('INSTALLMENT_PAID', 'INSTALLMENT_DUE', 'PRODUCT_SALE', 'MANUAL_INCOME', 'MANUAL_EXPENSE', 'FIXED_EXPENSE', 'INVOICE_ISSUED', 'TAX_CALCULATED', 'COMMISSION_PAID', 'REFUND_ISSUED', 'BANK_SYNC', 'INVESTMENT');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'MERCADO_PAGO', 'ASAAS', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED', 'REFUNDED', 'CANCELLED', 'EXPIRED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'PAUSED', 'TRIALING', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'BOLETO', 'BANK_TRANSFER', 'OTHER');

-- CreateTable
CREATE TABLE "PaymentGatewayConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "displayName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSandbox" BOOLEAN NOT NULL DEFAULT false,
    "encApiKey" TEXT,
    "encSecretKey" TEXT,
    "encWebhookSecret" TEXT,
    "encAccessToken" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'BRL',
    "pixEnabled" BOOLEAN NOT NULL DEFAULT true,
    "boletoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "creditEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGatewayConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "catalogItemId" TEXT,
    "gatewayConfigId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "externalId" TEXT,
    "planName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "intervalType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "trialEnd" TIMESTAMP(3),
    "totalCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentCount" INTEGER NOT NULL DEFAULT 0,
    "failedPayments" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "catalogItemId" TEXT,
    "purchaseId" TEXT,
    "gatewayConfigId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "externalId" TEXT,
    "externalUrl" TEXT,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "method" "PaymentMethod",
    "installments" INTEGER NOT NULL DEFAULT 1,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "pixQrCode" TEXT,
    "pixCopyPaste" TEXT,
    "boletoUrl" TEXT,
    "boletoBarcode" TEXT,
    "metadata" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subscriptionId" TEXT,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalId" TEXT,
    "payload" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientLeadType" (
    "clientId" TEXT NOT NULL,
    "leadTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientLeadType_pkey" PRIMARY KEY ("clientId","leadTypeId")
);

-- CreateTable
CREATE TABLE "WaTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'pt_BR',
    "category" TEXT NOT NULL DEFAULT 'MARKETING',
    "bodyText" TEXT NOT NULL,
    "variablesCount" INTEGER NOT NULL DEFAULT 0,
    "headerType" TEXT,
    "headerText" TEXT,
    "footerText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaBroadcast" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "targetFilters" TEXT,
    "variableMapping" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ENTRY',
    "startDate" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3),
    "totalValue" DOUBLE PRECISION NOT NULL,
    "projectLink" TEXT,
    "referralName" TEXT,
    "referralModel" "ReferralModel",
    "referralValue" DOUBLE PRECISION,
    "referralPaid" BOOLEAN NOT NULL DEFAULT false,
    "catalogItemId" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectInstallment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "paidAmount" DOUBLE PRECISION,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCredential" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT,
    "username" TEXT,
    "email" TEXT,
    "password" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyCashFlow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyCashFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlowExpense" (
    "id" TEXT NOT NULL,
    "cashFlowId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "isFixed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CashFlowExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlowExtraRevenue" (
    "id" TEXT NOT NULL,
    "cashFlowId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CashFlowExtraRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "number" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "description" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlowTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "origin" "TransactionOrigin" NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "isDebit" BOOLEAN NOT NULL,
    "competenceDate" TIMESTAMP(3) NOT NULL,
    "cashDate" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "projectId" TEXT,
    "installmentId" TEXT,
    "clientId" TEXT,
    "leadId" TEXT,
    "invoiceId" TEXT,
    "purchaseId" TEXT,
    "bankAccountId" TEXT,
    "paymentMethod" TEXT,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT true,
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashFlowTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentGatewayConfig_tenantId_idx" ON "PaymentGatewayConfig"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayConfig_tenantId_provider_key" ON "PaymentGatewayConfig"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "Subscription_tenantId_idx" ON "Subscription"("tenantId");

-- CreateIndex
CREATE INDEX "Subscription_tenantId_status_idx" ON "Subscription"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Subscription_provider_externalId_idx" ON "Subscription"("provider", "externalId");

-- CreateIndex
CREATE INDEX "PaymentOrder_tenantId_idx" ON "PaymentOrder"("tenantId");

-- CreateIndex
CREATE INDEX "PaymentOrder_tenantId_status_idx" ON "PaymentOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PaymentOrder_tenantId_leadId_idx" ON "PaymentOrder"("tenantId", "leadId");

-- CreateIndex
CREATE INDEX "PaymentOrder_provider_externalId_idx" ON "PaymentOrder"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_purchaseId_key" ON "PaymentOrder"("purchaseId");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_provider_externalId_idx" ON "PaymentWebhookLog"("provider", "externalId");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_tenantId_idx" ON "PaymentWebhookLog"("tenantId");

-- CreateIndex
CREATE INDEX "ClientLeadType_leadTypeId_idx" ON "ClientLeadType"("leadTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "WaTemplate_tenantId_name_language_key" ON "WaTemplate"("tenantId", "name", "language");

-- CreateIndex
CREATE INDEX "WaTemplate_tenantId_idx" ON "WaTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "WaBroadcast_tenantId_idx" ON "WaBroadcast"("tenantId");

-- CreateIndex
CREATE INDEX "WaBroadcast_tenantId_status_idx" ON "WaBroadcast"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Project_tenantId_idx" ON "Project"("tenantId");

-- CreateIndex
CREATE INDEX "Project_tenantId_clientId_idx" ON "Project"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "Project_tenantId_status_idx" ON "Project"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInstallment_projectId_number_key" ON "ProjectInstallment"("projectId", "number");

-- CreateIndex
CREATE INDEX "ProjectInstallment_projectId_idx" ON "ProjectInstallment"("projectId");

-- CreateIndex
CREATE INDEX "ProjectInstallment_tenantId_dueDate_idx" ON "ProjectInstallment"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "ProjectInstallment_tenantId_paid_idx" ON "ProjectInstallment"("tenantId", "paid");

-- CreateIndex
CREATE INDEX "ProjectCredential_projectId_idx" ON "ProjectCredential"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyCashFlow_tenantId_year_month_key" ON "MonthlyCashFlow"("tenantId", "year", "month");

-- CreateIndex
CREATE INDEX "MonthlyCashFlow_tenantId_year_idx" ON "MonthlyCashFlow"("tenantId", "year");

-- CreateIndex
CREATE INDEX "CashFlowExpense_cashFlowId_idx" ON "CashFlowExpense"("cashFlowId");

-- CreateIndex
CREATE INDEX "CashFlowExtraRevenue_cashFlowId_idx" ON "CashFlowExtraRevenue"("cashFlowId");

-- CreateIndex
CREATE INDEX "BankAccount_tenantId_idx" ON "BankAccount"("tenantId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_issueDate_idx" ON "Invoice"("tenantId", "issueDate");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_clientId_idx" ON "Invoice"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "CashFlowTransaction_tenantId_cashDate_idx" ON "CashFlowTransaction"("tenantId", "cashDate");

-- CreateIndex
CREATE INDEX "CashFlowTransaction_tenantId_competenceDate_idx" ON "CashFlowTransaction"("tenantId", "competenceDate");

-- CreateIndex
CREATE INDEX "CashFlowTransaction_tenantId_type_idx" ON "CashFlowTransaction"("tenantId", "type");

-- CreateIndex
CREATE INDEX "CashFlowTransaction_tenantId_origin_idx" ON "CashFlowTransaction"("tenantId", "origin");

-- CreateIndex
CREATE INDEX "CashFlowTransaction_tenantId_category_idx" ON "CashFlowTransaction"("tenantId", "category");

-- CreateIndex
CREATE INDEX "CashFlowTransaction_projectId_idx" ON "CashFlowTransaction"("projectId");

-- CreateIndex
CREATE INDEX "CashFlowTransaction_installmentId_idx" ON "CashFlowTransaction"("installmentId");

-- CreateIndex
CREATE INDEX "CashFlowTransaction_bankAccountId_idx" ON "CashFlowTransaction"("bankAccountId");

-- AddForeignKey
ALTER TABLE "PaymentGatewayConfig" ADD CONSTRAINT "PaymentGatewayConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_gatewayConfigId_fkey" FOREIGN KEY ("gatewayConfigId") REFERENCES "PaymentGatewayConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_gatewayConfigId_fkey" FOREIGN KEY ("gatewayConfigId") REFERENCES "PaymentGatewayConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientLeadType" ADD CONSTRAINT "ClientLeadType_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientLeadType" ADD CONSTRAINT "ClientLeadType_leadTypeId_fkey" FOREIGN KEY ("leadTypeId") REFERENCES "LeadType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaTemplate" ADD CONSTRAINT "WaTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaBroadcast" ADD CONSTRAINT "WaBroadcast_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaBroadcast" ADD CONSTRAINT "WaBroadcast_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WaTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInstallment" ADD CONSTRAINT "ProjectInstallment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCredential" ADD CONSTRAINT "ProjectCredential_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyCashFlow" ADD CONSTRAINT "MonthlyCashFlow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowExpense" ADD CONSTRAINT "CashFlowExpense_cashFlowId_fkey" FOREIGN KEY ("cashFlowId") REFERENCES "MonthlyCashFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowExtraRevenue" ADD CONSTRAINT "CashFlowExtraRevenue_cashFlowId_fkey" FOREIGN KEY ("cashFlowId") REFERENCES "MonthlyCashFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowTransaction" ADD CONSTRAINT "CashFlowTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowTransaction" ADD CONSTRAINT "CashFlowTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowTransaction" ADD CONSTRAINT "CashFlowTransaction_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "ProjectInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowTransaction" ADD CONSTRAINT "CashFlowTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowTransaction" ADD CONSTRAINT "CashFlowTransaction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowTransaction" ADD CONSTRAINT "CashFlowTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowTransaction" ADD CONSTRAINT "CashFlowTransaction_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowTransaction" ADD CONSTRAINT "CashFlowTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;