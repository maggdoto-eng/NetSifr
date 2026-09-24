'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteResponseAction,
  anonymiseResponsesAction,
  purgeExpiredAction,
  setRetentionAction,
} from '../../actions';

/** Governance bar (spec P2): retention window + anonymise + purge. */
export function GovernanceBar({ surveyId, retentionDays }: { surveyId: string; retentionDays: number | null }) {
  const router = useRouter();
  const [days, setDays] = useState(retentionDays != null ? String(retentionDays) : '');
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };

  return (
    <div style={{ background: 'var(--slate-50)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span aria-hidden>🔒</span>
        <span style={{ fontFamily: 'var(--font-display,Poppins),sans-serif', fontWeight: 600, fontSize: 14.5, color: 'var(--ink)' }}>Data governance</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px' }}>Personal (PII) answers are stored apart from analytics and excluded from the default export.</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Auto-delete responses after</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" min={0} value={days} onChange={(e) => setDays(e.target.value)} placeholder="∞" style={{ width: 90, padding: '8px 10px', border: '1.5px solid var(--border-strong)', borderRadius: 9, fontSize: 14, color: 'var(--ink)', background: '#fff' }} />
            <span style={{ fontSize: 13.5, color: 'var(--text-body)' }}>days</span>
            <button type="button" disabled={pending} onClick={() => start(async () => { await setRetentionAction(surveyId, days.trim() ? Math.max(0, parseInt(days, 10) || 0) : null); flash('Retention updated.'); router.refresh(); })} className="ns-btn ns-btn--secondary ns-btn--sm">Save</button>
          </div>
        </label>

        <button type="button" disabled={pending} onClick={() => { if (!confirm('Remove personal (PII) data from every response? Analytics answers are kept. This cannot be undone.')) return; start(async () => { const { count } = await anonymiseResponsesAction(surveyId); flash(`Anonymised ${count} response(s).`); router.refresh(); }); }} className="ns-btn ns-btn--outline ns-btn--sm">Anonymise all (strip PII)</button>

        <button type="button" disabled={pending} onClick={() => start(async () => { const { removed } = await purgeExpiredAction(surveyId); flash(removed ? `Purged ${removed} expired response(s).` : 'Nothing past the retention window.'); router.refresh(); })} className="ns-btn ns-btn--ghost ns-btn--sm">Purge expired now</button>

        {msg && <span style={{ fontSize: 13, color: 'var(--brand-strong)', fontWeight: 600 }}>{msg}</span>}
      </div>
    </div>
  );
}

/** Per-response delete (subject erasure, spec P2). */
export function DeleteResponseButton({ surveyId, responseId }: { surveyId: string; responseId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => { if (!confirm('Delete this response permanently?')) return; start(async () => { await deleteResponseAction(surveyId, responseId); router.refresh(); }); }}
      style={{ border: '1px solid var(--border)', background: '#fff', borderRadius: 8, padding: '5px 10px', fontSize: 12.5, fontWeight: 600, color: 'var(--danger,#c0392b)', cursor: pending ? 'default' : 'pointer' }}
    >
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  );
}
