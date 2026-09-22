'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  aggregate,
  crosstab,
  filterResponses,
  segmentableQuestions,
  type SurveyContent,
  type SurveyResponseLite,
} from '@/lib/survey-schema';

const DISPLAY = 'var(--font-display,Poppins),sans-serif';
const MONO = 'var(--font-mono,monospace)';

const TYPE_LABELS: Record<string, string> = {
  single_select: 'Multiple choice', multi_select: 'Checkboxes', dropdown: 'Dropdown', yes_no: 'Yes / No',
  scale: 'Linear scale', rating: 'Star rating', ranking: 'Ranking', short_text: 'Short answer',
  long_text: 'Paragraph', number: 'Number', email: 'Email', date: 'Date',
};

export function SurveyResults({
  surveyId,
  title,
  slug,
  status,
  content,
  responses,
}: {
  surveyId: string;
  title: string;
  slug: string;
  status: string;
  content: SurveyContent;
  responses: SurveyResponseLite[];
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [completeOnly, setCompleteOnly] = useState(false);
  const [segQid, setSegQid] = useState('');
  const [targetQid, setTargetQid] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => filterResponses(responses, { from, to, completeOnly }), [responses, from, to, completeOnly]);
  const agg = useMemo(() => aggregate(content, filtered), [content, filtered]);
  const segs = useMemo(() => segmentableQuestions(content), [content]);
  const targets = useMemo(() => {
    const out: { id: string; ref?: string; title: string }[] = [];
    content.sections.forEach((s) => s.questions.forEach((q) => {
      if (['single_select', 'dropdown', 'yes_no', 'multi_select', 'scale', 'rating'].includes(q.type) && q.id !== segQid) out.push({ id: q.id, ref: q.ref, title: q.title });
    }));
    return out;
  }, [content, segQid]);
  const ct = useMemo(() => (segQid && targetQid ? crosstab(content, filtered, segQid, targetQid) : null), [content, filtered, segQid, targetQid]);

  const filterActive = !!(from || to || completeOnly);
  const kpis = [
    { label: 'Responses', value: agg.total.toLocaleString(), suffix: 'total', color: 'var(--brand-strong)' },
    { label: 'Completed', value: agg.completed.toLocaleString(), suffix: 'finished', color: 'var(--ink)' },
    { label: 'Completion rate', value: `${agg.completionRate}%`, suffix: '', color: 'var(--brand-strong)' },
    { label: 'Questions', value: agg.questions.length, suffix: 'total', color: 'var(--ink)' },
  ];

  return (
    <>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: '#fff', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px clamp(16px,4vw,36px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/admin/surveys" style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18, color: 'var(--ink)' }}>NetSifr</Link>
            <span style={{ fontFamily: DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-muted)', paddingLeft: 12, borderLeft: '1px solid var(--border)' }}>Survey Admin</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/admin/surveys" className="ns-btn ns-btn--ghost ns-btn--sm">← All surveys</Link>
            <a href={`/admin/surveys/${surveyId}/results/export`} className="ns-btn ns-btn--outline ns-btn--sm">Export CSV</a>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, width: '100%', maxWidth: 1180, margin: '0 auto', padding: 'clamp(22px,4vw,40px) clamp(16px,4vw,36px)' }}>
        <div className="ns-eyebrow" style={{ marginBottom: 8 }}>Results</div>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'clamp(24px,3.6vw,34px)', letterSpacing: '-.02em', color: 'var(--ink)', maxWidth: '22ch' }}>{title}</h1>
        {status === 'PUBLISHED' && <div style={{ fontFamily: MONO, fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>/s/{slug}</div>}

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, margin: '22px 0 12px' }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', padding: '18px 20px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{k.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
                <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 32, lineHeight: 1, color: k.color }}>{k.value}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{k.suffix}</span>
              </div>
            </div>
          ))}
        </div>

        {/* filter bar */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', padding: '14px 18px', margin: '16px 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={miniLabel}>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={dateInput} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={miniLabel}>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={dateInput} />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 13.5, color: 'var(--text-body)' }}>Completed only</span>
            <Switch on={completeOnly} onClick={() => setCompleteOnly((x) => !x)} />
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 'auto' }}>{agg.total.toLocaleString()} of {responses.length.toLocaleString()} responses</span>
          {filterActive && (
            <button type="button" onClick={() => { setFrom(''); setTo(''); setCompleteOnly(false); }} style={{ border: 'none', background: 'transparent', color: 'var(--brand-strong)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Clear filters</button>
          )}
        </div>

        {/* cross-question analysis */}
        <div style={{ background: 'var(--slate-900)', borderRadius: 16, padding: '22px 24px', marginBottom: 20 }}>
          <h3 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 16, color: '#fff', margin: '0 0 4px' }}>Cross-question analysis</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-on-dark-muted)', margin: '0 0 16px' }}>See how answers to one question break down across the groups of another.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 220 }}>
              <span style={{ ...miniLabel, color: 'var(--text-on-dark-muted)' }}>Break down by group</span>
              <select value={segQid} onChange={(e) => { setSegQid(e.target.value); if (e.target.value === targetQid) setTargetQid(''); }} style={darkSelect}>
                <option value="">Choose a group…</option>
                {segs.map((q) => <option key={q.id} value={q.id}>{q.ref ? `${q.ref} · ` : ''}{q.title.slice(0, 46)}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 220 }}>
              <span style={{ ...miniLabel, color: 'var(--text-on-dark-muted)' }}>Show answers to</span>
              <select value={targetQid} onChange={(e) => setTargetQid(e.target.value)} style={darkSelect}>
                <option value="">Choose a question…</option>
                {targets.map((q) => <option key={q.id} value={q.id}>{q.ref ? `${q.ref} · ` : ''}{q.title.slice(0, 46)}</option>)}
              </select>
            </label>
          </div>

          {ct && (
            <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', marginTop: 18 }}>
              {ct.mode === 'average' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {ct.averages.map((r, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,220px) 1fr 90px', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 13.5, color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.label}>{r.label}</span>
                      <div style={{ background: 'var(--slate-100)', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ height: 10, width: `${Math.round((r.avg / (ct.scaleMax || 5)) * 100)}%`, background: 'var(--brand-strong)', borderRadius: 5 }} />
                      </div>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', textAlign: 'right' }}>{r.avg.toFixed(1)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(n={r.n})</span></span>
                    </div>
                  ))}
                </div>
              ) : (
                <Heatmap ct={ct} />
              )}
            </div>
          )}
        </div>

        {agg.total === 0 ? (
          <div style={{ background: '#fff', border: '1px dashed var(--border-strong)', borderRadius: 16, padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 18, color: 'var(--ink)', marginBottom: 6 }}>No responses yet</div>
            <p style={{ margin: 0, fontSize: 14.5 }}>Share the survey link to start collecting responses.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
            {agg.questions.map((q) => {
              const barMax = q.distribution ? Math.max(1, ...q.distribution.map((d) => d.count)) : 1;
              const exp = expanded[q.id];
              const text = q.textResponses ?? [];
              return (
                <div key={q.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                        {q.ref && <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: 'var(--brand-strong)' }}>{q.ref}</span>}
                        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'var(--slate-100)', padding: '2px 8px', borderRadius: 999 }}>{TYPE_LABELS[q.type] ?? q.type}</span>
                      </div>
                      <h3 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 17, lineHeight: 1.35, color: 'var(--ink)' }}>{q.title}</h3>
                    </div>
                    <div style={{ textAlign: 'right', flex: 'none' }}>
                      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 20, color: 'var(--ink)' }}>{q.answered}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>responses · {q.answerRate}%</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 18 }}>
                    {q.average !== undefined && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
                        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 34, color: 'var(--brand-strong)' }}>{q.average.toFixed(1)}</span>
                        <span style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>average of {q.scaleMin}–{q.scaleMax}</span>
                      </div>
                    )}
                    {q.distribution && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        {q.distribution.map((b, i) => (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px,180px) 1fr 74px', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontSize: 13.5, color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.label}>{b.label}</span>
                            <div style={{ height: 26, background: 'var(--slate-100)', borderRadius: 7, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.max(2, Math.round((b.count / barMax) * 100))}%`, background: 'var(--brand-strong)', borderRadius: 7 }} />
                            </div>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{b.count} · {b.pct}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {q.ranking && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {q.ranking.map((r, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--slate-50)', borderRadius: 10 }}>
                            <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--brand-strong)', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: DISPLAY, fontWeight: 700, fontSize: 12, flex: 'none' }}>{i + 1}</span>
                            <span style={{ flex: 1, fontSize: 14.5, color: 'var(--ink)' }}>{r.label}</span>
                            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>avg rank {r.avgRank ? r.avgRank.toFixed(1) : '—'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {q.textResponses && text.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(exp ? text : text.slice(0, 3)).map((t, i) => (
                          <div key={i} style={{ borderLeft: '3px solid var(--brand)', background: 'var(--slate-50)', borderRadius: '0 10px 10px 0', padding: '11px 14px', fontSize: 14, lineHeight: 1.5, color: 'var(--text-body)' }}>{t}</div>
                        ))}
                        {text.length > 3 && (
                          <button type="button" onClick={() => setExpanded((e) => ({ ...e, [q.id]: !e[q.id] }))} style={{ alignSelf: 'flex-start', border: 'none', background: 'transparent', color: 'var(--brand-strong)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: '4px 0' }}>{exp ? 'Show fewer' : `Show all ${text.length} responses`}</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

function Heatmap({ ct }: { ct: NonNullable<ReturnType<typeof crosstab>> & { mode: 'distribution' } }) {
  const cols = `minmax(120px,1.6fr) repeat(${ct.segments.length}, minmax(70px,1fr))`;
  const allPct = ct.rows.flatMap((r) => r.cells.map((c) => c.pct));
  const maxPct = Math.max(1, ...allPct);
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 8, alignItems: 'center' }}>
        <span />
        {ct.segments.map((s, i) => (
          <span key={i} style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', textAlign: 'center', lineHeight: 1.25 }}>{s.label}<br /><span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>n={s.n}</span></span>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
        {ct.rows.map((row, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: cols, gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.label}>{row.label}</span>
            {row.cells.map((c, ci) => (
              <span key={ci} style={{ padding: '8px 10px', borderRadius: 8, textAlign: 'center', fontSize: 13.5, fontVariantNumeric: 'tabular-nums', background: `color-mix(in srgb, var(--brand-strong) ${Math.round((c.pct / maxPct) * 82)}%, #fff)`, color: c.pct / maxPct > 0.5 ? '#fff' : 'var(--ink)' }}>{c.pct}%</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const miniLabel: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-muted)' };
const dateInput: React.CSSProperties = { padding: '7px 10px', border: '1.5px solid var(--border-strong)', borderRadius: 9, background: '#fff', fontSize: 13.5, color: 'var(--ink)' };
const darkSelect: React.CSSProperties = { padding: '10px 12px', border: '1.5px solid rgba(255,255,255,.2)', borderRadius: 10, background: 'var(--slate-800)', color: '#fff', fontSize: 14, cursor: 'pointer' };

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} style={{ width: 40, height: 24, borderRadius: 999, border: 'none', padding: 2, cursor: 'pointer', background: on ? 'var(--brand-strong)' : 'var(--slate-300)', display: 'inline-flex', justifyContent: on ? 'flex-end' : 'flex-start' }}>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(50,53,70,.35)' }} />
    </button>
  );
}
