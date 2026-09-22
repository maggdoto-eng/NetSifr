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

export async function submitSurveyResponse(input: {
  surveyId: string;
  answers: Answers;
  complete: boolean;
}) {
  const survey = await prisma.survey.findUnique({
    where: { id: input.surveyId },
    select: { status: true },
  });
  if (!survey || survey.status !== 'PUBLISHED') {
    throw new SurveyError('This survey isn’t accepting responses.');
  }
  await prisma.surveyResponse.create({
    data: { surveyId: input.surveyId, answers: input.answers as object, complete: input.complete },
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
