-- Email marketing: descadastro no lead, listas múltiplas por campanha e exclusões.
-- Mudanças puramente aditivas (nenhum dado existente é removido).

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "emailOptOut" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "emailOptOutAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "EmailCampaignAudience" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "segmentType" TEXT NOT NULL,
    "segmentValue" TEXT,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCampaignAudience_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmailCampaignAudience_campaignId_idx" ON "EmailCampaignAudience"("campaignId");
CREATE INDEX IF NOT EXISTS "EmailCampaignAudience_tenantId_idx" ON "EmailCampaignAudience"("tenantId");

ALTER TABLE "EmailCampaignAudience"
    ADD CONSTRAINT "EmailCampaignAudience_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "EmailCampaignExclusion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "leadId" TEXT,
    "email" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCampaignExclusion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmailCampaignExclusion_campaignId_idx" ON "EmailCampaignExclusion"("campaignId");
CREATE INDEX IF NOT EXISTS "EmailCampaignExclusion_tenantId_email_idx" ON "EmailCampaignExclusion"("tenantId", "email");

ALTER TABLE "EmailCampaignExclusion"
    ADD CONSTRAINT "EmailCampaignExclusion_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
