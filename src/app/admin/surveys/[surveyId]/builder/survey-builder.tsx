'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  QUESTION_TYPES,
  TYPE_META,
  blankSection,
  blankQuestion,
  blankSurveyContent,
  uid,
  type SurveyContent,
  type Section,
  type Question,
  type QuestionType,
} from '@/lib/survey-schema';
import { saveSurveyAction, setSurveyStatusAction } from '../../actions';

const DISPLAY = 'var(--font-display,Poppins),sans-serif';
const MONO = 'var(--font-mono,monospace)';

type Draft = { title: string; slug: string; content: SurveyContent };

const inpBase: React.CSSProperties = {
  width: '100%',
  fontSize: 15,
  color: 'var(--ink)',
  background: 'transparent',
  border: 'none',
  borderBottom: '1.5px solid transparent',
  padding: '6px 2px',
  outline: 'none',
};

export function SurveyBuilder({ surveyId, initial, status }: { surveyId: string; initial: Draft; status: string }) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [typeMenu, setTypeMenu] = useState<string | null>(null);
  const [curStatus, setCurStatus] = useState(status);
  const [dragQid, setDragQid] = useState<string | null>(null);

  const c = draft.content;
  const setContent = (patch: Partial<SurveyContent>) => setDraft((d) => ({ ...d, content: { ...d.content, ...patch } }));
  const mut = (fn: (secs: Section[]) => void) => {
    const secs = structuredClone(c.sections);
    fn(secs);
    setContent({ sections: secs });
  };
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2400); };

  function save(after?: (slug: string) => void) {
    start(async () => {
      const res = await saveSurveyAction(surveyId, draft);
      if (res.error) flash(res.error);
      else {
        if (res.slug) setDraft((d) => ({ ...d, slug: res.slug! }));
        after ? after(res.slug ?? draft.slug) : flash('Draft saved.');
      }
    });
  }
  function publish() {
    start(async () => {
      const res = await saveSurveyAction(surveyId, draft);
      if (res.error) return flash(res.error);
      if (res.slug) setDraft((d) => ({ ...d, slug: res.slug! }));
      await setSurveyStatusAction(surveyId, 'PUBLISHED');
      setCurStatus('PUBLISHED');
      flash('Published — the survey is now live.');
    });
  }

  function resetTemplate() {
    if (!window.confirm('Reset this survey to a blank template? Your current questions will be cleared.')) return;
    setDraft((d) => ({ ...d, title: 'Untitled survey', content: blankSurveyContent() }));
    flash('Reset to a blank template.');
  }

  // Non-blocking validation warnings (spec §3.2).
  const warnings: string[] = [];
  const sectionIds = new Set(c.sections.map((s) => s.id));
  let wn = 0;
  c.sections.forEach((s) =>
    s.questions.forEach((q) => {
      wn += 1;
      const label = q.ref ?? `Q${wn}`;
      if (!q.title.trim()) warnings.push(`${label}: question text is empty.`);
      if (TYPE_META[q.type].hasOptions && (q.options?.length ?? 0) < 2) warnings.push(`${label}: needs at least 2 options.`);
      q.logic?.forEach((r) => {
        if (r.action === 'skipToSection' && (!r.target || !sectionIds.has(r.target))) warnings.push(`${label}: branch points to a section that no longer exists.`);
      });
    }),
  );

  const questionCount = c.sections.reduce((n, s) => n + s.questions.length, 0);
  const branchCount = c.sections.reduce((n, s) => n + s.questions.filter((q) => q.logic && q.logic.length).length, 0);
  let qn = 0;

  return (
    <>
      {/* Top bar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: '#fff', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '12px clamp(16px,4vw,32px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <Link href="/admin/surveys" style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18, color: 'var(--ink)' }}>NetSifr</Link>
            <span style={{ fontFamily: DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-muted)', paddingLeft: 12, borderLeft: '1px solid var(--border)' }}>Survey Builder</span>
            <span style={{ fontFamily: DISPLAY, fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999, background: curStatus === 'PUBLISHED' ? 'var(--green-100)' : 'var(--slate-100)', color: curStatus === 'PUBLISHED' ? 'var(--brand-hover)' : 'var(--text-muted)' }}>{curStatus}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" className="ns-btn ns-btn--ghost ns-btn--sm" disabled={pending} onClick={resetTemplate}>Reset</button>
            <Link href={`/admin/surveys/${surveyId}/preview`} target="_blank" className="ns-btn ns-btn--outline ns-btn--sm">Preview</Link>
            <button type="button" className="ns-btn ns-btn--secondary ns-btn--sm" disabled={pending} onClick={() => save()}>Save draft</button>
            <button type="button" className="ns-btn ns-btn--primary ns-btn--sm" disabled={pending} onClick={publish}>Publish</button>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, width: '100%', maxWidth: 1080, margin: '0 auto', padding: 'clamp(20px,4vw,40px) clamp(16px,4vw,32px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 264px', gap: 28, alignItems: 'start' }}>
          {/* editing column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
            {warnings.length > 0 && (
              <div style={{ background: 'var(--warning-surface)', border: '1px solid var(--warning)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 13.5, color: '#8a6d1f', marginBottom: 6 }}>
                  {warnings.length} thing{warnings.length === 1 ? '' : 's'} to fix before publishing
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: '#8a6d1f', lineHeight: 1.6 }}>
                  {warnings.slice(0, 8).map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            {/* survey meta */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderTop: '5px solid var(--brand-strong)', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: '24px 26px' }}>
              <input style={{ ...inpBase, fontFamily: DISPLAY, fontWeight: 600, fontSize: 'clamp(22px,3vw,30px)', lineHeight: 1.15 }} value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Survey title" />
              <textarea style={{ ...inpBase, marginTop: 10, resize: 'vertical', lineHeight: 1.55, color: 'var(--text-body)' }} rows={2} value={c.subtitle} onChange={(e) => setContent({ subtitle: e.target.value })} placeholder="Short description shown on the intro screen" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
                  <span style={fieldLabel}>Estimated time</span>
                  <input style={inpBase} value={c.estimatedTime} onChange={(e) => setContent({ estimatedTime: e.target.value })} placeholder="e.g. 10 minutes" />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 2, minWidth: 220 }}>
                  <span style={fieldLabel}>Who it’s for</span>
                  <input style={inpBase} value={c.forWho} onChange={(e) => setContent({ forWho: e.target.value })} placeholder="Audience description" />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
                  <span style={fieldLabel}>Public link slug</span>
                  <input style={inpBase} value={draft.slug} onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))} placeholder="slug" />
                </label>
              </div>
            </div>

            {/* sections */}
            {c.sections.map((sec, si) => (
              <div key={sec.id} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* section header (dark) */}
                <div style={{ background: 'var(--slate-900)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input style={{ ...inpBase, color: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' }} value={sec.kicker ?? ''} onChange={(e) => mut((s) => { s[si].kicker = e.target.value; })} placeholder="SECTION LABEL" />
                    <input style={{ ...inpBase, color: '#fff', fontFamily: DISPLAY, fontWeight: 600, fontSize: 20, marginTop: 2 }} value={sec.title} onChange={(e) => mut((s) => { s[si].title = e.target.value; })} placeholder="Section title" />
                    <input style={{ ...inpBase, color: 'var(--text-on-dark-muted)', fontSize: 13.5, marginTop: 4 }} value={sec.subtitle ?? ''} onChange={(e) => mut((s) => { s[si].subtitle = e.target.value; })} placeholder="Optional section description" />
                  </div>
                  {c.sections.length > 1 && (
                    <button type="button" title="Delete section" onClick={() => mut((s) => { s.splice(si, 1); })} style={{ flex: 'none', width: 32, height: 32, display: 'grid', placeItems: 'center', border: 'none', background: 'rgba(255,255,255,.08)', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>✕</button>
                  )}
                </div>

                {sec.questions.map((q, qi) => {
                  qn += 1;
                  return (
                    <QCard
                      key={q.id}
                      q={q}
                      refLabel={q.ref ?? `Q${qn}`}
                      first={qi === 0}
                      last={qi === sec.questions.length - 1}
                      laterSections={c.sections.slice(si + 1)}
                      typeMenuOpen={typeMenu === q.id}
                      onToggleTypeMenu={() => setTypeMenu((t) => (t === q.id ? null : q.id))}
                      dragging={dragQid === q.id}
                      onDragStart={() => setDragQid(q.id)}
                      onDragEnd={() => setDragQid(null)}
                      onDropHere={() => {
                        const from = dragQid;
                        setDragQid(null);
                        if (!from || from === q.id) return;
                        mut((s) => {
                          const arr = s[si].questions;
                          const fi = arr.findIndex((x) => x.id === from);
                          const ti = arr.findIndex((x) => x.id === q.id);
                          if (fi < 0 || ti < 0) return;
                          const [moved] = arr.splice(fi, 1);
                          arr.splice(ti, 0, moved);
                        });
                      }}
                      onChange={(fn) => mut((s) => fn(s[si].questions[qi]))}
                      onType={(t) => { mut((s) => applyType(s[si].questions[qi], t)); setTypeMenu(null); }}
                      onMove={(dir) => mut((s) => { const arr = s[si].questions; const j = qi + dir; if (j < 0 || j >= arr.length) return; [arr[j], arr[qi]] = [arr[qi], arr[j]]; })}
                      onDuplicate={() => mut((s) => { const copy = structuredClone(q); copy.id = uid('q'); delete copy.ref; s[si].questions.splice(qi + 1, 0, copy); })}
                      onDelete={() => mut((s) => { s[si].questions = s[si].questions.filter((_, i) => i !== qi); if (!s[si].questions.length) s[si].questions.push(blankQuestion('single_select')); })}
                    />
                  );
                })}

                <button type="button" onClick={() => mut((s) => { s[si].questions.push(blankQuestion('single_select')); })} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1.5px dashed var(--border-strong)', background: '#fff', borderRadius: 12, color: 'var(--brand-strong)', fontFamily: DISPLAY, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+ Add question</button>
              </div>
            ))}

            <button type="button" className="ns-btn ns-btn--secondary" onClick={() => setContent({ sections: [...c.sections, blankSection()] })}>+ Add section</button>

            {/* consent + ending (collapsible-ish, kept simple) */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginBottom: 12 }}>Consent screen</div>
              <input style={inpBase} value={c.consent.heading} onChange={(e) => setContent({ consent: { ...c.consent, heading: e.target.value } })} placeholder="Consent heading" />
              <textarea style={{ ...inpBase, marginTop: 8, resize: 'vertical', color: 'var(--text-body)' }} rows={3} value={c.consent.body} onChange={(e) => setContent({ consent: { ...c.consent, body: e.target.value } })} placeholder="Consent body" />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 14 }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={c.consent.require} onChange={(e) => setContent({ consent: { ...c.consent, require: e.target.checked } })} />
                Require an explicit agreement checkbox
              </label>
            </div>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginBottom: 12 }}>Ending screen</div>
              <input style={inpBase} value={c.ending.heading} onChange={(e) => setContent({ ending: { ...c.ending, heading: e.target.value } })} placeholder="Thank-you heading" />
              <textarea style={{ ...inpBase, marginTop: 8, resize: 'vertical', color: 'var(--text-body)' }} rows={2} value={c.ending.body} onChange={(e) => setContent({ ending: { ...c.ending, body: e.target.value } })} placeholder="Thank-you body" />
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <input style={inpBase} value={c.ending.ctaLabel ?? ''} onChange={(e) => setContent({ ending: { ...c.ending, ctaLabel: e.target.value } })} placeholder="CTA label" />
                <input style={inpBase} value={c.ending.ctaUrl ?? ''} onChange={(e) => setContent({ ending: { ...c.ending, ctaUrl: e.target.value } })} placeholder="CTA url" />
              </div>
            </div>
          </div>

          {/* side rail */}
          <aside style={{ position: 'sticky', top: 84, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', padding: 18 }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 14 }}>Survey overview</div>
              {[
                { l: 'Sections', v: c.sections.length, color: 'var(--ink)' },
                { l: 'Questions', v: questionCount, color: 'var(--brand-strong)' },
                { l: 'With branching', v: branchCount, color: 'var(--ink)' },
              ].map((r) => (
                <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.l}</span>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, color: r.color }}>{r.v}</span>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 13.5, color: 'var(--brand-hover)', marginBottom: 6 }}>Live link</div>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--green-900)', margin: '0 0 10px' }}>Publishing serves the survey to the public at:</p>
              <code style={{ display: 'block', fontFamily: MONO, fontSize: 12, color: 'var(--brand-hover)', wordBreak: 'break-all', background: '#fff', border: '1px solid var(--green-200)', borderRadius: 8, padding: '8px 10px' }}>/s/{draft.slug}</code>
            </div>
          </aside>
        </div>
      </main>

      {toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', zIndex: 60, background: 'var(--slate-900)', color: '#fff', padding: '12px 20px', borderRadius: 12, boxShadow: 'var(--shadow-lg)', fontSize: 14 }}>
          {toast}
        </div>
      )}
    </>
  );
}

const fieldLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-muted)' };

function applyType(q: Question, t: QuestionType) {
  q.type = t;
  const meta = TYPE_META[t];
  if (meta.hasOptions && !q.options) q.options = ['Option 1', 'Option 2', 'Option 3'].map((l, i) => ({ id: `o${i + 1}`, label: l, value: l }));
  if (!meta.hasOptions) delete q.options;
  if (t === 'scale' && !q.scale) q.scale = { min: 1, max: 5, minLabel: '', maxLabel: '' };
  if (t !== 'scale') delete q.scale;
  if (t !== 'single_select' && t !== 'yes_no') delete q.logic;
}

function QCard({
  q,
  refLabel,
  first,
  last,
  laterSections,
  typeMenuOpen,
  onToggleTypeMenu,
  dragging,
  onDragStart,
  onDragEnd,
  onDropHere,
  onChange,
  onType,
  onMove,
  onDuplicate,
  onDelete,
}: {
  q: Question;
  refLabel: string;
  first: boolean;
  last: boolean;
  laterSections: Section[];
  typeMenuOpen: boolean;
  onToggleTypeMenu: () => void;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropHere: () => void;
  onChange: (fn: (q: Question) => void) => void;
  onType: (t: QuestionType) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const meta = TYPE_META[q.type];
  const branchable = q.type === 'single_select' || q.type === 'yes_no';
  const branchOn = !!(q.logic && q.logic.length);
  const whenOpts = q.type === 'yes_no' ? [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }] : q.options ?? [];
  const preview: Record<string, string> = { short_text: 'Short answer text', long_text: 'Long-form answer text', number: '123 (number input)', email: 'name@example.org', date: 'Date picker' };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDropHere(); }}
      style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: '22px 24px', opacity: dragging ? 0.45 : 1 }}
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <span
          draggable
          onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(); }}
          onDragEnd={onDragEnd}
          title="Drag to reorder"
          style={{ display: 'grid', placeItems: 'center', width: 26, height: 30, cursor: 'grab', color: 'var(--slate-400)', flex: 'none', fontSize: 16, userSelect: 'none' }}
        >
          ⠿
        </span>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: 'var(--brand-strong)' }}>{refLabel}</span>
            {q.required && <span style={{ fontSize: 11, color: 'var(--danger)' }}>required</span>}
          </div>
          <textarea rows={1} value={q.title} onChange={(e) => onChange((qq) => { qq.title = e.target.value; })} placeholder="Question text" style={{ ...inpBase, fontFamily: DISPLAY, fontWeight: 600, fontSize: 18, lineHeight: 1.3, resize: 'vertical' }} />
        </div>
        {/* type selector */}
        <div style={{ position: 'relative', flex: 'none' }}>
          <button type="button" onClick={onToggleTypeMenu} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', border: '1.5px solid var(--border-strong)', borderRadius: 10, background: 'var(--slate-50)', cursor: 'pointer', fontSize: 14, color: 'var(--ink)', minWidth: 170, justifyContent: 'space-between' }}>
            <span>{meta.label}</span>
            <span style={{ color: 'var(--slate-500)' }}>▾</span>
          </button>
          {typeMenuOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 30, width: 260, maxHeight: 340, overflow: 'auto', background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-md)', padding: 6 }}>
              {QUESTION_TYPES.map((t) => (
                <button key={t.type} type="button" onClick={() => onType(t.type)} style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', textAlign: 'left', padding: '9px 11px', border: 'none', borderRadius: 9, cursor: 'pointer', background: t.type === q.type ? 'var(--green-50)' : 'transparent' }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{t.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* config */}
      <div style={{ marginTop: 16 }}>
        {meta.hasOptions && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(q.options ?? []).map((o, oi) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 18, height: 18, flex: 'none', borderRadius: q.type === 'multi_select' ? 6 : q.type === 'dropdown' || q.type === 'ranking' ? 0 : '50%', border: q.type === 'dropdown' || q.type === 'ranking' ? 'none' : '2px solid var(--border-strong)', fontFamily: MONO, fontSize: 12, color: 'var(--text-muted)', display: 'grid', placeItems: 'center' }}>
                  {(q.type === 'dropdown' || q.type === 'ranking') ? `${oi + 1}.` : ''}
                </span>
                <input style={{ ...inpBase, flex: 1 }} value={o.label} onChange={(e) => onChange((qq) => { qq.options![oi] = { ...qq.options![oi], label: e.target.value, value: e.target.value }; })} placeholder="Option text" />
                {(q.options ?? []).length > 1 && (
                  <button type="button" title="Remove" onClick={() => onChange((qq) => { qq.options = qq.options!.filter((_, i) => i !== oi); })} style={{ flex: 'none', width: 28, height: 28, display: 'grid', placeItems: 'center', border: 'none', background: 'transparent', borderRadius: 7, color: 'var(--slate-400)', cursor: 'pointer' }}>✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => onChange((qq) => { const n = (qq.options?.length ?? 0) + 1; qq.options = [...(qq.options ?? []), { id: uid('o'), label: `Option ${n}`, value: `Option ${n}` }]; })} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', border: 'none', background: 'transparent', borderRadius: 8, color: 'var(--brand-strong)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+ Add option</button>
          </div>
        )}

        {q.type === 'scale' && q.scale && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', background: 'var(--slate-50)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={fieldLabel}>From</span><input type="number" style={{ ...inpBase, width: 64 }} value={q.scale.min} onChange={(e) => onChange((qq) => { qq.scale!.min = parseInt(e.target.value, 10) || 0; })} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={fieldLabel}>To</span><input type="number" style={{ ...inpBase, width: 64 }} value={q.scale.max} onChange={(e) => onChange((qq) => { qq.scale!.max = parseInt(e.target.value, 10) || 0; })} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 150 }}><span style={fieldLabel}>Low-end label</span><input style={inpBase} value={q.scale.minLabel} onChange={(e) => onChange((qq) => { qq.scale!.minLabel = e.target.value; })} placeholder="e.g. Not at all" /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 150 }}><span style={fieldLabel}>High-end label</span><input style={inpBase} value={q.scale.maxLabel} onChange={(e) => onChange((qq) => { qq.scale!.maxLabel = e.target.value; })} placeholder="e.g. Fully" /></label>
          </div>
        )}

        {['short_text', 'long_text', 'number', 'email', 'date'].includes(q.type) && (
          <div style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 10, padding: '12px 14px', color: 'var(--slate-400)', fontSize: 14, background: 'var(--slate-50)' }}>{preview[q.type]}</div>
        )}
      </div>

      {/* branching */}
      {branchable && (
        <div style={{ marginTop: 16, borderTop: '1px dashed var(--border)', paddingTop: 14 }}>
          <button type="button" onClick={() => onChange((qq) => { if (qq.logic?.length) delete qq.logic; else qq.logic = [{ whenValue: whenOpts[0]?.value ?? '', action: 'skipToEnd' }]; })} style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', color: 'var(--text-body)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
            <span style={{ color: 'var(--brand-strong)' }}>⑃</span> {branchOn ? 'Branching enabled — jump based on the answer' : 'Add branching logic'}
          </button>
          {branchOn && q.logic && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13.5, color: 'var(--text-body)' }}>
              <span>If the answer is</span>
              <select value={q.logic[0].whenValue} onChange={(e) => onChange((qq) => { qq.logic![0].whenValue = e.target.value; })} style={selStyle}>
                {whenOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <span>then jump to</span>
              <select value={q.logic[0].action === 'skipToEnd' ? '__end' : q.logic[0].target ?? '__end'} onChange={(e) => onChange((qq) => { const r = qq.logic![0]; if (e.target.value === '__end') { r.action = 'skipToEnd'; delete r.target; } else { r.action = 'skipToSection'; r.target = e.target.value; } })} style={selStyle}>
                <option value="__end">End of survey</option>
                {laterSections.map((s) => <option key={s.id} value={s.id}>{s.title || 'Untitled section'}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* footer toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <ToolBtn label="↑" title="Move up" disabled={first} onClick={() => onMove(-1)} />
        <ToolBtn label="↓" title="Move down" disabled={last} onClick={() => onMove(1)} />
        <ToolBtn label="⧉" title="Duplicate" onClick={onDuplicate} />
        <ToolBtn label="🗑" title="Delete" danger onClick={onDelete} />
        <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 6px' }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 4 }}>Required</span>
        <button type="button" role="switch" aria-checked={!!q.required} onClick={() => onChange((qq) => { qq.required = !qq.required; })} style={{ width: 40, height: 24, borderRadius: 999, border: 'none', padding: 2, cursor: 'pointer', background: q.required ? 'var(--brand-strong)' : 'var(--slate-300)', display: 'inline-flex', justifyContent: q.required ? 'flex-end' : 'flex-start' }}>
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(50,53,70,.35)' }} />
        </button>
      </div>
    </div>
  );
}

const selStyle: React.CSSProperties = { padding: '7px 10px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: '#fff', fontSize: 13.5, color: 'var(--ink)', cursor: 'pointer' };

function ToolBtn({ label, title, disabled, danger, onClick }: { label: string; title: string; disabled?: boolean; danger?: boolean; onClick: () => void }) {
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick} style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', border: 'none', background: 'transparent', borderRadius: 8, color: disabled ? 'var(--slate-300)' : danger ? 'var(--slate-500)' : 'var(--slate-500)', cursor: disabled ? 'default' : 'pointer', fontSize: 15 }}>
      {label}
    </button>
  );
}
