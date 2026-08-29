-- Converte a referência única de produto/serviço da regra em muitos-para-muitos.
-- Uma regra pode vincular VÁRIOS produtos (ex.: aluno + inscrito no canal pode
-- querer outros produtos além do básico). Data-safe: backfill sem perda de dados.

-- 1) Tabela de junção entre regra e item do catálogo
CREATE TABLE "ClassificationRuleCatalogItem" (
    "ruleId"        TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassificationRuleCatalogItem_pkey" PRIMARY KEY ("ruleId", "catalogItemId")
);

-- 2) Backfill das associações existentes
INSERT INTO "ClassificationRuleCatalogItem" ("ruleId", "catalogItemId")
SELECT "id", "catalogItemId" FROM "ClassificationRule" WHERE "catalogItemId" IS NOT NULL;

-- 3) Remove a coluna escalar antiga (derruba FK e índice junto)
ALTER TABLE "ClassificationRule" DROP COLUMN "catalogItemId";

-- 4) Foreign keys e índices de apoio
ALTER TABLE "ClassificationRuleCatalogItem"
    ADD CONSTRAINT "ClassificationRuleCatalogItem_ruleId_fkey" FOREIGN KEY ("ruleId")
        REFERENCES "ClassificationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ClassificationRuleCatalogItem_catalogItemId_fkey" FOREIGN KEY ("catalogItemId")
        REFERENCES "CatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ClassificationRuleCatalogItem_catalogItemId_idx" ON "ClassificationRuleCatalogItem"("catalogItemId");