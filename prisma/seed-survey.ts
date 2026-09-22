import 'dotenv/config';
import { prisma } from '@/lib/prisma';
import type { SurveyContent } from '@/lib/survey-schema';

function opts(...labels: string[]) {
  return labels.map((label, i) => ({ id: `o${i + 1}`, label, value: label }));
}

const CONTENT: SurveyContent = {
  subtitle: 'A short pulse survey sent to participants after each NetSifr youth training workshop.',
  forWho: 'Attendees of a NetSifr climate workshop within the last 30 days.',
  estimatedTime: '3 minutes',
  consent: {
    heading: 'Before we begin',
    body: 'Your feedback shapes the next workshop. Individual answers are confidential and reported in aggregate.',
    require: false,
    acknowledgeLabel: 'I understand and agree to take part.',
  },
  sections: [
    {
      id: 'wb_sec1',
      title: 'Your experience',
      kicker: 'Section 1',
      questions: [
        { id: 'wb_q1', ref: 'Q1', type: 'rating', required: true, title: 'Overall, how would you rate the workshop?' },
        { id: 'wb_q2', ref: 'Q2', type: 'scale', required: true, title: 'How relevant was the content to your work or studies?', scale: { min: 1, max: 5, minLabel: 'Not relevant', maxLabel: 'Highly relevant' } },
        { id: 'wb_q3', ref: 'Q3', type: 'single_select', required: true, title: 'Would you recommend this workshop to a peer?', options: opts('Definitely', 'Probably', 'Not sure', 'Probably not', 'Definitely not') },
        { id: 'wb_q4', ref: 'Q4', type: 'multi_select', required: false, title: 'Which parts were most valuable?', help: 'Select all that apply.', options: opts('The facilitators', 'Group exercises', 'Networking', 'Take-home materials', 'The venue / logistics') },
        { id: 'wb_q5', ref: 'Q5', type: 'long_text', required: false, title: 'What is one thing we could improve?' },
      ],
    },
  ],
  ending: { heading: 'Thank you!', body: 'Your feedback shapes the next workshop.', imageUrl: '', ctaLabel: 'Explore NetSifr programmes', ctaUrl: 'https://netsifr.org', showSummary: false },
};

const TEXT = [
  'More time for group discussion would have helped a lot.',
  'The facilitators were excellent and made complex topics accessible.',
  'Give us clearer next steps at the end of each session.',
  'Great networking, but the venue was hard to reach.',
  'Loved the hands-on exercises — more of those please.',
];

function rand(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

async function main() {
  const org = await prisma.organization.findFirstOrThrow({ orderBy: { createdAt: 'asc' } });
  const slug = 'workshop-feedback';
  const existing = await prisma.survey.findUnique({ where: { slug } });
  if (existing) {
    console.log('Sample survey already exists at /s/' + slug);
    return;
  }

  const survey = await prisma.survey.create({
    data: {
      organizationId: org.id,
      slug,
      title: 'Post-Workshop Feedback',
      status: 'PUBLISHED',
      version: 1,
      publishedAt: new Date(),
      content: CONTENT as object,
    },
  });

  const q = CONTENT.sections[0].questions;
  const recOpts = q[2].options!.map((o) => o.value);
  const valOpts = q[3].options!.map((o) => o.value);
  const rows = [];
  const n = 34;
  for (let i = 0; i < n; i++) {
    const complete = rand(i * 3.1) > 0.15;
    const answers: Record<string, unknown> = {
      wb_q1: 3 + Math.floor(rand(i * 1.7) * 3), // 3–5 stars
      wb_q2: 3 + Math.floor(rand(i * 2.3) * 3),
      wb_q3: recOpts[Math.min(recOpts.length - 1, Math.floor(rand(i * 4.1) * 2.4))],
    };
    if (complete) {
      answers.wb_q4 = valOpts.filter((_, k) => rand(i + k * 1.3) > 0.5);
      if (rand(i * 5.9) > 0.5) answers.wb_q5 = TEXT[Math.floor(rand(i * 7.3) * TEXT.length)];
    }
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(rand(i * 2.9) * 30));
    rows.push({ surveyId: survey.id, answers: answers as object, complete, submittedAt: d });
  }
  await prisma.surveyResponse.createMany({ data: rows });

  console.log(`Seeded "${survey.title}" (PUBLISHED) at /s/${slug} with ${n} responses.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
