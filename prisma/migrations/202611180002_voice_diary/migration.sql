ALTER TABLE "LifeRecord" ADD COLUMN "sourceEvidenceId" TEXT;
CREATE UNIQUE INDEX "LifeRecord_sourceEvidenceId_key" ON "LifeRecord"("sourceEvidenceId");
