'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AssignmentForTaking } from '@/modules/learning';
import { submitAssignmentAction } from './actions';

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

  const grade = assignment.latestSubmission?.grade;
  const goodGrade = grade?.label === 'GOOD' || grade?.label === 'EXCELLENT';

  return (
    <div className="stack">
      {assignment.latestSubmission && (
        <div className="card stack" style={{ gap: 'var(--s3)' }}>
          <div className="row row--between">
            <span className="mono">
              Submission {assignment.latestSubmission.attemptNumber}
              {assignment.latestSubmission.isLate && ' · late'}
            </span>
            <span className="mono">
              {new Date(assignment.latestSubmission.submittedAt).toLocaleDateString()}
            </span>
          </div>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {assignment.latestSubmission.bodyText}
          </p>
          {grade ? (
            <div className={`review ${goodGrade ? 'review--ok' : ''}`}>
              <div style={{ fontWeight: 700 }}>{GRADE_LABEL[grade.label]}</div>
              <p style={{ margin: '4px 0 0' }}>{grade.feedback}</p>
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              Awaiting feedback from your facilitator.
            </p>
          )}
        </div>
      )}

      {assignment.canSubmit && (
        <div className="stack" style={{ gap: 'var(--s2)' }}>
          {isResubmission && (
            <p className="mono mono--coral">Revise your response below and resubmit.</p>
          )}
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={6}
            placeholder="Write your response…"
          />
          {error && <p style={{ color: 'var(--coral)', fontSize: 14 }}>{error}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!bodyText.trim() || submitting}
            className="btn btn--accent btn--block"
          >
            {submitting
              ? 'Submitting…'
              : assignment.latestSubmission && !assignment.latestSubmission.grade
                ? 'Update submission'
                : 'Submit'}
          </button>
        </div>
      )}

      {!assignment.canSubmit && grade?.label === 'NEEDS_WORK' && (
        <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
          You’ve used both submission attempts for this assignment.
        </p>
      )}
    </div>
  );
}
