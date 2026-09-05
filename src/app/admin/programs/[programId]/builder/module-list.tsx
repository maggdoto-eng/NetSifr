import Link from 'next/link';
import { addModuleAction, moveModuleAction, toggleModulePublishAction } from './actions';

const TYPE_META: Record<string, { icon: string; label: string }> = {
  RECORDING: { icon: '▶', label: 'RECORDING' },
  READING: { icon: '▤', label: 'READING' },
  QUIZ: { icon: '◉', label: 'QUIZ' },
  ASSIGNMENT: { icon: '✎', label: 'ASSIGNMENT' },
};

const ADD_TYPES: Array<{ type: 'RECORDING' | 'READING' | 'QUIZ' | 'ASSIGNMENT'; label: string }> = [
  { type: 'RECORDING', label: 'Recording' },
  { type: 'READING', label: 'Reading' },
  { type: 'QUIZ', label: 'Quiz' },
  { type: 'ASSIGNMENT', label: 'Assignment' },
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
    return <div className="flex-1 p-6 text-sm text-zinc-500">Add a week to get started.</div>;
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
      <div>
        <div className="font-mono text-[10px] tracking-wide text-zinc-500">WEEK</div>
        <h2 className="mt-1 text-xl font-bold">{weekTitle}</h2>
      </div>

      <div className="flex flex-col gap-2">
        {modules.map((module, index) => {
          const meta = TYPE_META[module.type];
          return (
            <div
              key={module.id}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                module.id === selectedModuleId ? 'border-zinc-900' : 'border-zinc-200'
              }`}
            >
              {!locked && (
                <div className="flex flex-none flex-col text-xs text-zinc-400">
                  <form
                    action={moveModuleAction.bind(null, {
                      weekId,
                      moduleId: module.id,
                      direction: 'up',
                      programId,
                    })}
                  >
                    <button type="submit" disabled={index === 0} className="disabled:opacity-30">
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
                      className="disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </form>
                </div>
              )}
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-zinc-100 text-base">
                {meta?.icon}
              </span>
              <Link
                href={`/admin/programs/${programId}/builder?week=${weekId}&module=${module.id}`}
                className="min-w-0 flex-1"
              >
                <div className="truncate text-sm font-semibold">{module.title}</div>
                <div className="font-mono text-[10px] text-zinc-500">{meta?.label}</div>
              </Link>
              <form action={toggleModulePublishAction.bind(null, module.id, programId)}>
                <button
                  type="submit"
                  className={`rounded px-2 py-1 font-mono text-[10px] ${
                    module.isPublished
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-zinc-200 text-zinc-600'
                  }`}
                >
                  {module.isPublished ? 'PUBLISHED' : 'DRAFT'}
                </button>
              </form>
            </div>
          );
        })}
      </div>

      {!locked && (
        <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 p-4">
          <span className="font-mono text-[11px] text-zinc-500">ADD MODULE</span>
          <div className="flex gap-2">
            {ADD_TYPES.map((t) => (
              <form
                key={t.type}
                action={addModuleAction.bind(null, { weekId, type: t.type, programId })}
              >
                <button
                  type="submit"
                  className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1 text-sm"
                >
                  {t.label}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {locked && (
        <p className="rounded-lg bg-zinc-100 p-3 text-xs text-zinc-600">
          This program has learner activity, so its content is locked. Publish a new version to make
          content changes (not built yet — publish state can still be toggled above).
        </p>
      )}
    </div>
  );
}
