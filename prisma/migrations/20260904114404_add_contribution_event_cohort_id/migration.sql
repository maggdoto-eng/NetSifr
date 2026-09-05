-- AlterTable
ALTER TABLE "ContributionEvent" ADD COLUMN     "cohortId" TEXT;

-- CreateIndex
CREATE INDEX "ContributionEvent_cohortId_userId_idx" ON "ContributionEvent"("cohortId", "userId");

-- AddForeignKey
ALTER TABLE "ContributionEvent" ADD CONSTRAINT "ContributionEvent_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
