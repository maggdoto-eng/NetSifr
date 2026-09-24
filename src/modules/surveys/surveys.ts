import 'server-only';
import { prisma } from '@/lib/prisma';
import { assertInOrg } from '@/modules/organizations';
import { slugify, uniqueSlug } from '@/lib/slug';
import {
  blankSurveyContent,
  splitPII,
  aggregate,
  crosstab,
  filterResponses,
  type SurveyContent,
  type Answers,
  type SurveyResponseLite,
} from '@/lib/survey-schema';
import { Prisma, type SurveyStatus } from '@/generated/prisma/client';

/** Above this many responses the results page aggregates on the server rather
 *  than shipping every raw response to the browser (spec P4). */
export const SERVER_AGG_THRESHOLD = 1500;

export type AnalyticsFilters = {
  from?: string;
  to?: string;
  completeOnly?: boolean;
  segQid?: string;
  targetQid?: string;
};

export class SurveyError extends Error {}

/** Ensure a slug is unique across surveys, excluding one id. */
async function ensureUniqueSlug(desired: string, excludeId?: string): Promise<string> {
  const base = slugify(desired) || 'survey';
  let candidate = base;
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.survey.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return uniqueSlug(base);
}

export async function createSurvey(input: { organizationId: string; ownerUserId?: string }) {
  const title = 'Untitled survey';
  return prisma.survey.create({
    data: {
      organizationId: input.organizationId,
      ownerUserId: input.ownerUserId ?? null,
      title,
      slug: uniqueSlug(title),
      status: 'DRAFT',
      version: 1,
      content: blankSurveyContent() as object,
    },
  });
}

export async function listSurveys(organizationId: string) {
  return prisma.survey.findMany({
    where: { organizationId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { responses: true } },
      owner: { select: { id: true, name: true, avatarKey: true } },
    },
  });
}

async function loadOwned(id: string, organizationId: string) {
  const survey = await prisma.survey.findUnique({ where: { id } });
  if (!survey) throw new SurveyError('Survey not found.');
  assertInOrg(survey.organizationId, organizationId);
  return survey;
}

export async function getSurveyForAdmin(id: string, organizationId: string) {
  return loadOwned(id, organizationId);
}

export async function updateSurvey(input: {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  content: SurveyContent;
}) {
  await loadOwned(input.id, input.organizationId);
  const title = input.title.trim() || 'Untitled survey';
  const slug = await ensureUniqueSlug(input.slug || title, input.id);
  return prisma.survey.update({
    where: { id: input.id },
    data: { title, slug, content: input.content as object },
  });
}

export async function setSurveyStatus(input: {
  id: string;
  organizationId: string;
  status: SurveyStatus;
}) {
  await loadOwned(input.id, input.organizationId);
  return prisma.survey.update({
    where: { id: input.id },
    data: {
      status: input.status,
      ...(input.status === 'PUBLISHED' ? { publishedAt: new Date(), version: { increment: 1 } } : {}),
    },
  });
}

export async function duplicateSurvey(id: string, organizationId: string) {
  const src = await loadOwned(id, organizationId);
  return prisma.survey.create({
    data: {
      organizationId,
      title: `${src.title} (copy)`,
      slug: uniqueSlug(`${src.title}-copy`),
      status: 'DRAFT',
      version: 1,
      content: src.content as object,
    },
  });
}

export async function deleteSurvey(id: string, organizationId: string) {
  await loadOwned(id, organizationId);
  await prisma.survey.delete({ where: { id } });
}

/* ---- Public (Runner) ---- */

export async function getPublishedSurveyBySlug(slug: string) {
  return prisma.survey.findFirst({ where: { slug, status: 'PUBLISHED' } });
}

/**
 * Begin a response (partial submission, spec §5.3): create a `complete=false`
 * row stamped with the survey version + consent, and return its id. The Runner
 * then streams answers to it via patchResponse and flips complete on finish.
 */
export async function startResponse(input: {
  slug: string;
  consent?: { agreed: boolean; text: string };
}): Promise<{ responseId: string }> {
  const survey = await prisma.survey.findFirst({
    where: { slug: input.slug, status: 'PUBLISHED' },
    select: { id: true, version: true },
  });
  if (!survey) throw new SurveyError('This survey isn’t accepting responses.');

  const response = await prisma.surveyResponse.create({
    data: {
      surveyId: survey.id,
      surveyVersion: survey.version,
      answers: {},
      complete: false,
      consent: input.consent
        ? { agreed: input.consent.agreed, text: input.consent.text, at: new Date().toISOString() }
        : undefined,
    },
    select: { id: true },
  });
  return { responseId: response.id };
}

/** Upsert answers / set complete on an in-progress response (partial-save + finish).
 *  PII-flagged answers are split into the separate `contact` column (spec P2). */
