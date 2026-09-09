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
      <div className="stack">
        <div className="card">
          <div className="mono">
            Attempt {attempt.attemptNumber} of {attempt.attemptNumber + quiz.attemptsRemaining}
          </div>
          <div className="figure" style={{ fontSize: 40, marginTop: 4 }}>
            {justScored ?? attempt.scorePercent}
            <span className="muted" style={{ fontSize: 20 }}>%</span>
          </div>
          {quiz.bestScorePercent != null && quiz.attemptsUsed > 1 && (
            <div className="mono" style={{ marginTop: 4 }}>
              Best score: {quiz.bestScorePercent}%
            </div>
          )}
        </div>

        <div className="stack" style={{ gap: 'var(--s3)' }}>
          {quiz.questions.map((q, i) => {
            const selectedOptionId = selectedByQuestionId.get(q.id);
            const correctOptionId = quiz.correctOptionIdByQuestionId![q.id];
            const gotItRight = selectedOptionId === correctOptionId;
            return (
              <div key={q.id} className={`review ${gotItRight ? 'review--ok' : ''}`}>
                <div style={{ fontWeight: 600 }}>
                  {i + 1}. {q.prompt}
                </div>
                <div className="col" style={{ gap: 6, marginTop: 'var(--s2)' }}>
                  {q.options.map((o) => {
                    const isCorrect = o.id === correctOptionId;
                    const isSelected = o.id === selectedOptionId;
                    const bg = isCorrect
                      ? 'var(--mint-tint)'
                      : isSelected
                        ? 'var(--coral-tint)'
                        : 'transparent';
                    const border = isCorrect
                      ? 'var(--mint)'
                      : isSelected
                        ? 'var(--coral)'
                        : 'var(--border)';
                    return (
                      <div
                        key={o.id}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--r-item)',
                          border: `1.5px solid ${border}`,
                          background: bg,
                          fontSize: 14,
                          color: isCorrect || isSelected ? 'var(--ink)' : 'var(--mute)',
                        }}
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

        {quiz.attemptsRemaining > 0 ? (
          <button
            type="button"
            onClick={() => {
              setSelections({});
              setError(undefined);
              setJustScored(undefined);
              setMode('take');
            }}
            className="btn btn--primary btn--block"
          >
            Retake quiz ({quiz.attemptsRemaining} attempt{quiz.attemptsRemaining === 1 ? '' : 's'}{' '}
            left)
          </button>
        ) : (
          <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
            You’ve used both attempts for this quiz.
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
    <div className="stack">
      {quiz.questions.length === 0 && (
        <div className="empty">This quiz has no questions yet.</div>
      )}
      {quiz.questions.map((q, i) => (
        <div key={q.id} className="card">
          <div style={{ fontWeight: 600 }}>
            {i + 1}. {q.prompt}
          </div>
          <div className="col" style={{ gap: 'var(--s2)', marginTop: 'var(--s3)' }}>
            {q.options.map((o) => (
              <button
                key={o.id}
                type="button"
                className="option"
                aria-pressed={selections[q.id] === o.id}
                onClick={() => setSelections((prev) => ({ ...prev, [q.id]: o.id }))}
              >
                <span className="dot" />
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {error && <p style={{ color: 'var(--coral)', fontSize: 14 }}>{error}</p>}

      {quiz.questions.length > 0 && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className="btn btn--accent btn--block"
        >
          {submitting ? 'Submitting…' : 'Submit quiz'}
        </button>
      )}
    </div>
  );
}
