'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AssignmentForTaking } from '@/modules/learning';
import { submitAssignmentAction } from './actions';

const GRADE_STYLE: Record<string, string> = {
  NEEDS_WORK: 'border-amber-300 bg-amber-50 text-amber-800',
  GOOD: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  EXCELLENT: 'border-emerald-400 bg-emerald-50 text-emerald-900',
};

const GRADE_LABEL: Record<string, string> = {
  NEEDS_WORK: 'Needs work',
  GOOD: 'Good',
  EXCELLENT: 'Excellent',
};

export function AssignmentExperience(props: {
  programId: string;
  weekId: string;
  assignment: AssignmentForTaking;
}) {
  const router = useRouter();
  const { assignment } = props;
  const isResubmission = assignment.latestSubmission?.grade?.label === 'NEEDS_WORK';
  const [bodyText, setBodyText] = useState(
    assignment.latestSubmission && !assignment.latestSubmission.grade
      ? assignment.latestSubmission.bodyText
      : '',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit() {
    setSubmitting(true);
    setError(undefined);
    const result = await submitAssignmentAction({
      moduleId: assignment.assignmentModuleId,
      programId: props.programId,
      weekId: props.weekId,
      bodyText,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {assignment.latestSubmission && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              Submission {assignment.latestSubmission.attemptNumber}
              {assignment.latestSubmission.isLate && ' · late'}
            </span>
            <span>{new Date(assignment.latestSubmission.submittedAt).toLocaleDateString()}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
            {assignment.latestSubmission.bodyText}
          </p>
          {assignment.latestSubmission.grade && (
            <div
              className={`mt-3 rounded-xl border p-3 text-sm ${GRADE_STYLE[assignment.latestSubmission.grade.label]}`}
            >
              <div className="font-semibold">
                {GRADE_LABEL[assignment.latestSubmission.grade.label]}
              </div>
              <p className="mt-1">{assignment.latestSubmission.grade.feedback}</p>
            </div>
          )}
          {!assignment.latestSubmission.grade && (
            <p className="mt-3 text-xs text-zinc-500">Awaiting feedback from your facilitator.</p>
          )}
        </div>
      )}

      {assignment.canSubmit && (
        <div className="flex flex-col gap-2">
          {isResubmission && (
            <p className="text-xs font-semibold text-amber-700">
              Revise your response below and resubmit.
            </p>
          )}
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={6}
            placeholder="Write your response…"
            className="rounded-xl border border-zinc-300 p-3 text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!bodyText.trim() || submitting}
            className="rounded-xl bg-orange-500 py-3 font-semibold text-white disabled:opacity-40"
          >
            {submitting
              ? 'Submitting…'
              : assignment.latestSubmission && !assignment.latestSubmission.grade
                ? 'Update submission'
                : 'Submit'}
          </button>
        </div>
      )}

      {!assignment.canSubmit && assignment.latestSubmission?.grade?.label === 'NEEDS_WORK' && (
        <p className="text-center text-xs text-zinc-500">
          You&rsquo;ve used both submission attempts for this assignment.
        </p>
      )}
    </div>
  );
}
