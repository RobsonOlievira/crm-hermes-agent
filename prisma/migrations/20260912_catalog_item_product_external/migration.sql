-- AlterTable
ALTER TABLE "CatalogItem" ADD COLUMN "productExternalId" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_tenantId_productExternalId_key" ON "CatalogItem"("tenantId", "productExternalId");