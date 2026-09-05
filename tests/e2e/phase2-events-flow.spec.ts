import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

type Fixture = {
  adminEmail: string;
  adminPassword: string;
  eventTitle: string;
  eventId: string;
  eventOccurrenceId: string;
  eventCheckInToken: string;
};

function loadFixture(): Fixture {
  return JSON.parse(readFileSync(path.join(__dirname, '.fixture.json'), 'utf-8'));
}

/**
 * Phase 2's headline path from docs/plan.md's Verification section:
 * Discover -> register -> My Events -> QR check-in -> feedback -> admin
 * roster/feedback tab. Reuses the fixture's admin account as the
 * participant (Events are self-service — nothing stops an org admin from
 * also attending one) so this file has no dependency on phase1's own
 * participant account, which matters since Playwright can run spec files
 * in parallel workers.
 */
test.describe.configure({ mode: 'serial' });

test('participant discovers, registers, checks in, and leaves feedback; admin sees both', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const fixture = loadFixture();

  await page.goto('/login');
  await page.fill('input[name="email"]', fixture.adminEmail);
  await page.fill('input[name="password"]', fixture.adminPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/programs/);

  // --- Discover -> register ---
  await page.goto('/discover');
  await expect(page.getByText(fixture.eventTitle)).toBeVisible();
  await page.getByText(fixture.eventTitle).click();
  await page.getByRole('button', { name: /^register$/i }).click();
  await expect(page.getByText(/you.re registered/i)).toBeVisible({ timeout: 10000 });

  // --- My Events shows the registration ---
  await page.goto('/events');
  await expect(page.getByText(fixture.eventTitle)).toBeVisible();
  await expect(page.getByText('Registered', { exact: true })).toBeVisible();

  // --- QR check-in (the QR URL lands on a page with an explicit button; the
  // mutation runs on press, never during the GET render) ---
  await page.goto(
    `/events/${fixture.eventOccurrenceId}/check-in?token=${fixture.eventCheckInToken}`,
  );
  await page.getByRole('button', { name: /^check in$/i }).click();
  await expect(page.getByRole('heading', { name: /you.re checked in/i })).toBeVisible();

  await page.goto('/events');
  await expect(page.getByText('Attended', { exact: true })).toBeVisible();

  // --- Feedback ---
  await page.goto(`/events/${fixture.eventOccurrenceId}/feedback`);
  await page.getByRole('button', { name: '5 stars' }).click();
  await page.getByPlaceholder(/anything you.d like to share/i).fill('Really well organized.');
  await page.getByRole('button', { name: /submit feedback/i }).click();
  await expect(page.getByText(/thanks for the feedback/i)).toBeVisible({ timeout: 10000 });

  // --- Admin sees the registration and feedback ---
  await page.goto(
    `/admin/events/${fixture.eventId}/occurrences/${fixture.eventOccurrenceId}/registrations`,
  );
  await expect(page.getByText(fixture.adminEmail)).toBeVisible();

  await page.goto(
    `/admin/events/${fixture.eventId}/occurrences/${fixture.eventOccurrenceId}/feedback`,
  );
  await expect(page.getByText('Really well organized.')).toBeVisible();
});
