'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  QUESTION_TYPES,
  TYPE_META,
  blankSection,
  blankQuestion,
  uid,
  type SurveyContent,
  type Section,
  type Question,
  type QuestionType,
} from '@/lib/survey-schema';
import { saveSurveyAction } from '../../actions';

type Draft = { title: string; slug: string; content: SurveyContent };

export function SurveyBuilder({
  surveyId,
  initial,
  status,
}: {
  surveyId: string;
  initial: Draft;
  status: string;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const c = draft.content;
  function setContent(patch: Partial<SurveyContent>) {
    setDraft((d) => ({ ...d, content: { ...d.content, ...patch } }));
  }
  function mutSections(fn: (sections: Section[]) => Section[]) {
    setContent({ sections: fn(structuredClone(c.sections)) });
  }
  function mutQuestion(si: number, qi: number, fn: (q: Question) => void) {
    mutSections((secs) => {
      fn(secs[si].questions[qi]);
      return secs;
    });
  }

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveSurveyAction(surveyId, draft);
      if (res.error) setMsg(res.error);
      else {
        if (res.slug) setDraft((d) => ({ ...d, slug: res.slug! }));
        setMsg('Saved ✓');
      }
    });
  }

  return (
    <>
      <div className="a-topbar">
        <div className="a-crumb">
          <Link href="/admin/surveys" style={{ color: 'var(--coral)' }}>
            Surveys
          </Link>
          <span className="sep">/</span>
          <span>{draft.title || 'Untitled'}</span>
          <span className={status === 'PUBLISHED' ? 'pill pill--live' : 'pill pill--draft'}>
            {status}
          </span>
        </div>
        <div className="row" style={{ gap: 'var(--s2)' }}>
          {msg && (
            <span className="mono" style={{ color: msg.startsWith('Saved') ? 'var(--pine)' : 'var(--coral)' }}>
              {msg}
            </span>
          )}
          <Link href={`/admin/surveys/${surveyId}/preview`} className="btn btn--ghost btn--sm" target="_blank">
            Preview
          </Link>
          <button type="button" onClick={save} disabled={pending} className="btn btn--primary btn--sm">
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="a-main stack" style={{ maxWidth: 820 }}>
        {/* Survey meta */}
        <div className="card stack">
          <div className="field">
            <label className="mono">Survey title</label>
            <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
          </div>
          <div className="field">
            <label className="mono">Subtitle</label>
            <input value={c.subtitle} onChange={(e) => setContent({ subtitle: e.target.value })} />
          </div>
          <div className="row" style={{ gap: 'var(--s3)', alignItems: 'flex-start' }}>
            <div className="field grow">
              <label className="mono">Who it’s for</label>
              <input value={c.forWho} onChange={(e) => setContent({ forWho: e.target.value })} />
            </div>
            <div className="field" style={{ width: 160 }}>
              <label className="mono">Est. time</label>
              <input value={c.estimatedTime} onChange={(e) => setContent({ estimatedTime: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label className="mono">Public link slug</label>
            <input value={draft.slug} onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))} />
            <span className="mono" style={{ marginTop: 2 }}>
              /s/{draft.slug}
            </span>
          </div>
        </div>

        {/* Consent */}
        <div className="card stack">
          <div className="title">Consent screen</div>
          <div className="field">
            <label className="mono">Heading</label>
            <input value={c.consent.heading} onChange={(e) => setContent({ consent: { ...c.consent, heading: e.target.value } })} />
          </div>
          <div className="field">
            <label className="mono">Body</label>
            <textarea rows={3} value={c.consent.body} onChange={(e) => setContent({ consent: { ...c.consent, body: e.target.value } })} />
          </div>
          <label className="row" style={{ gap: 'var(--s2)' }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={c.consent.require}
              onChange={(e) => setContent({ consent: { ...c.consent, require: e.target.checked } })}
            />
            <span>Require an explicit agreement checkbox</span>
          </label>
        </div>

        {/* Sections */}
        {c.sections.map((sec, si) => (
          <div key={sec.id} className="card stack" style={{ borderColor: 'var(--border-strong)' }}>
            <div className="row row--between">
              <div className="mono mono--coral">Section {si + 1}</div>
              <div className="row" style={{ gap: 6 }}>
                <button type="button" className="btn btn--ghost btn--sm" disabled={si === 0}
                  onClick={() => mutSections((s) => { [s[si - 1], s[si]] = [s[si], s[si - 1]]; return s; })}>↑</button>
                <button type="button" className="btn btn--ghost btn--sm" disabled={si === c.sections.length - 1}
                  onClick={() => mutSections((s) => { [s[si + 1], s[si]] = [s[si], s[si + 1]]; return s; })}>↓</button>
                <button type="button" className="btn btn--ghost btn--sm" style={{ color: 'var(--coral)' }}
                  onClick={() => mutSections((s) => s.filter((_, i) => i !== si))}>Remove</button>
              </div>
            </div>
            <div className="field">
              <label className="mono">Section title</label>
              <input value={sec.title} onChange={(e) => mutSections((s) => { s[si].title = e.target.value; return s; })} />
            </div>
            <div className="field">
              <label className="mono">Section intro (optional)</label>
              <input value={sec.subtitle ?? ''} onChange={(e) => mutSections((s) => { s[si].subtitle = e.target.value; return s; })} />
            </div>

            {sec.questions.map((q, qi) => (
              <QuestionEditor
                key={q.id}
                q={q}
                index={qi}
                sections={c.sections}
                sectionIndex={si}
                onChange={(fn) => mutQuestion(si, qi, fn)}
                onMove={(dir) =>
                  mutSections((s) => {
                    const arr = s[si].questions;
                    const j = qi + dir;
                    if (j < 0 || j >= arr.length) return s;
                    [arr[j], arr[qi]] = [arr[qi], arr[j]];
                    return s;
                  })
                }
                onRemove={() => mutSections((s) => { s[si].questions = s[si].questions.filter((_, i) => i !== qi); return s; })}
              />
            ))}

            <button type="button" className="btn btn--ghost btn--sm self-start"
              onClick={() => mutSections((s) => { s[si].questions.push(blankQuestion('single_select')); return s; })}>
              + Add question
            </button>
          </div>
        ))}

        <button type="button" className="btn btn--ghost self-start"
          onClick={() => mutSections((s) => { s.push(blankSection()); return s; })}>
          + Add section
        </button>

        {/* Ending */}
        <div className="card stack">
          <div className="title">Ending screen</div>
          <div className="field">
            <label className="mono">Heading</label>
            <input value={c.ending.heading} onChange={(e) => setContent({ ending: { ...c.ending, heading: e.target.value } })} />
          </div>
          <div className="field">
            <label className="mono">Body</label>
            <textarea rows={3} value={c.ending.body} onChange={(e) => setContent({ ending: { ...c.ending, body: e.target.value } })} />
          </div>
          <div className="row" style={{ gap: 'var(--s3)', alignItems: 'flex-start' }}>
            <div className="field grow">
              <label className="mono">CTA label</label>
              <input value={c.ending.ctaLabel ?? ''} onChange={(e) => setContent({ ending: { ...c.ending, ctaLabel: e.target.value } })} />
            </div>
            <div className="field grow">
              <label className="mono">CTA link</label>
              <input value={c.ending.ctaUrl ?? ''} onChange={(e) => setContent({ ending: { ...c.ending, ctaUrl: e.target.value } })} />
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 'var(--s2)' }}>
          <button type="button" onClick={save} disabled={pending} className="btn btn--primary">
            {pending ? 'Saving…' : 'Save survey'}
          </button>
          {msg && (
            <span className="mono" style={{ color: msg.startsWith('Saved') ? 'var(--pine)' : 'var(--coral)' }}>
              {msg}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

function QuestionEditor({
  q,
  index,
  sections,
  sectionIndex,
  onChange,
  onMove,
  onRemove,
}: {
  q: Question;
  index: number;
  sections: Section[];
  sectionIndex: number;
  onChange: (fn: (q: Question) => void) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const meta = TYPE_META[q.type];
  const laterSections = sections.slice(sectionIndex + 1);

  return (
    <div className="card card--sunk stack" style={{ gap: 'var(--s2)' }}>
      <div className="row row--between wrap">
        <span className="mono">Q{index + 1}</span>
        <div className="row" style={{ gap: 6 }}>
          <select
            value={q.type}
            onChange={(e) =>
              onChange((qq) => {
                const t = e.target.value as QuestionType;
                qq.type = t;
                if (TYPE_META[t].hasOptions && !qq.options) qq.options = [{ id: 'o1', label: 'Option 1', value: 'Option 1' }];
                if (t === 'scale' && !qq.scale) qq.scale = { min: 1, max: 5, minLabel: '', maxLabel: '' };
              })
            }
            style={{ width: 'auto', height: 32, padding: '0 8px' }}
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onMove(-1)}>↑</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onMove(1)}>↓</button>
          <button type="button" className="btn btn--ghost btn--sm" style={{ color: 'var(--coral)' }} onClick={onRemove}>✕</button>
        </div>
      </div>

      <input
        placeholder="Question text"
        value={q.title}
        onChange={(e) => onChange((qq) => { qq.title = e.target.value; })}
      />
      <input
        placeholder="Helper text (optional)"
        value={q.help ?? ''}
        onChange={(e) => onChange((qq) => { qq.help = e.target.value; })}
      />

      {meta.hasOptions && (
        <div className="stack" style={{ gap: 6 }}>
          {(q.options ?? []).map((o, oi) => (
            <div key={o.id} className="row" style={{ gap: 6 }}>
              <input
                value={o.label}
                onChange={(e) =>
                  onChange((qq) => {
                    qq.options![oi] = { ...qq.options![oi], label: e.target.value, value: e.target.value };
                  })
                }
              />
              <button type="button" className="btn btn--ghost btn--sm" style={{ color: 'var(--coral)' }}
                onClick={() => onChange((qq) => { qq.options = qq.options!.filter((_, i) => i !== oi); })}>✕</button>
            </div>
          ))}
          <button type="button" className="btn btn--ghost btn--sm self-start"
            onClick={() => onChange((qq) => { qq.options = [...(qq.options ?? []), { id: uid('o'), label: `Option ${(qq.options?.length ?? 0) + 1}`, value: `Option ${(qq.options?.length ?? 0) + 1}` }]; })}>
            + Add option
          </button>
        </div>
      )}

      {q.type === 'scale' && q.scale && (
        <div className="row" style={{ gap: 'var(--s2)', flexWrap: 'wrap' }}>
          <input type="number" style={{ width: 70 }} value={q.scale.min}
            onChange={(e) => onChange((qq) => { qq.scale!.min = Number(e.target.value); })} />
          <span className="mono">to</span>
          <input type="number" style={{ width: 70 }} value={q.scale.max}
            onChange={(e) => onChange((qq) => { qq.scale!.max = Number(e.target.value); })} />
          <input placeholder="Low label" style={{ flex: 1, minWidth: 120 }} value={q.scale.minLabel}
            onChange={(e) => onChange((qq) => { qq.scale!.minLabel = e.target.value; })} />
          <input placeholder="High label" style={{ flex: 1, minWidth: 120 }} value={q.scale.maxLabel}
            onChange={(e) => onChange((qq) => { qq.scale!.maxLabel = e.target.value; })} />
        </div>
      )}

      <label className="row" style={{ gap: 'var(--s2)' }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={!!q.required}
          onChange={(e) => onChange((qq) => { qq.required = e.target.checked; })} />
        <span className="mono">Required</span>
      </label>

      {/* Basic skip logic for single-choice / yes-no */}
      {(q.type === 'single_select' || q.type === 'yes_no') && (
        <details>
          <summary className="mono" style={{ cursor: 'pointer' }}>Skip logic</summary>
          <div className="stack" style={{ gap: 6, marginTop: 6 }}>
            {(q.logic ?? []).map((rule, ri) => (
              <div key={ri} className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <span className="mono">If</span>
                <input style={{ width: 120 }} value={rule.whenValue}
                  onChange={(e) => onChange((qq) => { qq.logic![ri].whenValue = e.target.value; })} placeholder="answer" />
                <span className="mono">→</span>
                <select value={rule.action} style={{ width: 'auto', height: 32 }}
                  onChange={(e) => onChange((qq) => { qq.logic![ri].action = e.target.value as 'skipToEnd' | 'skipToSection'; })}>
                  <option value="skipToEnd">skip to end</option>
                  <option value="skipToSection">skip to section</option>
                </select>
                {rule.action === 'skipToSection' && (
                  <select value={rule.target ?? ''} style={{ width: 'auto', height: 32 }}
                    onChange={(e) => onChange((qq) => { qq.logic![ri].target = e.target.value; })}>
                    <option value="">choose…</option>
                    {laterSections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                )}
                <button type="button" className="btn btn--ghost btn--sm" style={{ color: 'var(--coral)' }}
                  onClick={() => onChange((qq) => { qq.logic = qq.logic!.filter((_, i) => i !== ri); })}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn--ghost btn--sm self-start"
              onClick={() => onChange((qq) => { qq.logic = [...(qq.logic ?? []), { whenValue: '', action: 'skipToEnd' }]; })}>
              + Add rule
            </button>
          </div>
        </details>
      )}
    </div>
  );
}
