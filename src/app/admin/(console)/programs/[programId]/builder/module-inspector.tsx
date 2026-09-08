'use client';

import { useActionState } from 'react';
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

export function ModuleInspector(props: {
  programId: string;
  weekId: string;
  module: { id: string; title: string; isPublished: boolean } | undefined;
  detail: ModuleDetail | undefined;
  locked: boolean;
}) {
  const { programId, weekId, module: mod, detail, locked } = props;
  const [state, action, pending] = useActionState(saveModuleAction, undefined);

  if (!mod || !detail) {
    return (
      <div className="w-80 flex-none border-l border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">
        Select a module to edit it.
      </div>
    );
  }

  return (
    <div className="flex w-80 flex-none flex-col gap-4 overflow-y-auto border-l border-zinc-200 bg-zinc-50 p-5">
      <div className="font-mono text-[10px] tracking-wide text-zinc-500">MODULE INSPECTOR</div>

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="moduleId" value={mod.id} />
        <input type="hidden" name="weekId" value={weekId} />
        <input type="hidden" name="programId" value={programId} />
        <input type="hidden" name="type" value={detail.type} />

        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] text-zinc-500">TITLE</label>
          <input
            name="title"
            defaultValue={mod.title}
            disabled={locked}
            className="rounded border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
          />
        </div>

        {detail.type === 'RECORDING' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] text-zinc-500">GOOGLE DRIVE FILE ID</label>
              <input
                name="driveFileId"
                defaultValue={detail.driveFileId}
                disabled={locked}
                className="rounded border border-zinc-300 px-3 py-2 font-mono text-xs disabled:bg-zinc-100"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] text-zinc-500">
                ATTENDANCE RULE OVERRIDE (MINUTES, BLANK = USE PROGRAM DEFAULT)
              </label>
              <input
                name="unlockMinutesOverride"
                type="number"
                min={0}
                defaultValue={detail.unlockMinutesOverride ?? ''}
                disabled={locked}
                className="rounded border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
              />
            </div>
          </>
        )}

        {detail.type === 'READING' && (
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] text-zinc-500">CONTENT URL</label>
            <input
              name="contentUrl"
              defaultValue={detail.contentUrl}
              disabled={locked}
              className="rounded border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
            />
          </div>
        )}

        {detail.type === 'ASSIGNMENT' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] text-zinc-500">PROMPT</label>
              <textarea
                name="prompt"
                defaultValue={detail.prompt}
                disabled={locked}
                rows={4}
                className="rounded border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] text-zinc-500">SOFT DEADLINE</label>
              <input
                name="softDeadline"
                type="datetime-local"
                defaultValue={detail.softDeadline}
                disabled={locked}
                className="rounded border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
              />
            </div>
          </>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPublished" defaultChecked={mod.isPublished} />
          Published
        </label>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save module'}
        </button>
      </form>

      <form action={deleteModuleAction.bind(null, { moduleId: mod.id, weekId, programId })}>
        <button type="submit" className="w-full rounded border border-zinc-300 px-3 py-2 text-sm">
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
