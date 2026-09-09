'use client';

import { useState } from 'react';
import { gradeSubmissionAction } from './actions';

const GRADE_LABEL: Record<string, string> = {
  NEEDS_WORK: 'Needs work',
  GOOD: 'Good',
  EXCELLENT: 'Excellent',
};

export type SubmissionView = {
  id: string;
  studentName: string;
  studentEmail: string;
  moduleTitle: string;
  attemptNumber: number;
  isLate: boolean;
  bodyText: string;
  grade: { label: string; feedback: string } | null;
};

export function SubmissionsWorkspace({
  cohortId,
  submissions,
}: {
  cohortId: string;
  submissions: SubmissionView[];
}) {
  const firstUngraded = submissions.find((s) => !s.grade) ?? submissions[0];
  const [selectedId, setSelectedId] = useState<string | undefined>(firstUngraded?.id);
  const selected = submissions.find((s) => s.id === selectedId);
  const toGrade = submissions.filter((s) => !s.grade).length;

  return (
    <div className="subs">
      <div className="subs__queue">
        <div className="mono" style={{ marginBottom: 'var(--s2)' }}>
          Queue · {toGrade} to grade
        </div>
        {submissions.length === 0 && <div className="empty">No submissions in this program yet.</div>}
        {submissions.map((s) => (
          <button
            key={s.id}
            type="button"
            className="subs__item"
            aria-current={s.id === selectedId ? 'true' : undefined}
            onClick={() => setSelectedId(s.id)}
          >
            <div className="grow">
              <div style={{ fontWeight: 600 }} className="truncate">
                {s.studentName}
              </div>
              <div className="mono" style={{ marginTop: 2 }}>
                {s.moduleTitle} · attempt {s.attemptNumber}
              </div>
            </div>
            {s.grade ? (
              <span className="pill pill--done">Graded</span>
            ) : s.isLate ? (
              <span className="pill pill--late">Late</span>
            ) : (
              <span className="pill pill--due">To grade</span>
            )}
          </button>
        ))}
      </div>

      <div className="subs__detail">
        {!selected ? (
          <div className="empty">Pick a submission from the queue.</div>
        ) : (
          <>
            <div className="row row--between wrap">
              <div>
                <div className="display-sm">{selected.studentName}</div>
                <div className="mono" style={{ marginTop: 4 }}>
                  {selected.studentEmail}
                </div>
              </div>
              <div className="mono">
                {selected.moduleTitle} · attempt {selected.attemptNumber}
                {selected.isLate && ' · late'}
              </div>
            </div>

            <div className="subs__text">{selected.bodyText}</div>

            <form
              key={selected.id}
              action={gradeSubmissionAction.bind(null, {
                cohortId,
                submissionId: selected.id,
              })}
              className="stack"
            >
              <div className="field">
                <label className="mono">Grade</label>
                <select name="label" defaultValue={selected.grade?.label ?? ''} required>
                  <option value="" disabled>
                    Grade…
                  </option>
                  {Object.entries(GRADE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="mono">Feedback</label>
                <textarea
                  name="feedback"
                  defaultValue={selected.grade?.feedback ?? ''}
                  required
                  rows={4}
                  placeholder="What worked, what to improve…"
                />
              </div>
              <button type="submit" className="btn btn--primary self-start">
                {selected.grade ? 'Update grade' : 'Submit grade'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
