import { execFileSync } from 'node:child_process';
import path from 'node:path';

const FIXTURE_PATH = path.join(__dirname, '.fixture.json');
const REPO_ROOT = path.join(__dirname, '..', '..');

/**
 * Seeds the fixture cohort/admin/invite this suite drives through the
 * browser. Runs in a separate Node subprocess with --conditions=react-server
 * so the app's `import 'server-only'` module guards resolve to a no-op —
 * that condition is normally only ever set by Next's own bundler. Playwright
 * loads this file directly into its own process, so nothing here imports
 * app source itself (that broke on the generated Prisma client's ESM-only
 * output under Playwright's config loader) — it only shells out.
 */
export default function globalSetup() {
  execFileSync(
    process.execPath,
    [
      '--conditions=react-server',
      '--import',
      'tsx',
      path.join(__dirname, 'seed-fixture.ts'),
      FIXTURE_PATH,
    ],
    { cwd: REPO_ROOT, stdio: 'inherit' },
  );
}
