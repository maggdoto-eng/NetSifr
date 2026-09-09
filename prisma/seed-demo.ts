import 'dotenv/config';
import { prisma } from '@/lib/prisma';
import { createProgram, updateCohortStatus } from '@/modules/learning';
import { awardAttendanceConfirmed, awardReadingCompleted } from '@/modules/recognition';
import { postAnnouncement } from '@/modules/communications';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
const DAY = 86_400_000;

async function main() {
  const org = await prisma.organization.findFirstOrThrow({ orderBy: { createdAt: 'asc' } });
  const admin = await prisma.user.findFirstOrThrow({
    where: {
      organizationMemberships: {
        some: { organizationId: org.id, role: { in: ['OWNER', 'ADMIN'] } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const title = 'Climate Resilience 101 (demo)';
  const existing = await prisma.opportunity.findFirst({ where: { organizationId: org.id, title } });
  if (existing) {
    console.log('Demo program already exists — nothing to do.');
    return;
  }

  const { cohortId } = await createProgram({
    organizationId: org.id,
    title,
    cohortLabel: 'Cohort 1',
    weekCount: 3,
    ownerUserId: admin.id,
  });

  // Publish every module and take the cohort live.
  await prisma.module.updateMany({
    where: { week: { courseVersion: { cohorts: { some: { id: cohortId } } } } },
    data: { isPublished: true },
  });
  await updateCohortStatus({ cohortId, organizationId: org.id, actingUserId: admin.id, status: 'LIVE' });

  // Schedule: week 1 in the past, week 2 current, week 3 future (locked).
  const sessions = await prisma.cohortSession.findMany({
    where: { cohortId },
    include: { week: true },
    orderBy: { week: { orderIndex: 'asc' } },
  });
  const today = startOfDay(new Date());
  const offsets: Array<[number, number]> = [
    [-14, -8],
    [-3, 3],
    [7, 13],
  ];
  for (let i = 0; i < sessions.length; i++) {
    const [s, e] = offsets[Math.min(i, offsets.length - 1)];
    await prisma.cohortSession.update({
      where: { id: sessions[i].id },
      data: { startsOn: new Date(today.getTime() + s * DAY), endsOn: new Date(today.getTime() + e * DAY) },
    });
  }

  // Enrol the admin so they can walk the participant experience.
  await prisma.enrolment.upsert({
    where: { userId_cohortId: { userId: admin.id, cohortId } },
    create: { userId: admin.id, cohortId, organizationId: org.id, status: 'ACTIVE' },
    update: { status: 'ACTIVE' },
  });

  // Some progress on week 1 so the dashboard shows movement.
  const week0 = sessions[0];
  const mods0 = await prisma.module.findMany({ where: { weekId: week0.weekId, isPublished: true } });
  const rec = mods0.find((m) => m.type === 'RECORDING');
  const read = mods0.find((m) => m.type === 'READING');
  if (rec) {
    await prisma.attendanceRecord.upsert({
      where: { userId_recordingModuleId: { userId: admin.id, recordingModuleId: rec.id } },
      create: {
        userId: admin.id,
        recordingModuleId: rec.id,
        engagedSeconds: 1200,
        attendanceConfirmedAt: new Date(),
        attendanceConfirmationMethod: 'ENGAGEMENT_PROXY',
      },
      update: {},
    });
    await awardAttendanceConfirmed({ userId: admin.id, organizationId: org.id, cohortId, recordingModuleId: rec.id });
  }
  if (read) {
    await prisma.readingProgress.upsert({
      where: { userId_readingModuleId: { userId: admin.id, readingModuleId: read.id } },
      create: { userId: admin.id, readingModuleId: read.id },
      update: {},
    });
    await awardReadingCompleted({ userId: admin.id, organizationId: org.id, cohortId, readingModuleId: read.id });
  }

  // An announcement (notifies the enrolled admin) and a discussion thread.
  await postAnnouncement({
    cohortId,
    organizationId: org.id,
    authorUserId: admin.id,
    title: 'Welcome to the cohort!',
    body: 'Great to have you here. Watch the Week 1 recording, then say hi in Discussion.',
  });
  const post = await prisma.post.create({
    data: {
      cohortId,
      organizationId: org.id,
      authorUserId: admin.id,
      audience: 'COHORT',
      body: 'What drew you to climate-resilience work? Introduce yourself 👋',
    },
  });
  await prisma.comment.create({
    data: { postId: post.id, authorUserId: admin.id, body: 'I’ll start — I work on flood early-warning in Sindh.' },
  });

  console.log('Demo program seeded. cohortId =', cohortId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
