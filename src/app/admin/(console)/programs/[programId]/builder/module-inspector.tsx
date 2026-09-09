'use client';

import { useActionState, useState } from 'react';
import { saveModuleAction, deleteModuleAction } from './actions';
import { QuizQuestionsEditor } from './quiz-questions-editor';

export type ModuleDetail =
  | { type: 'RECORDING'; driveFileId: string; unlockMinutesOverride: number | null }
  | { type: 'READING'; contentUrl: string }
  | { type: 'ASSIGNMENT'; prompt: string; softDeadline: string }
  | {
      type: 'QUIZ';
      quizModuleId: string;
      questions: Array<{ prompt: string; options: Array<{ label: string; isCorrect: boolean }> }>;
    };

const TYPE_META: Record<string, { icon: string; label: string; cls: string }> = {
  RECORDING: { icon: '▶', label: 'Recording', cls: 'mod-icon--recording' },
  READING: { icon: '▤', label: 'Reading', cls: 'mod-icon--reading' },
  QUIZ: { icon: '◉', label: 'Quiz', cls: 'mod-icon--quiz' },
  ASSIGNMENT: { icon: '✎', label: 'Assignment', cls: 'mod-icon--assignment' },
};

export function ModuleInspector(props: {
  programId: string;
  weekId: string;
  module: { id: string; title: string; isPublished: boolean } | undefined;
  detail: ModuleDetail | undefined;
  locked: boolean;
}) {
  const { programId, weekId, module: mod, detail, locked } = props;
  const [state, action, pending] = useActionState(saveModuleAction, undefined);
  const [published, setPublished] = useState(mod?.isPublished ?? false);

  if (!mod || !detail) {
    return (
      <div className="builder__inspector">
        <div className="muted" style={{ fontSize: 14 }}>
          Select a module to edit it.
        </div>
      </div>
    );
  }

  const meta = TYPE_META[detail.type];

  return (
    <div className="builder__inspector">
      <div className="mono">Module inspector</div>

      <div className="row">
        <span className={`mod-icon ${meta?.cls ?? ''}`}>{meta?.icon}</span>
        <div className="title">{meta?.label}</div>
      </div>

      <form action={action} className="stack" style={{ gap: 'var(--s4)' }}>
        <input type="hidden" name="moduleId" value={mod.id} />
        <input type="hidden" name="weekId" value={weekId} />
        <input type="hidden" name="programId" value={programId} />
        <input type="hidden" name="type" value={detail.type} />

        <div className="field">
          <label className="mono">Title</label>
          <input name="title" defaultValue={mod.title} disabled={locked} />
        </div>

        {detail.type === 'RECORDING' && (
          <>
            <div className="field">
              <label className="mono">Google Drive file ID</label>
              <input
                name="driveFileId"
                defaultValue={detail.driveFileId}
                disabled={locked}
                className="figure"
                style={{ fontSize: 13 }}
              />
              <span className="mono" style={{ color: 'var(--pine)' }}>
                Sharing must be “anyone with the link · viewer”
              </span>
            </div>
            <div className="field">
              <label className="mono">Attendance rule · this program</label>
              <div className="row">
                <span style={{ fontSize: 14 }}>Self-mark after</span>
                <input
                  name="unlockMinutesOverride"
                  type="number"
                  min={0}
                  defaultValue={detail.unlockMinutesOverride ?? ''}
                  disabled={locked}
                  placeholder="default"
                  style={{ width: 90 }}
                />
                <span className="mono">min</span>
              </div>
            </div>
            <div className="placeholder" style={{ height: 130 }}>
              <span className="mono mono--onDark">Embed preview</span>
            </div>
          </>
        )}

        {detail.type === 'READING' && (
          <div className="field">
            <label className="mono">Content URL</label>
            <input name="contentUrl" defaultValue={detail.contentUrl} disabled={locked} />
          </div>
        )}

        {detail.type === 'ASSIGNMENT' && (
          <>
            <div className="field">
              <label className="mono">Prompt</label>
              <textarea name="prompt" defaultValue={detail.prompt} disabled={locked} rows={4} />
            </div>
            <div className="field">
              <label className="mono">Soft deadline</label>
              <input
                name="softDeadline"
                type="datetime-local"
                defaultValue={detail.softDeadline}
                disabled={locked}
              />
            </div>
          </>
        )}

        <div className="card row row--between" style={{ padding: 'var(--s3) var(--s4)' }}>
          <span style={{ fontWeight: 600 }}>Published</span>
          <button
            type="button"
            className="switch"
            role="switch"
            aria-checked={published}
            aria-disabled={locked}
            onClick={() => !locked && setPublished((p) => !p)}
          >
            <i />
          </button>
          {published && <input type="hidden" name="isPublished" value="on" />}
        </div>

        {state?.error && <p style={{ color: 'var(--coral)', fontSize: 14 }}>{state.error}</p>}

        <button type="submit" disabled={pending} className="btn btn--primary btn--block">
          {pending ? 'Saving…' : 'Save module'}
        </button>
      </form>

      <form action={deleteModuleAction.bind(null, { moduleId: mod.id, weekId, programId })}>
        <button type="submit" className="btn btn--ghost btn--block">
          Delete module
        </button>
      </form>

      {detail.type === 'QUIZ' && (
        <QuizQuestionsEditor
          programId={programId}
          quizModuleId={detail.quizModuleId}
          initialQuestions={detail.questions}
          locked={locked}
        />
      )}
    </div>
  );
}
