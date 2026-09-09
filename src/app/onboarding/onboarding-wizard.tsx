'use client';

import { useState, useTransition } from 'react';
import { AVATARS } from '@/lib/avatars';
import { PERSONA_QUESTIONS } from './persona-questions';
import { completeOnboardingAction } from './actions';

type Topic = { id: string; label: string };

// Mirrors computePersonaIndex in src/modules/identity/onboarding.ts (which is
// server-only and can't be imported here): majority vote over the three
// answers, ties broken toward the lowest index.
function computePersonaIndex(answers: Array<number | null>): number {
  const counts = [0, 0, 0];
  for (const a of answers) if (a !== null && a >= 0 && a <= 2) counts[a]++;
  return counts.indexOf(Math.max(...counts));
}

// Option position → mark colour, matching the prototype's persona quiz.
const OPTION_COLORS = ['var(--mint)', 'var(--coral)', 'var(--pine)'];
const PERSONA_COLORS = ['var(--mint)', 'var(--coral)', 'var(--pine)'];

export function OnboardingWizard({
  defaultName,
  topics,
  personas,
}: {
  defaultName: string;
  topics: Topic[];
  personas: string[];
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(defaultName);
  const [avatarKey, setAvatarKey] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>([null, null, null]);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const canGoNext =
    step === 1 ||
    (step === 2 && name.trim().length > 0) ||
    (step === 3 && answers[qIndex] !== null) ||
    step === 4;

  function next() {
    setError(undefined);
    if (step === 3) {
      if (answers[qIndex] === null) return;
      if (qIndex < 2) return setQIndex(qIndex + 1);
      return setStep(4);
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
    if (step === 3 && qIndex > 0) return setQIndex(qIndex - 1);
    setStep(Math.max(1, step - 1));
  }

  const personaIndex = computePersonaIndex(answers);
  const nextLabel =
    step === 1
      ? 'Let’s go'
      : step === 3
        ? qIndex < 2
          ? 'Next question'
          : 'See my persona'
        : step === 4
          ? pending
            ? 'Finishing…'
            : 'Go to my programs'
          : 'Continue';
  const nextAccent = step === 1 || step === 4;

  return (
    <div className="join">
      <div className="join__card">
        <div className="join__head contour">
          <div className="row row--between">
            <div className="p-topbar__brand">NetSifr</div>
            <div className="mono" style={{ color: 'var(--on-dark-faint)' }}>
              Step {step} of 4
            </div>
          </div>
          <div className="join__steps" style={{ marginTop: 'var(--s4)' }}>
            {[1, 2, 3, 4].map((s) => (
              <i key={s} className={s <= step ? 'on' : ''} />
            ))}
          </div>
          <div className="mono mono--onDark" style={{ marginTop: 'var(--s4)' }}>
            Setting up your NetSifr account
          </div>
        </div>

        <div className="join__body stack">
          {step === 1 && (
            <>
              <div className="placeholder" style={{ height: 220 }}>
                <span className="play">▶</span>
                <span className="mono mono--onDark">Welcome from the team · 0:48</span>
              </div>
              <h2 className="display-md">Set up your account</h2>
              <p className="lede">
                This profile is yours across every NetSifr program — this one, and any you’re invited
                to later. Two minutes.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h2 className="display-md">Who’s joining us?</h2>
                <p className="muted" style={{ marginTop: 4 }}>
                  This is what your cohort will see.
                </p>
              </div>
              <div className="field">
                <label htmlFor="ob-name" className="mono">
                  Full name
                </label>
                <input
                  id="ob-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="field">
                <label className="mono">Pick an avatar — or upload</label>
                <div className="avatar-grid">
                  {AVATARS.map((a, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatarKey(i)}
                      aria-label={`Avatar ${i + 1}`}
                      aria-pressed={avatarKey === i}
                      className="avatar-pick"
                      style={{ background: a.bg, color: a.fg }}
                    >
                      {a.glyph}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="avatar-pick avatar-pick--upload"
                    aria-label="Upload a photo"
                  >
                    +
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="mono mono--coral">
                Your climate persona · question {qIndex + 1} of 3
              </div>
              <h2 className="display-md">{PERSONA_QUESTIONS[qIndex].prompt}</h2>
              <div className="persona-grid">
                {PERSONA_QUESTIONS[qIndex].options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    type="button"
                    aria-pressed={answers[qIndex] === oIndex}
                    onClick={() => {
                      const nextAnswers = [...answers];
                      nextAnswers[qIndex] = oIndex;
                      setAnswers(nextAnswers);
                    }}
                    className="persona-card"
                  >
                    <span
                      className="persona-card__swatch"
                      style={{ background: OPTION_COLORS[oIndex] }}
                    />
                    <div className="title">{option.title}</div>
                    <div className="muted" style={{ fontSize: 14 }}>
                      {option.desc}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mono">Not graded — it just becomes your cohort tag</div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="card card--dark row" style={{ gap: 'var(--s4)' }}>
                <span
                  className="avatar avatar--lg"
                  style={{ background: PERSONA_COLORS[personaIndex], color: 'var(--fg-on-coral)' }}
                >
                  ◉
                </span>
                <div>
                  <div className="mono mono--onDark">You are a</div>
                  <div className="display-md" style={{ color: 'var(--fg-on-dark)' }}>
                    {personas[personaIndex] ?? 'Member'}
                  </div>
                </div>
              </div>
              <div>
                <h2 className="display-md">What are you here for?</h2>
                <p className="muted" style={{ marginTop: 4 }}>
                  Used to suggest future programs. {topicIds.length} chosen.
                </p>
              </div>
              <div className="row wrap" style={{ gap: 'var(--s2)' }}>
                {topics.map((topic) => {
                  const selected = topicIds.includes(topic.id);
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      aria-pressed={selected}
                      className="chip"
                      onClick={() =>
                        setTopicIds((ids) =>
                          selected ? ids.filter((id) => id !== topic.id) : [...ids, topic.id],
                        )
                      }
                    >
                      {topic.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {error && (
            <p style={{ color: 'var(--coral)', fontSize: 14 }} role="alert">
              {error}
            </p>
          )}

          <div className="row" style={{ gap: 'var(--s3)', marginTop: 'var(--s2)' }}>
            {step > 1 && (
              <button type="button" onClick={back} className="btn btn--ghost">
                Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              disabled={!canGoNext || pending}
              className={`btn btn--block grow ${nextAccent ? 'btn--accent' : 'btn--primary'}`}
            >
              {nextLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
