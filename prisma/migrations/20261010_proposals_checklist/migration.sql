-- AlterEnum: adicionar status PROPOSAL (negociação)
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'PROPOSAL' BEFORE 'ENTRY';

-- AlterTable: campos de proposta/negociação no Project
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "proposalDate" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "plannedDate" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "checklist" TEXT;

-- CreateTable: etapas configuráveis do checklist (por tenant)
CREATE TABLE IF NOT EXISTS "ProjectChecklistStage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectChecklistStage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectChecklistStage_tenantId_idx" ON "ProjectChecklistStage"("tenantId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProjectChecklistStage_tenantId_fkey'
  ) THEN
    ALTER TABLE "ProjectChecklistStage"
      ADD CONSTRAINT "ProjectChecklistStage_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
