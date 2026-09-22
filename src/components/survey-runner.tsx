'use client';

import { useMemo, useState } from 'react';
import {
  evalLogic,
  type SurveyContent,
  type Question,
  type Answers,
  type AnswerValue,
} from '@/lib/survey-schema';

type SubmitFn = (data: { answers: Answers; complete: boolean }) => Promise<{ error?: string }>;

/**
 * Public survey runner: consent → one section per screen (with per-question
 * skip logic evaluated on Next) → ending. Anonymous; `submit` is absent in
 * admin preview mode.
 */
export function SurveyRunner({
  title,
  content,
  submit,
  preview = false,
}: {
  title: string;
  content: SurveyContent;
  submit?: SubmitFn;
  preview?: boolean;
}) {
  const sections = content.sections;
  const needsConsent = !!(content.consent?.body || content.consent?.require);
  const [phase, setPhase] = useState<'consent' | 'section' | 'ending'>(
    needsConsent ? 'consent' : 'section',
  );
  const [agreed, setAgreed] = useState(false);
  const [secIdx, setSecIdx] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sectionById = useMemo(() => {
    const m = new Map<string, number>();
    sections.forEach((s, i) => m.set(s.id, i));
    return m;
  }, [sections]);

  function setAnswer(qid: string, value: AnswerValue) {
    setAnswers((a) => ({ ...a, [qid]: value }));
    setError(null);
  }

  function validateSection(sec: (typeof sections)[number]): boolean {
    for (const q of sec.questions) {
      if (q.required) {
        const v = answers[q.id];
        const empty = v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
        if (empty) {
          setError('Please answer the required questions before continuing.');
          return false;
        }
      }
    }
    return true;
  }

  async function finish() {
    setPhase('ending');
    if (!preview && submit) {
      setSubmitting(true);
      const res = await submit({ answers, complete: true });
      setSubmitting(false);
      if (res.error) setError(res.error);
    }
  }

  function next() {
    const sec = sections[secIdx];
    if (!validateSection(sec)) return;

    // Skip logic: first triggered rule wins.
    for (const q of sec.questions) {
      const outcome = evalLogic(q, answers[q.id]);
      if (outcome?.skipToEnd) return void finish();
      if (outcome?.skipToSection && sectionById.has(outcome.skipToSection)) {
        setHistory((h) => [...h, secIdx]);
        setSecIdx(sectionById.get(outcome.skipToSection)!);
        setError(null);
        return;
      }
    }

    if (secIdx >= sections.length - 1) return void finish();
    setHistory((h) => [...h, secIdx]);
    setSecIdx(secIdx + 1);
    setError(null);
  }

  function back() {
    setError(null);
    if (history.length === 0) {
      if (needsConsent) setPhase('consent');
      return;
    }
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setSecIdx(prev);
  }

  const totalSteps = sections.length + (needsConsent ? 1 : 0);
  const stepNo =
    phase === 'consent' ? 0 : phase === 'ending' ? totalSteps : secIdx + (needsConsent ? 1 : 0);
  const pct = totalSteps ? Math.round((stepNo / totalSteps) * 100) : 0;

  return (
    <div className="srv-wrap">
      <div className="srv-card">
        <div className="srv-head contour">
          <div className="row row--between">
            <div className="p-topbar__brand">NetSifr</div>
            <div className="mono" style={{ color: 'var(--on-dark-faint)' }}>
              {content.estimatedTime}
            </div>
          </div>
          <div className="mono mono--onDark" style={{ marginTop: 6 }}>
            {title}
          </div>
          <div className="bar bar--onDark" style={{ marginTop: 'var(--s3)' }}>
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="srv-body stack">
          {phase === 'consent' && (
            <>
              <h1 className="display-md">{content.consent.heading || 'Before we begin'}</h1>
              {content.subtitle && <p className="lede">{content.subtitle}</p>}
              {content.consent.body && (
                <p style={{ whiteSpace: 'pre-wrap' }}>{content.consent.body}</p>
              )}
              {content.forWho && (
                <div className="card card--notice">
                  <span className="mono">Who this is for</span>
                  <p style={{ margin: '4px 0 0' }}>{content.forWho}</p>
                </div>
              )}
              {content.consent.require && (
                <label className="row" style={{ gap: 'var(--s2)' }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <span>{content.consent.acknowledgeLabel}</span>
                </label>
              )}
              <button
                type="button"
                className="btn btn--accent btn--block"
                disabled={content.consent.require && !agreed}
                onClick={() => setPhase('section')}
              >
                Start
              </button>
            </>
          )}

          {phase === 'section' && sections[secIdx] && (
            <>
              {sections[secIdx].kicker && (
                <div className="mono mono--coral">{sections[secIdx].kicker}</div>
              )}
              <h1 className="display-md">{sections[secIdx].title}</h1>
              {sections[secIdx].subtitle && <p className="lede">{sections[secIdx].subtitle}</p>}

              <div className="stack" style={{ gap: 'var(--s6)' }}>
                {sections[secIdx].questions.map((q) => (
                  <QuestionInput key={q.id} q={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
                ))}
              </div>

              {error && <p style={{ color: 'var(--coral)', fontSize: 14 }}>{error}</p>}

              <div className="row" style={{ gap: 'var(--s3)' }}>
                <button type="button" className="btn btn--ghost" onClick={back}>
                  Back
                </button>
                <button type="button" className="btn btn--primary grow" onClick={next}>
                  {secIdx >= sections.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </>
          )}

          {phase === 'ending' && (
            <div className="stack" style={{ textAlign: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: 44 }}>🎉</div>
              <h1 className="display-md">{content.ending.heading || 'Thank you.'}</h1>
              {content.ending.body && <p className="lede">{content.ending.body}</p>}
              {submitting && <p className="mono">Saving your response…</p>}
              {error && <p style={{ color: 'var(--coral)', fontSize: 14 }}>{error}</p>}
              {preview && <p className="mono">Preview — no response was recorded.</p>}
              {content.ending.ctaLabel && content.ending.ctaUrl && (
                <a href={content.ending.ctaUrl} className="btn btn--accent">
                  {content.ending.ctaLabel}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  const label = (
    <div>
      <div style={{ fontWeight: 600 }}>
        {q.title}
        {q.required && <span style={{ color: 'var(--coral)' }}> *</span>}
      </div>
      {q.help && (
        <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>
          {q.help}
        </div>
      )}
    </div>
  );

  const options = q.options ?? [];

  return (
    <div className="stack" style={{ gap: 'var(--s2)' }}>
      {label}

      {q.type === 'short_text' && (
        <input value={(value as string) ?? ''} placeholder={q.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {q.type === 'long_text' && (
        <textarea rows={4} value={(value as string) ?? ''} placeholder={q.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {q.type === 'number' && (
        <input type="number" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {q.type === 'date' && (
        <input type="date" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {q.type === 'email' && (
        <input type="email" value={(value as string) ?? ''} placeholder={q.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}

      {q.type === 'dropdown' && (
        <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose…</option>
          {options.map((o) => (
            <option key={o.id} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {(q.type === 'single_select' || q.type === 'yes_no') && (
        <div className="stack" style={{ gap: 6 }}>
          {(q.type === 'yes_no' ? [{ id: 'y', label: 'Yes', value: 'Yes' }, { id: 'n', label: 'No', value: 'No' }] : options).map((o) => (
            <button
              key={o.id}
              type="button"
              className="option"
              aria-pressed={value === o.value}
              onClick={() => onChange(o.value)}
            >
              <span className="dot" />
              {o.label}
            </button>
          ))}
        </div>
      )}

      {q.type === 'multi_select' && (
        <div className="stack" style={{ gap: 6 }}>
          {options.map((o) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            const checked = arr.includes(o.value);
            return (
              <button
                key={o.id}
                type="button"
                className="option"
                aria-pressed={checked}
                onClick={() => onChange(checked ? arr.filter((v) => v !== o.value) : [...arr, o.value])}
              >
                <span className="dot" style={{ borderRadius: 4 }} />
                {o.label}
              </button>
            );
          })}
        </div>
      )}

      {q.type === 'scale' && q.scale && (
        <div>
          <div className="row wrap" style={{ gap: 6 }}>
            {Array.from({ length: q.scale.max - q.scale.min + 1 }, (_, i) => q.scale!.min + i).map((n) => (
              <button
                key={n}
                type="button"
                className={`btn btn--sm ${value === n ? 'btn--primary' : 'btn--ghost'}`}
                style={{ minWidth: 44 }}
                onClick={() => onChange(n)}
              >
                {n}
              </button>
            ))}
          </div>
          {(q.scale.minLabel || q.scale.maxLabel) && (
            <div className="row row--between mono" style={{ marginTop: 4 }}>
              <span>{q.scale.minLabel}</span>
              <span>{q.scale.maxLabel}</span>
            </div>
          )}
        </div>
      )}

      {q.type === 'rating' && (
        <div className="row" style={{ gap: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              onClick={() => onChange(n)}
              style={{ fontSize: 28, color: (value as number) >= n ? 'var(--coral)' : 'var(--fill-disabled)' }}
            >
              ★
            </button>
          ))}
        </div>
      )}

      {q.type === 'ranking' && (
        <RankingInput options={options.map((o) => o.value)} value={Array.isArray(value) ? (value as string[]) : options.map((o) => o.value)} onChange={onChange} />
      )}
    </div>
  );
}

function RankingInput({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const order = value.length ? value : options;
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[j], next[i]] = [next[i], next[j]];
    onChange(next);
  }
  return (
    <div className="stack" style={{ gap: 6 }}>
      {order.map((v, i) => (
        <div key={v} className="row" style={{ gap: 8, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--r-item)' }}>
          <span className="mono">{i + 1}</span>
          <span className="grow">{v}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => move(i, -1)}>↑</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => move(i, 1)}>↓</button>
        </div>
      ))}
    </div>
  );
}
