import 'server-only';
import { prisma } from '@/lib/prisma';
import { assertInOrg } from '@/modules/organizations';
import { slugify, uniqueSlug } from '@/lib/slug';
import { blankSurveyContent, type SurveyContent, type Answers } from '@/lib/survey-schema';
import type { SurveyStatus } from '@/generated/prisma/client';

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

export async function createSurvey(input: { organizationId: string }) {
  const title = 'Untitled survey';
  return prisma.survey.create({
    data: {
      organizationId: input.organizationId,
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
    include: { _count: { select: { responses: true } } },
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

/** Upsert answers / set complete on an in-progress response (partial-save + finish). */
export async function patchResponse(input: {
  responseId: string;
  answers: Answers;
  complete: boolean;
}): Promise<void> {
  // updateMany so a bad/expired id is a no-op rather than a throw (the id is a
  // capability token handed to an anonymous client).
  await prisma.surveyResponse.updateMany({
    where: { id: input.responseId },
    data: { answers: input.answers as object, complete: input.complete },
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
