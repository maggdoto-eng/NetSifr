-- Per-survey ownership (P1), PII separation + data retention (P2).
ALTER TABLE "Survey" ADD COLUMN "ownerUserId" TEXT;
ALTER TABLE "Survey" ADD COLUMN "retentionDays" INTEGER;
ALTER TABLE "SurveyResponse" ADD COLUMN "contact" JSONB;

CREATE INDEX "Survey_ownerUserId_idx" ON "Survey"("ownerUserId");

ALTER TABLE "Survey" ADD CONSTRAINT "Survey_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
