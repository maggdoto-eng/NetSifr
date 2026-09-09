import 'server-only';
import { prisma } from '@/lib/prisma';

export type Badge = {
  key: string;
  label: string;
  description: string;
  icon: string;
  earned: boolean;
};

/**
 * Achievements derived on read from existing data (the ContributionEvent
 * ledger + activity tables) — no separate badge store. Cross-program.
 */
export async function getUserBadges(userId: string): Promise<Badge[]> {
  const [completed, perfectQuiz, pointsAgg, postCount, readingCount, attendedCount] =
    await Promise.all([
      prisma.enrolment.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.quizAttempt.count({ where: { userId, scorePercent: 100 } }),
      prisma.contributionEvent.aggregate({ _sum: { points: true }, where: { userId } }),
      prisma.post.count({ where: { authorUserId: userId } }),
      prisma.readingProgress.count({ where: { userId } }),
      prisma.attendanceRecord.count({ where: { userId, attendanceConfirmedAt: { not: null } } }),
    ]);
  const points = pointsAgg._sum.points ?? 0;

  return [
    {
      key: 'first-steps',
      label: 'First steps',
      description: 'Completed your first activity',
      icon: '🌱',
      earned: readingCount > 0 || attendedCount > 0 || perfectQuiz > 0,
    },
    {
      key: 'quiz-ace',
      label: 'Quiz ace',
      description: 'Scored 100% on a quiz',
      icon: '🎯',
      earned: perfectQuiz > 0,
    },
    {
      key: 'graduate',
      label: 'Graduate',
      description: 'Completed a program',
      icon: '🎓',
      earned: completed >= 1,
    },
    {
      key: 'scholar',
      label: 'Scholar',
      description: 'Completed three programs',
      icon: '📚',
      earned: completed >= 3,
    },
    {
      key: 'contributor',
      label: 'Contributor',
      description: 'Posted in a cohort discussion',
      icon: '💬',
      earned: postCount > 0,
    },
    {
      key: 'points-500',
      label: '500 club',
      description: 'Earned 500 points',
      icon: '⭐',
      earned: points >= 500,
    },
    {
      key: 'points-1000',
      label: '1,000 club',
      description: 'Earned 1,000 points',
      icon: '🏆',
      earned: points >= 1000,
    },
  ];
}
