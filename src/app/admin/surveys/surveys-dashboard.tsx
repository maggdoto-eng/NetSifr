'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createSurveyAction,
  duplicateSurveyAction,
  deleteSurveyAction,
} from './actions';

const DISPLAY = 'var(--font-display,Poppins),sans-serif';
const MONO = 'var(--font-mono,monospace)';

type Row = {
  id: string;
  title: string;
  slug: string;
  status: string;
  questionCount: number;
  responseCount: number;
  completeCount: number;
  ownerName: string | null;
};

function IconBtn({ title, onClick, danger, children }: { title: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', border: 'none', background: 'transparent', borderRadius: 8, color: danger ? 'var(--slate-500)' : 'var(--slate-500)', cursor: 'pointer' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? 'var(--danger-surface)' : 'var(--slate-100)';
        e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--ink)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--slate-500)';
      }}
    >
      {children}
    </button>
  );
}

export function SurveysDashboard({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [shareId, setShareId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareRow = rows.find((r) => r.id === shareId);
  const confirmRow = rows.find((r) => r.id === confirmId);

  const totalResp = rows.reduce((a, r) => a + r.responseCount, 0);
  const published = rows.filter((r) => r.status === 'PUBLISHED').length;
  const totalQ = rows.reduce((a, r) => a + r.questionCount, 0);
  const tiles = [
    { label: 'Surveys', value: rows.length, color: 'var(--ink)' },
    { label: 'Published', value: published, color: 'var(--brand-strong)' },
    { label: 'Total questions', value: totalQ, color: 'var(--ink)' },
    { label: 'Total responses', value: totalResp.toLocaleString(), color: 'var(--brand-strong)' },
  ];

  function act(fn: () => Promise<void>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <>
      {/* Top bar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: '#fff', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px clamp(16px,4vw,36px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <Link href="/admin/programs" style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18, color: 'var(--ink)' }}>
              NetSifr
            </Link>
            <span style={{ fontFamily: DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-muted)', paddingLeft: 12, borderLeft: '1px solid var(--border)' }}>
              Survey Admin
            </span>
          </div>
          <form action={createSurveyAction}>
            <button type="submit" className="ns-btn ns-btn--primary ns-btn--sm">
              + New survey
            </button>
          </form>
        </div>
      </header>

      <main style={{ flex: 1, width: '100%', maxWidth: 1180, margin: '0 auto', padding: 'clamp(22px,4vw,40px) clamp(16px,4vw,36px)' }}>
        <div style={{ marginBottom: 26 }}>
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'clamp(26px,4vw,38px)', letterSpacing: '-.02em', color: 'var(--ink)' }}>Surveys</h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: '8px 0 0' }}>Create, edit, and monitor every NetSifr research instrument.</p>
        </div>

        {/* tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 26 }}>
          {tiles.map((t) => (
            <div key={t.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', padding: '18px 20px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{t.label}</div>
              <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 32, lineHeight: 1, color: t.color, marginTop: 10 }}>{t.value}</div>
            </div>
          ))}
        </div>

        {/* table */}
        {rows.length === 0 ? (
          <div style={{ background: '#fff', border: '1px dashed var(--border-strong)', borderRadius: 16, padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 18, color: 'var(--ink)', marginBottom: 6 }}>No surveys yet</div>
            <p style={{ margin: 0, fontSize: 14.5 }}>Create your first survey to get started.</p>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.4fr) 110px 110px 130px 172px', gap: 12, padding: '14px 22px', borderBottom: '1px solid var(--border)', background: 'var(--slate-50)', fontSize: 11.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              <span>Survey</span>
              <span>Status</span>
              <span>Questions</span>
              <span>Responses</span>
              <span style={{ textAlign: 'right' }}>Actions</span>
            </div>
            {rows.map((r, i) => {
              const pub = r.status === 'PUBLISHED';
              return (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.4fr) 110px 110px 130px 172px', gap: 12, padding: '16px 22px', borderTop: i === 0 ? 'none' : '1px solid var(--border)', alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 16, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                    <div style={{ fontFamily: MONO, fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>/s/{r.slug}{r.ownerName ? ` · by ${r.ownerName}` : ''}</div>
                  </div>
                  <div>
                    <span style={{ fontFamily: DISPLAY, fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999, background: pub ? 'var(--green-100)' : 'var(--slate-100)', color: pub ? 'var(--brand-hover)' : 'var(--text-muted)' }}>{r.status}</span>
                  </div>
                  <div style={{ fontSize: 15, color: 'var(--text-body)' }}>{r.questionCount}</div>
                  <div>
                    <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, color: 'var(--brand-strong)' }}>{r.responseCount}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)', marginLeft: 6 }}>{r.responseCount ? `${Math.round((r.completeCount / r.responseCount) * 100)}% done` : '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                    <IconBtn title="Share" onClick={() => { setShareId(r.id); setCopied(false); }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>
                    </IconBtn>
                    <Link href={`/admin/surveys/${r.id}/results`} title="Results" style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 8, color: 'var(--slate-500)' }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" rx="1" /><rect x="12" y="7" width="3" height="10" rx="1" /><rect x="17" y="13" width="3" height="4" rx="1" /></svg>
                    </Link>
                    <Link href={`/admin/surveys/${r.id}/builder`} title="Edit" style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 8, color: 'var(--slate-500)' }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                    </Link>
                    <IconBtn title="Duplicate" onClick={() => act(() => duplicateSurveyAction(r.id))}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="13" height="13" x="9" y="9" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                    </IconBtn>
                    <IconBtn title="Delete" danger onClick={() => setConfirmId(r.id)}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                    </IconBtn>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Share modal */}
      {shareRow && (
        <div onClick={() => setShareId(null)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(50,53,70,.45)', display: 'grid', placeItems: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, boxShadow: 'var(--shadow-lg)', maxWidth: 460, width: '100%', padding: 28 }}>
            <div className="ns-eyebrow">Share survey</div>
            <h3 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 21, color: 'var(--ink)', margin: '6px 0 0', lineHeight: 1.25 }}>{shareRow.title}</h3>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 18px' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&color=323546&data=${encodeURIComponent(`${origin}/s/${shareRow.slug}`)}`}
                alt="QR code for the survey link"
                style={{ width: 180, height: 180, border: '1px solid var(--border)', borderRadius: 14, padding: 8, background: '#fff' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--slate-50)', border: '1px solid var(--border)', borderRadius: 11, padding: '10px 12px' }}>
              <code style={{ flex: 1, fontFamily: MONO, fontSize: 13, color: 'var(--ink)', wordBreak: 'break-all' }}>{origin}/s/{shareRow.slug}</code>
            </div>
            {shareRow.status !== 'PUBLISHED' && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#8a6d1f', background: 'var(--warning-surface)', border: '1px solid var(--warning)', borderRadius: 10, padding: '9px 12px' }}>
                This survey is still a draft — publish it before sharing.
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="button" className="ns-btn ns-btn--primary" onClick={() => { navigator.clipboard?.writeText(`${origin}/s/${shareRow.slug}`); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
                {copied ? 'Copied!' : 'Copy link'}
              </button>
              <a className="ns-btn ns-btn--outline" href={`mailto:?subject=${encodeURIComponent('Your input needed: ' + shareRow.title)}&body=${encodeURIComponent(origin + '/s/' + shareRow.slug)}`}>
                Email invite
              </a>
              <button type="button" className="ns-btn ns-btn--ghost" onClick={() => setShareId(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmRow && (
        <div onClick={() => setConfirmId(null)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(50,53,70,.45)', display: 'grid', placeItems: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, boxShadow: 'var(--shadow-lg)', maxWidth: 420, width: '100%', padding: 28 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--danger-surface)', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
            </div>
            <h3 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 20, color: 'var(--ink)' }}>Delete this survey?</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--text-body)', margin: '10px 0 22px' }}>
              “{confirmRow.title}” and all its responses will be permanently removed. This cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="ns-btn ns-btn--ghost" onClick={() => setConfirmId(null)}>
                Cancel
              </button>
              <button type="button" className="ns-btn ns-btn--danger" onClick={() => { const id = confirmRow.id; setConfirmId(null); act(() => deleteSurveyAction(id)); }}>
                Delete survey
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
