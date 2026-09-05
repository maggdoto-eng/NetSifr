import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

type Fixture = {
  courseTitle: string;
  adminUserId: string;
  adminEmail: string;
  adminPassword: string;
  cohortId: string;
  weekId: string;
  recordingModuleId: string;
  participantEmail: string;
  inviteToken: string;
};

function loadFixture(): Fixture {
  return JSON.parse(readFileSync(path.join(__dirname, '.fixture.json'), 'utf-8'));
}

/**
 * The Phase 1 headline path from docs/plan.md's Verification section:
 * accept an invite (which doubles as sign-up) -> onboarding -> engage a
 * recording past threshold -> mark attended -> take a quiz -> submit an
 * assignment -> admin grades it -> participant sees feedback -> admin
 * exports the attendance CSV. One long flow, not several small specs, so
 * each step runs against state the previous step actually produced.
 */
test.describe.configure({ mode: 'serial' });

test('participant journey through admin grading and CSV export', async ({ page }) => {
  test.setTimeout(120_000);
  const fixture = loadFixture();

  // --- Accept invite (this IS the sign-up — Phase 1 has no public signup) ---
  await page.goto(`/join/${fixture.inviteToken}`);
  await page.fill('#name', 'E2E Participant');
  await page.fill('#password', 'ParticipantPass123!');
  await page.click('button:has-text("Accept & join")');

  // --- Onboarding wizard ---
  await page.waitForURL(/\/onboarding/);
  await page.click('button:has-text("Continue")'); // step 1 -> 2
  await page.fill('input[placeholder="Your name"]', 'E2E Participant');
  await page.click('button:has-text("Continue")'); // step 2 -> 3
  for (let q = 0; q < 3; q++) {
    await page.locator('.rounded-xl.border-2.p-3.text-left').first().click();
    await page.click('button:has-text("Continue")');
  }
  await page.click('button:has-text("Finish")'); // step 4 -> done
  await page.waitForURL(/\/programs/);

  // --- Recording: engage past the (here, ~0s) threshold, then mark attended ---
  // The unlock threshold is overridden to 0s, but the server still requires
  // one real heartbeat to have landed (an AttendanceRecord row to exist) —
  // the client-side "unlocked" state alone (0 >= 0 from mount) isn't
  // enough, so this waits out one real heartbeat interval rather than
  // trusting the button's enabled state.
  await page.goto(
    `/programs/${fixture.cohortId}/weeks/${fixture.weekId}/recording/${fixture.recordingModuleId}`,
  );
  await page.waitForTimeout(16_000);
  await page.click('button:has-text("Mark attended")');
  await expect(page.locator('text=Attendance confirmed')).toBeVisible();

  // --- Quiz ---
  await page.goto(`/programs/${fixture.cohortId}/weeks/${fixture.weekId}`);
  await page.click('a:has-text("Quiz")');
  const optionLabels = page.locator('label');
  await optionLabels.nth(0).click();
  await optionLabels.nth(2).click();
  await page.click('button:has-text("Submit quiz")');
  await expect(page.locator('button:has-text("Retake quiz")')).toBeVisible();

  // --- Assignment ---
  await page.goto(`/programs/${fixture.cohortId}/weeks/${fixture.weekId}`);
  await page.click('a:has-text("Essay")');
  await page.fill('textarea', 'My e2e submission about climate resilience.');
  await page.click('button:has-text("Submit")');
  await expect(page.locator('text=Awaiting feedback')).toBeVisible();

  // --- Admin grades the submission ---
  // Participant logout lives on the /me screen (no global chrome bar).
  await page.goto('/me');
  await page.click('button:has-text("Log out")');
  await page.waitForURL(/\/login/);
  await page.fill('input[name="email"]', fixture.adminEmail);
  await page.fill('input[name="password"]', fixture.adminPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/programs/);

  await page.goto(`/admin/programs/${fixture.cohortId}/submissions`);
  await page.selectOption('select[name="label"]', 'GOOD');
  await page.fill('textarea[name="feedback"]', 'Great first submission!');
  await page.click('button:has-text("Submit grade")');
  await expect(page.locator('button:has-text("Update grade")')).toBeVisible();

  // --- Admin exports the attendance CSV ---
  await page.goto(`/admin/programs/${fixture.cohortId}/attendance`);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Export CSV'),
  ]);
  expect(download.suggestedFilename()).toBe('attendance.csv');

  // --- Participant sees the feedback ---
  // A fresh navigation first — the download's own (aborted) main-frame
  // navigation can otherwise leave the router mid-transition when logout is
  // clicked immediately after.
  await page.goto('/admin/programs');
  await page.click('button:has-text("Log out")');
  await page.waitForURL(/\/login/);
  await page.fill('input[name="email"]', fixture.participantEmail);
  await page.fill('input[name="password"]', 'ParticipantPass123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/programs/);

  await page.goto(`/programs/${fixture.cohortId}/weeks/${fixture.weekId}`);
  await page.click('a:has-text("Essay")');
  await expect(page.locator('text=Great first submission!')).toBeVisible();
});
