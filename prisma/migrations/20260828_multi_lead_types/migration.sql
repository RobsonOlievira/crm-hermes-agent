-- Coverts single leadTypeId relationships into many-to-many join tables.
-- Data-safe: backfills existing associations, no data loss.

-- 1) Create join table between Lead and LeadType
CREATE TABLE "LeadLeadType" (
    "leadId"     TEXT NOT NULL,
    "leadTypeId" TEXT NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadLeadType_pkey" PRIMARY KEY ("leadId", "leadTypeId")
);

-- 2) Create join table between CatalogItem and LeadType
CREATE TABLE "CatalogItemLeadType" (
    "catalogItemId" TEXT NOT NULL,
    "leadTypeId"    TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogItemLeadType_pkey" PRIMARY KEY ("catalogItemId", "leadTypeId")
);

-- 3) Backfill existing associations
INSERT INTO "LeadLeadType" ("leadId", "leadTypeId")
SELECT "id", "leadTypeId" FROM "Lead" WHERE "leadTypeId" IS NOT NULL;

INSERT INTO "CatalogItemLeadType" ("catalogItemId", "leadTypeId")
SELECT "id", "leadTypeId" FROM "CatalogItem" WHERE "leadTypeId" IS NOT NULL;

-- 4) Drop old scalar columns (drops their FK constraints and indexes too)
ALTER TABLE "Lead" DROP COLUMN "leadTypeId";
ALTER TABLE "CatalogItem" DROP COLUMN "leadTypeId";

-- 5) Foreign keys and supporting indexes
ALTER TABLE "LeadLeadType"
    ADD CONSTRAINT "LeadLeadType_leadId_fkey" FOREIGN KEY ("leadId")
        REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "LeadLeadType_leadTypeId_fkey" FOREIGN KEY ("leadTypeId")
        REFERENCES "LeadType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CatalogItemLeadType"
    ADD CONSTRAINT "CatalogItemLeadType_catalogItemId_fkey" FOREIGN KEY ("catalogItemId")
        REFERENCES "CatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "CatalogItemLeadType_leadTypeId_fkey" FOREIGN KEY ("leadTypeId")
        REFERENCES "LeadType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "LeadLeadType_leadTypeId_idx" ON "LeadLeadType"("leadTypeId");
CREATE INDEX "CatalogItemLeadType_leadTypeId_idx" ON "CatalogItemLeadType"("leadTypeId");