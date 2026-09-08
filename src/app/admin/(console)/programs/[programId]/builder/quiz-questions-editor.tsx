'use client';

import { useState, useTransition } from 'react';
import { saveQuizQuestionsAction } from './actions';

type Option = { label: string; isCorrect: boolean };
type Question = { prompt: string; options: Option[] };

const BLANK_QUESTION = (): Question => ({
  prompt: '',
  options: [
    { label: '', isCorrect: true },
    { label: '', isCorrect: false },
    { label: '', isCorrect: false },
  ],
});

export function QuizQuestionsEditor(props: {
  programId: string;
  quizModuleId: string;
  initialQuestions: Question[];
  locked: boolean;
}) {
  const [questions, setQuestions] = useState<Question[]>(
    props.initialQuestions.length > 0 ? props.initialQuestions : [BLANK_QUESTION()],
  );
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function updateQuestion(index: number, patch: Partial<Question>) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateOption(qIndex: number, oIndex: number, patch: Partial<Option>) {
    setQuestions((qs) =>
      qs.map((q, i) =>
        i !== qIndex
          ? q
          : {
              ...q,
              options: q.options.map((o, j) => (j === oIndex ? { ...o, ...patch } : o)),
            },
      ),
    );
  }

  function setCorrectOption(qIndex: number, oIndex: number) {
    setQuestions((qs) =>
      qs.map((q, i) =>
        i !== qIndex
          ? q
          : { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oIndex })) },
      ),
    );
  }

  function save() {
    setError(undefined);
    startTransition(async () => {
      const result = await saveQuizQuestionsAction({
        quizModuleId: props.quizModuleId,
        programId: props.programId,
        questionsJson: JSON.stringify(questions),
      });
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4">
      <div className="font-mono text-[10px] tracking-wide text-zinc-500">QUESTIONS</div>

      {questions.map((question, qIndex) => (
        <div
          key={qIndex}
          className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3"
        >
          <div className="flex items-start gap-2">
            <textarea
              value={question.prompt}
              onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
              disabled={props.locked}
              placeholder="Question prompt"
              rows={2}
              className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm disabled:bg-zinc-100"
            />
            {!props.locked && questions.length > 1 && (
              <button
                type="button"
                onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qIndex))}
                className="text-xs text-zinc-400"
              >
                remove
              </button>
            )}
          </div>
          {question.options.map((option, oIndex) => (
            <label key={oIndex} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`correct-${qIndex}`}
                checked={option.isCorrect}
                onChange={() => setCorrectOption(qIndex, oIndex)}
                disabled={props.locked}
              />
              <input
                value={option.label}
                onChange={(e) => updateOption(qIndex, oIndex, { label: e.target.value })}
                disabled={props.locked}
                placeholder={`Option ${oIndex + 1}`}
                className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm disabled:bg-zinc-100"
              />
            </label>
          ))}
        </div>
      ))}

      {!props.locked && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setQuestions((qs) => [...qs, BLANK_QUESTION()])}
            className="text-sm text-zinc-500 underline"
          >
            + Add question
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save questions'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
