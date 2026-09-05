import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';

const FIXTURE_PATH = path.join(__dirname, '.fixture.json');
const REPO_ROOT = path.join(__dirname, '..', '..');

/** Mirrors global-setup.ts — shells out rather than importing app source into Playwright's own process. */
export default function globalTeardown() {
  if (!existsSync(FIXTURE_PATH)) return;

  execFileSync(
    process.execPath,
    ['--import', 'tsx', path.join(__dirname, 'teardown-fixture.ts'), FIXTURE_PATH],
    { cwd: REPO_ROOT, stdio: 'inherit' },
  );

  rmSync(FIXTURE_PATH, { force: true });
}
