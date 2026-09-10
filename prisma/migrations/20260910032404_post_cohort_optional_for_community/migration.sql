-- Community (org-wide) posts have no cohort; make Post.cohortId optional.
ALTER TABLE "Post" ALTER COLUMN "cohortId" DROP NOT NULL;
