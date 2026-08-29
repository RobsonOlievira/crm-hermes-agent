-- Converte a referência única de tipo de lead em muitos-para-muitos e adiciona
-- a mensagem automática (pré-preenchida no botão de WhatsApp) por regra.
-- Data-safe: faz backfill das associações existentes, sem perda de dados.

-- 1) Novo campo de mensagem automática (aberto, digitado manualmente)
ALTER TABLE "ClassificationRule" ADD COLUMN IF NOT EXISTS "autoMessage" TEXT;

-- 2) Tabela de junção entre regra e tipo de lead
CREATE TABLE "ClassificationRuleLeadType" (
    "ruleId"     TEXT NOT NULL,
    "leadTypeId" TEXT NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassificationRuleLeadType_pkey" PRIMARY KEY ("ruleId", "leadTypeId")
);

-- 3) Backfill das associações existentes
INSERT INTO "ClassificationRuleLeadType" ("ruleId", "leadTypeId")
SELECT "id", "leadTypeId" FROM "ClassificationRule" WHERE "leadTypeId" IS NOT NULL;

-- 4) Remove a coluna escalar antiga (derruba FK e índice junto)
ALTER TABLE "ClassificationRule" DROP COLUMN "leadTypeId";

-- 5) Foreign keys e índices de apoio
ALTER TABLE "ClassificationRuleLeadType"
    ADD CONSTRAINT "ClassificationRuleLeadType_ruleId_fkey" FOREIGN KEY ("ruleId")
        REFERENCES "ClassificationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ClassificationRuleLeadType_leadTypeId_fkey" FOREIGN KEY ("leadTypeId")
        REFERENCES "LeadType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ClassificationRuleLeadType_leadTypeId_idx" ON "ClassificationRuleLeadType"("leadTypeId");