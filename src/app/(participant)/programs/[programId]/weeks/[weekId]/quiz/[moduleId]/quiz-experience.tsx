'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { QuizForTaking } from '@/modules/learning';
import { submitQuizAttemptAction } from './actions';

export function QuizExperience(props: { programId: string; weekId: string; quiz: QuizForTaking }) {
  const router = useRouter();
  const { quiz } = props;
  const [mode, setMode] = useState<'take' | 'review'>(quiz.latestAttempt ? 'review' : 'take');
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [justScored, setJustScored] = useState<number | undefined>();

  if (mode === 'review' && quiz.latestAttempt && quiz.correctOptionIdByQuestionId) {
    const attempt = quiz.latestAttempt;
    const selectedByQuestionId = new Map(
      attempt.answers.map((a) => [a.questionId, a.selectedOptionId]),
    );

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-500">
            Attempt {attempt.attemptNumber} of {attempt.attemptNumber + quiz.attemptsRemaining}
          </div>
          <div className="mt-1 text-3xl font-bold">
            {justScored ?? attempt.scorePercent}
            <span className="text-lg text-zinc-400">%</span>
          </div>
          {quiz.bestScorePercent != null && quiz.attemptsUsed > 1 && (
            <div className="mt-1 text-xs text-zinc-500">Best score: {quiz.bestScorePercent}%</div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {quiz.questions.map((q, i) => {
            const selectedOptionId = selectedByQuestionId.get(q.id);
            const correctOptionId = quiz.correctOptionIdByQuestionId![q.id];
            return (
              <div key={q.id} className="rounded-xl border border-zinc-200 bg-white p-3">
                <div className="text-sm font-semibold">
                  {i + 1}. {q.prompt}
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {q.options.map((o) => {
                    const isCorrect = o.id === correctOptionId;
                    const isSelected = o.id === selectedOptionId;
                    return (
                      <div
                        key={o.id}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          isCorrect
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : isSelected
                              ? 'border-red-300 bg-red-50 text-red-700'
                              : 'border-zinc-200 text-zinc-500'
                        }`}
                      >
                        {o.label}
                        {isCorrect && ' ✓'}
                        {isSelected && !isCorrect && ' ✗'}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {quiz.attemptsRemaining > 0 && (
          <button
            type="button"
            onClick={() => {
              setSelections({});
              setError(undefined);
              setJustScored(undefined);
              setMode('take');
            }}
            className="rounded-xl bg-zinc-900 py-3 font-semibold text-white"
          >
            Retake quiz ({quiz.attemptsRemaining} attempt{quiz.attemptsRemaining === 1 ? '' : 's'}{' '}
            left)
          </button>
        )}
        {quiz.attemptsRemaining === 0 && (
          <p className="text-center text-xs text-zinc-500">
            You&rsquo;ve used both attempts for this quiz.
          </p>
        )}
      </div>
    );
  }

  const allAnswered = quiz.questions.every((q) => selections[q.id]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(undefined);
    const result = await submitQuizAttemptAction({
      moduleId: quiz.quizModuleId,
      programId: props.programId,
      weekId: props.weekId,
      answers: Object.entries(selections).map(([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId,
      })),
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setJustScored(result.scorePercent);
    setMode('review');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {quiz.questions.length === 0 && (
        <p className="rounded-xl border-2 border-dashed border-zinc-300 p-5 text-center text-sm text-zinc-500">
          This quiz has no questions yet.
        </p>
      )}
      {quiz.questions.map((q, i) => (
        <div key={q.id} className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-sm font-semibold">
            {i + 1}. {q.prompt}
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {q.options.map((o) => (
              <label
                key={o.id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  selections[q.id] === o.id ? 'border-orange-400 bg-orange-50' : 'border-zinc-200'
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  checked={selections[q.id] === o.id}
                  onChange={() => setSelections((prev) => ({ ...prev, [q.id]: o.id }))}
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {quiz.questions.length > 0 && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className="rounded-xl bg-orange-500 py-3 font-semibold text-white disabled:opacity-40"
        >
          {submitting ? 'Submitting…' : 'Submit quiz'}
        </button>
      )}
    </div>
  );
}
