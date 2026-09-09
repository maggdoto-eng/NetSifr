import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getQuizForTaking } from '@/modules/learning';
import { QuizExperience } from './quiz-experience';

export default async function QuizPage({
  params,
}: PageProps<'/programs/[programId]/weeks/[weekId]/quiz/[moduleId]'>) {
  const { programId, weekId, moduleId } = await params;
  const { userId } = await verifySession();

  const quiz = await getQuizForTaking(userId, moduleId);

  return (
    <div className="stack">
      <div>
        <Link href={`/programs/${programId}/weeks/${weekId}`} className="mono" style={{ color: 'var(--mute)' }}>
          ← Week
        </Link>
        <div className="mono mono--coral" style={{ marginTop: 6 }}>
          Quiz
        </div>
        <h1 className="display-md" style={{ marginTop: 4 }}>
          {quiz.title}
        </h1>
      </div>

      {/* Forces a full remount when navigating between different quiz modules — same class of bug as ModuleInspector's stale defaultValue fields. */}
      <QuizExperience key={quiz.quizModuleId} programId={programId} weekId={weekId} quiz={quiz} />
    </div>
  );
}
