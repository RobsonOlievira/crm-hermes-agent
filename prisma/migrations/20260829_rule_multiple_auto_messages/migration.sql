-- Converte o campo único de mensagem automática em uma lista de mensagens.
-- Data-safe: copia a mensagem existente para o primeiro item da lista.

-- 1) Novo campo em lista (Postgres array)
ALTER TABLE "ClassificationRule" ADD COLUMN IF NOT EXISTS "autoMessages" TEXT[] NOT NULL DEFAULT '{}';

-- 2) Backfill: mensagem única existente vira o primeiro item da lista
UPDATE "ClassificationRule"
SET "autoMessages" = ARRAY["autoMessage"]
WHERE "autoMessage" IS NOT NULL AND "autoMessage" <> '';

-- 3) Remove o campo antigo
ALTER TABLE "ClassificationRule" DROP COLUMN IF EXISTS "autoMessage";