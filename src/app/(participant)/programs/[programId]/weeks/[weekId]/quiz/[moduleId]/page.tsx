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
    <div className="flex flex-col gap-4 p-5">
      <div>
        <Link
          href={`/programs/${programId}/weeks/${weekId}`}
          className="text-xs text-zinc-500 underline"
        >
          ← Week
        </Link>
        <div className="mt-2 font-mono text-[10px] tracking-wide text-orange-600">QUIZ</div>
        <h1 className="mt-1 text-xl font-bold">{quiz.title}</h1>
      </div>

      {/* Forces a full remount when navigating between different quiz modules — same class of bug as ModuleInspector's stale defaultValue fields. */}
      <QuizExperience key={quiz.quizModuleId} programId={programId} weekId={weekId} quiz={quiz} />
    </div>
  );
}
