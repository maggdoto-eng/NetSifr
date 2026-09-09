import Link from 'next/link';
import { addModuleAction, moveModuleAction, toggleModulePublishAction } from './actions';

const TYPE_META: Record<string, { icon: string; label: string; cls: string }> = {
  RECORDING: { icon: '▶', label: 'Recording', cls: 'mod-icon--recording' },
  READING: { icon: '▤', label: 'Reading', cls: 'mod-icon--reading' },
  QUIZ: { icon: '◉', label: 'Quiz', cls: 'mod-icon--quiz' },
  ASSIGNMENT: { icon: '✎', label: 'Assignment', cls: 'mod-icon--assignment' },
};

const ADD_TYPES: Array<{ type: 'RECORDING' | 'READING' | 'QUIZ' | 'ASSIGNMENT'; label: string }> = [
  { type: 'RECORDING', label: '▶ Recording' },
  { type: 'READING', label: '▤ Reading' },
  { type: 'QUIZ', label: '◉ Quiz' },
  { type: 'ASSIGNMENT', label: '✎ Assignment' },
];

export function ModuleList(props: {
  programId: string;
  weekId: string | undefined;
  weekTitle: string | undefined;
  modules: Array<{ id: string; type: string; title: string; isPublished: boolean }>;
  selectedModuleId: string | undefined;
  locked: boolean;
}) {
  const { programId, weekId, weekTitle, modules, selectedModuleId, locked } = props;

  if (!weekId) {
    return (
      <div className="builder__canvas">
        <div className="empty">Add a week to get started.</div>
      </div>
    );
  }

  return (
    <div className="builder__canvas">
      <div>
        <div className="mono">Editing week</div>
        <h2 className="display-md" style={{ marginTop: 4 }}>
          {weekTitle}
        </h2>
      </div>

      <div className="col" style={{ gap: 'var(--s3)' }}>
        {modules.map((module, index) => {
          const meta = TYPE_META[module.type];
          return (
            <div
              key={module.id}
              className="builder__row"
              aria-current={module.id === selectedModuleId ? 'true' : undefined}
            >
              {!locked && (
                <span className="col" style={{ gap: 0 }}>
                  <form
                    action={moveModuleAction.bind(null, {
                      weekId,
                      moduleId: module.id,
                      direction: 'up',
                      programId,
                    })}
                  >
                    <button type="submit" disabled={index === 0} aria-label="Move up" style={{ fontSize: 9, opacity: index === 0 ? 0.3 : 0.6 }}>
                      ▲
                    </button>
                  </form>
                  <form
                    action={moveModuleAction.bind(null, {
                      weekId,
                      moduleId: module.id,
                      direction: 'down',
                      programId,
                    })}
                  >
                    <button
                      type="submit"
                      disabled={index === modules.length - 1}
                      aria-label="Move down"
                      style={{ fontSize: 9, opacity: index === modules.length - 1 ? 0.3 : 0.6 }}
                    >
                      ▼
                    </button>
                  </form>
                </span>
              )}
              <span className={`mod-icon ${meta?.cls ?? ''}`}>{meta?.icon}</span>
              <Link
                href={`/admin/programs/${programId}/builder?week=${weekId}&module=${module.id}`}
                className="grow truncate"
                style={{ color: 'inherit' }}
              >
                <div style={{ fontWeight: 700 }} className="truncate">
                  {module.title}
                </div>
                <div className="mono" style={{ marginTop: 2 }}>
                  {meta?.label}
                </div>
              </Link>
              <form action={toggleModulePublishAction.bind(null, module.id, programId)}>
                <button
                  type="submit"
                  className={module.isPublished ? 'pill pill--done' : 'pill pill--draft'}
                  style={{ cursor: 'pointer' }}
                >
                  {module.isPublished ? 'Published' : 'Draft'}
                </button>
              </form>
            </div>
          );
        })}
      </div>

      {!locked ? (
        <div className="builder__add">
          <span className="mono">Add module</span>
          {ADD_TYPES.map((t) => (
            <form key={t.type} action={addModuleAction.bind(null, { weekId, type: t.type, programId })}>
              <button type="submit" className="btn btn--ghost btn--sm">
                {t.label}
              </button>
            </form>
          ))}
        </div>
      ) : (
        <div className="card card--notice">
          This program has learner activity, so its content is locked. Publish a new version to make
          content changes (not built yet — publish state can still be toggled above).
        </div>
      )}

      <div className="card card--notice">
        Structure is shared across programs — <strong>Program → Week → Module</strong>. Content,
        roster and settings belong to one program, so a new cohort is a new program, not a new build.
        Unpublishing a module hides it from participants immediately.
      </div>
    </div>
  );
}
