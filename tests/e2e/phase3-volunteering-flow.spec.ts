import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

type Fixture = {
  adminEmail: string;
  adminPassword: string;
  volunteerTitle: string;
  volunteerOpportunityId: string;
};

function loadFixture(): Fixture {
  return JSON.parse(readFileSync(path.join(__dirname, '.fixture.json'), 'utf-8'));
}

/**
 * Phase 3 headline path: discover a volunteer opportunity -> apply -> (admin
 * accepts) -> sign up for a shift + log hours -> admin verifies the hours ->
 * points. The fixture's admin account plays both the volunteer and the
 * approver (an org admin can also volunteer), which keeps the flow to one
 * login and independent of phase1/phase2's participant accounts under
 * Playwright's parallel workers.
 */
test.describe.configure({ mode: 'serial' });

test('volunteer applies, is accepted, signs up, logs hours, and an admin verifies them', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const fixture = loadFixture();
  const oppId = fixture.volunteerOpportunityId;

  await page.goto('/login');
  await page.fill('input[name="email"]', fixture.adminEmail);
  await page.fill('input[name="password"]', fixture.adminPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/programs/);

  // --- Discover -> apply ---
  await page.goto('/discover');
  await expect(page.getByText(fixture.volunteerTitle)).toBeVisible();
  await page.getByText(fixture.volunteerTitle).click();
  await page.getByPlaceholder(/why you.d like to help/i).fill('Happy to help!');
  await page.getByRole('button', { name: /apply to volunteer/i }).click();
  await expect(page.getByText(/application submitted/i)).toBeVisible({ timeout: 10000 });

  // --- Admin accepts the application ---
  await page.goto(`/admin/volunteering/${oppId}/applications`);
  await page.getByRole('button', { name: /^accept$/i }).click();
  await expect(page.getByText('ACCEPTED')).toBeVisible();

  // --- Volunteer workspace: sign up for a shift, then log hours ---
  await page.goto(`/volunteering/${oppId}`);
  await page.getByRole('button', { name: /^sign up$/i }).click();
  await expect(page.getByRole('button', { name: /^cancel$/i })).toBeVisible();

  await page.getByLabel('HOURS').fill('3');
  await page.getByLabel('DATE').fill('2026-09-01');
  await page.getByRole('button', { name: /submit hours/i }).click();
  await expect(page.getByText(/hours submitted/i)).toBeVisible({ timeout: 10000 });

  // --- Admin verifies the hours ---
  await page.goto('/admin/volunteering/service-logs');
  await expect(page.getByText(fixture.volunteerTitle)).toBeVisible();
  await page.getByRole('button', { name: /^verify$/i }).click();

  // --- Back in the workspace, the log now reads VERIFIED ---
  await page.goto(`/volunteering/${oppId}`);
  await expect(page.getByText('VERIFIED')).toBeVisible();
});
