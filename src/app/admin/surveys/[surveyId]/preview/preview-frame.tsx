'use client';

import { useState } from 'react';
import { SurveyRunner } from '@/components/survey-runner';
import type { SurveyContent } from '@/lib/survey-schema';

/** Preview shell with a Desktop/Mobile viewport toggle (spec §13.5). */
export function PreviewFrame({ title, content }: { title: string; content: SurveyContent }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <div className="ns-ds" style={{ minHeight: '100vh', background: 'var(--slate-50)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'var(--font-mono,monospace)', fontSize: 11.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginRight: 6 }}>Preview</span>
        {(['desktop', 'mobile'] as const).map((d) => {
          const on = device === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              style={{ padding: '7px 15px', borderRadius: 9, border: `1.5px solid ${on ? 'var(--brand-strong)' : 'var(--border)'}`, background: on ? 'var(--green-50)' : '#fff', color: on ? 'var(--brand-strong)' : 'var(--text-muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize' }}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div style={{ padding: device === 'mobile' ? 'clamp(20px,4vh,40px) 16px' : 0 }}>
        <SurveyRunner key={device} title={title} content={content} preview device={device} />
      </div>
    </div>
  );
}
