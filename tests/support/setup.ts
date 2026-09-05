import 'dotenv/config';

// Local dev: .env sets both DATABASE_URL (dev db) and DATABASE_URL_TEST (test
// db) — point the test run at the latter so `npm test` never touches dev
// data. CI sets DATABASE_URL directly (no DATABASE_URL_TEST), so this is a
// no-op there.
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}
process.env.AUTH_URL ??= 'http://localhost:3000';
process.env.AUTH_SECRET ??= 'test-only-secret-not-for-production-use-1234567890';
