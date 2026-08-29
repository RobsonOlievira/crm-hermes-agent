-- Altera a tabela "Student" para incluir a data de expiração do acesso.
ALTER TABLE "Student" ADD COLUMN "expiresAt" timestamp without time zone;