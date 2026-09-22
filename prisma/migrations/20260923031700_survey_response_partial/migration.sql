-- Partial submission + consent/version stamping on survey responses.
ALTER TABLE "SurveyResponse" ADD COLUMN "surveyVersion" INTEGER;
ALTER TABLE "SurveyResponse" ADD COLUMN "consent" JSONB;
ALTER TABLE "SurveyResponse" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
