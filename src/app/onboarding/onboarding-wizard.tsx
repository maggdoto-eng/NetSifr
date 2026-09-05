'use client';

import { useState, useTransition } from 'react';
import { AVATARS } from '@/lib/avatars';
import { PERSONA_QUESTIONS } from './persona-questions';
import { completeOnboardingAction } from './actions';

type Topic = { id: string; label: string };

export function OnboardingWizard({
  defaultName,
  topics,
}: {
  defaultName: string;
  topics: Topic[];
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(defaultName);
  const [avatarKey, setAvatarKey] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>([null, null, null]);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const canGoBack = step > 1;
  const canGoNext =
    step === 1 ||
    (step === 2 && name.trim().length > 0) ||
    (step === 3 && answers[qIndex] !== null) ||
    step === 4;

  function next() {
    setError(undefined);
    if (step === 3) {
      if (answers[qIndex] === null) return;
      if (qIndex < 2) {
        setQIndex(qIndex + 1);
        return;
      }
      setStep(4);
      return;
    }
    if (step === 4) {
      startTransition(async () => {
        const validAnswers = answers.filter((a): a is number => a !== null);
        const result = await completeOnboardingAction({
          name: name.trim(),
          avatarKey,
          personaAnswers: validAnswers,
          topicIds,
        });
        if (result?.error) setError(result.error);
      });
      return;
    }
    setStep(step + 1);
  }

  function back() {
    setError(undefined);
    if (step === 3 && qIndex > 0) {
      setQIndex(qIndex - 1);
      return;
    }
    setStep(Math.max(1, step - 1));
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold">NetSifr</div>
        <div className="font-mono text-xs text-zinc-500">STEP {step} / 4</div>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-zinc-900' : 'bg-zinc-200'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold">You&apos;re in.</h1>
          <p className="text-sm text-zinc-600">
            Set up your NetSifr account once. It carries across every program you join — this one,
            and any you&apos;re invited to later.
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-bold">Who&apos;s joining us?</h1>
            <p className="mt-1 text-sm text-zinc-600">One profile, every program.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] text-zinc-500">FULL NAME</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="rounded-xl border-2 border-zinc-900 px-4 py-3 text-base"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[10px] text-zinc-500">PICK AN AVATAR</label>
            <div className="grid grid-cols-4 gap-3">
              {AVATARS.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAvatarKey(i)}
                  aria-label={`Avatar ${i + 1}`}
                  className={`flex aspect-square items-center justify-center rounded-2xl text-xl ${
                    avatarKey === i ? 'ring-2 ring-offset-2 ring-zinc-900' : ''
                  }`}
                  style={{ background: a.bg, color: a.fg }}
                >
                  {a.glyph}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div className="font-mono text-[10px] text-orange-600">
            YOUR CLIMATE PERSONA · Q{qIndex + 1} OF 3
          </div>
          <h1 className="text-xl font-bold">{PERSONA_QUESTIONS[qIndex].prompt}</h1>
          <div className="flex flex-col gap-2.5">
            {PERSONA_QUESTIONS[qIndex].options.map((option, oIndex) => (
              <button
                key={oIndex}
                type="button"
                onClick={() => {
                  const next = [...answers];
                  next[qIndex] = oIndex;
                  setAnswers(next);
                }}
                className={`rounded-xl border-2 p-3 text-left ${
                  answers[qIndex] === oIndex ? 'border-zinc-900' : 'border-zinc-200'
                }`}
              >
                <div className="font-semibold">{option.title}</div>
                <div className="text-sm text-zinc-500">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-bold">What are you here for?</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Used to suggest programs later. ({topicIds.length} chosen)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => {
              const selected = topicIds.includes(topic.id);
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() =>
                    setTopicIds((ids) =>
                      selected ? ids.filter((id) => id !== topic.id) : [...ids, topic.id],
                    )
                  }
                  className={`rounded-full border-2 px-3 py-1.5 text-sm ${
                    selected ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200'
                  }`}
                >
                  {topic.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="mt-auto flex gap-3 pt-4">
        {canGoBack && (
          <button
            type="button"
            onClick={back}
            className="rounded-xl border-2 border-zinc-200 px-4 py-3 font-semibold"
          >
            ←
          </button>
        )}
        <button
          type="button"
          onClick={next}
          disabled={!canGoNext || pending}
          className="flex-1 rounded-xl bg-zinc-900 py-3 font-semibold text-white disabled:opacity-50"
        >
          {step === 4 ? (pending ? 'Finishing…' : 'Finish') : 'Continue'}
        </button>
      </div>
    </div>
  );
}
