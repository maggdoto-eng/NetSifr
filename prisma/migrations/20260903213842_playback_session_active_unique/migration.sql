-- Enforce "one active PlaybackSession per (user, recordingModule)" — Prisma's
-- schema DSL has no syntax for a partial unique index, so this is hand-written.
-- See PlaybackSession's doc comment in schema.prisma.
CREATE UNIQUE INDEX "PlaybackSession_active_user_recording_unique"
  ON "PlaybackSession" ("userId", "recordingModuleId")
  WHERE "endedAt" IS NULL;