export async function patchResponse(input: {
  responseId: string;
  answers: Answers;
  complete: boolean;
}): Promise<void> {
  // Load the parent survey's content so we can partition PII out of `answers`.
  const row = await prisma.surveyResponse.findUnique({
    where: { id: input.responseId },
    select: { survey: { select: { content: true } } },
  });
  if (!row) return; // bad/expired id — no-op (the id is an anonymous capability token).
  const { answers, contact } = splitPII(row.survey.content as unknown as SurveyContent, input.answers);
  await prisma.surveyResponse.updateMany({
    where: { id: input.responseId },
    data: { answers: answers as object, contact: contact as object, complete: input.complete },
  });
}

/* ---- Analytics data ---- */

export async function getResponses(surveyId: string, organizationId: string) {
  await loadOwned(surveyId, organizationId);
  return prisma.surveyResponse.findMany({
    where: { surveyId },
    orderBy: { submittedAt: 'desc' },
  });
}

export async function countResponses(surveyId: string, organizationId: string) {
  await loadOwned(surveyId, organizationId);
  return prisma.surveyResponse.count({ where: { surveyId } });
}

/**
 * Server-side analytics (spec P4). Loads only the analytics columns (never the
 * separated `contact`/PII), applies the same filters the client offers, and
 * returns the aggregate + optional crosstab already computed — so large surveys
 * don't ship every raw response to the browser.
 */
export async function getAnalytics(
  surveyId: string,
  organizationId: string,
  filters: AnalyticsFilters = {},
) {
  const survey = await loadOwned(surveyId, organizationId);
  const content = survey.content as unknown as SurveyContent;
  const rows = await prisma.surveyResponse.findMany({
    where: { surveyId },
    orderBy: { submittedAt: 'desc' },
    select: { submittedAt: true, complete: true, answers: true },
  });
  const lite: SurveyResponseLite[] = rows.map((r) => ({
    submittedAt: r.submittedAt.toISOString(),
    complete: r.complete,
    answers: r.answers as SurveyResponseLite['answers'],
  }));
  const matched = filterResponses(lite, {
    from: filters.from,
    to: filters.to,
    completeOnly: filters.completeOnly,
  });
  const agg = aggregate(content, matched);
  const ct =
    filters.segQid && filters.targetQid
      ? crosstab(content, matched, filters.segQid, filters.targetQid)
      : null;
  return { agg, ct, total: lite.length };
}

/** A page of raw responses for the drill-down browser (spec §3.3). */
export async function getResponsesPage(
  surveyId: string,
  organizationId: string,
  page: number,
  pageSize = 20,
) {
  await loadOwned(surveyId, organizationId);
  const [responses, total] = await Promise.all([
    prisma.surveyResponse.findMany({
      where: { surveyId },
      orderBy: { submittedAt: 'desc' },
      skip: Math.max(0, (page - 1) * pageSize),
      take: pageSize,
    }),
    prisma.surveyResponse.count({ where: { surveyId } }),
  ]);
  return { responses, total, pageSize };
}

/* ---- Data governance (spec P2) ---- */

/** Set (or clear, with null) the auto-purge window for a survey's responses. */
export async function setRetention(id: string, organizationId: string, retentionDays: number | null) {
  await loadOwned(id, organizationId);
  const clean = retentionDays && retentionDays > 0 ? Math.floor(retentionDays) : null;
  return prisma.survey.update({ where: { id }, data: { retentionDays: clean } });
}

/** Delete a single response (a subject's right-to-erasure request). */
export async function deleteResponse(surveyId: string, responseId: string, organizationId: string) {
  await loadOwned(surveyId, organizationId);
  await prisma.surveyResponse.deleteMany({ where: { id: responseId, surveyId } });
}

/** Strip the separated PII (`contact`) from every response, keeping analytics answers. */
export async function anonymiseResponses(surveyId: string, organizationId: string) {
  await loadOwned(surveyId, organizationId);
  const res = await prisma.surveyResponse.updateMany({
    where: { surveyId, NOT: { contact: { equals: Prisma.DbNull } } },
    data: { contact: Prisma.DbNull },
  });
  return res.count;
}

/**
 * Delete responses past their survey's retention window. Runs across the org
 * (or one survey). Returns the number of rows removed. Called from an admin
 * action or a scheduled sweep.
 */
export async function purgeExpiredResponses(organizationId: string, surveyId?: string) {
  const surveys = await prisma.survey.findMany({
    where: { organizationId, retentionDays: { not: null }, ...(surveyId ? { id: surveyId } : {}) },
    select: { id: true, retentionDays: true },
  });
  let removed = 0;
  for (const s of surveys) {
    const cutoff = new Date(Date.now() - s.retentionDays! * 24 * 60 * 60 * 1000);
    const res = await prisma.surveyResponse.deleteMany({
      where: { surveyId: s.id, submittedAt: { lt: cutoff } },
    });
    removed += res.count;
  }
  return removed;
}
