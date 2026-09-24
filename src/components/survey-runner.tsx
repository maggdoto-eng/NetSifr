'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildSteps,
  evalLogic,
  countQuestions,
  getTheme,
  MILESTONES,
  ENCOURAGEMENTS,
  OTHER_VALUE,
  otherKey,
  type SurveyContent,
  type Question,
  type Answers,
  type AnswerValue,
  type Step,
  type AnimationStyle,
  type BackgroundStyle,
} from '@/lib/survey-schema';
import { SurveyDecor } from './survey-decor';

type StartFn = (slug: string, consent?: { agreed: boolean; text: string }) => Promise<{ responseId?: string; error?: string }>;
type PatchFn = (responseId: string, data: { answers: Answers; complete: boolean }) => Promise<{ error?: string }>;

const DISPLAY = 'var(--font-display,Poppins),sans-serif';
const MONO = 'var(--font-mono,monospace)';

type Saved = { answers: Answers; stepIndex: number; started: boolean; finished: boolean; agreed: boolean; responseId: string | null };

export function SurveyRunner({
  title,
  content,
  slug,
  startAction,
  patchAction,
  preview = false,
  animation = 'auto',
  background = 'auto',
  engagement = 'auto',
  device,
}: {
  title: string;
  content: SurveyContent;
  slug?: string;
  startAction?: StartFn;
  patchAction?: PatchFn;
  preview?: boolean;
  /** Override props (spec §13.7) — 'auto' defers to the survey's saved theme. */
  animation?: AnimationStyle | 'auto';
  background?: BackgroundStyle | 'auto';
  engagement?: boolean | 'auto';
  /** Force a viewport for the builder preview frame (spec §13.5). */
  device?: 'desktop' | 'mobile';
}) {
  const steps = useMemo<Step[]>(() => buildSteps(content), [content]);
  const total = useMemo(() => countQuestions(content), [content]);
  const key = slug ? `netsifr.survey.${slug}` : null;

  // Resolve the effective theme: saved theme, with any override props applied.
  const theme = useMemo(() => {
    const t = getTheme(content);
    return {
      ...t,
      animation: animation === 'auto' ? t.animation : animation,
      background: background === 'auto' ? t.background : background,
      engagement:
        engagement === 'auto'
          ? t.engagement
          : { ...t.engagement, enabled: engagement, milestones: engagement, encouragements: engagement },
    };
  }, [content, animation, background, engagement]);
  const animClass = `ns-anim-base ns-anim--${theme.animation}`;
  const animStyle = { animationDuration: `${theme.animationDuration}ms` } as const;

  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [agreed, setAgreed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [resume, setResume] = useState<Saved | null>(null);
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);
  const firedRef = useRef<Set<number>>(new Set());
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const advRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseIdRef = useRef<string | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Focus the stage on every step change so keyboard/screen-reader users land
  // on the new content (spec §9 accessibility).
  useEffect(() => {
    stageRef.current?.focus();
  }, [stepIndex, started, finished]);

  const consent = content.consent;
  const needConsent = !!consent?.require;
  const canStart = !needConsent || agreed;
  const current = steps[stepIndex];

  const readLocal = useCallback((): Saved | null => {
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as Saved) : null;
    } catch {
      return null;
    }
  }, [key]);
  const writeLocal = useCallback(
    (s: Partial<Saved>) => {
      if (!key || preview) return;
      try {
        const base = readLocal() ?? { answers: {}, stepIndex: 0, started: false, finished: false, agreed: false, responseId: null };
        localStorage.setItem(key, JSON.stringify({ ...base, ...s }));
      } catch {
        /* private mode etc. */
      }
    },
    [key, preview, readLocal],
  );
  const clearLocal = useCallback(() => {
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [key]);

  const flashSaved = useCallback(() => {
    setSavedFlash(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedFlash(false), 900);
  }, []);

  // Offer resume on mount.
  useEffect(() => {
    if (preview) return;
    const s = readLocal();
    if (s && s.started && !s.finished && s.stepIndex > 0) setResume(s);
  }, [preview, readLocal]);

  const finish = useCallback(() => {
    setFinished(true);
    if (preview) return;
    if (patchAction && responseIdRef.current) patchAction(responseIdRef.current, { answers, complete: true });
    writeLocal({ finished: true });
  }, [preview, patchAction, answers, writeLocal]);

  const goNext = useCallback(() => {
    const st = steps[stepIndex];
    if (!st) return;
    if (st.kind === 'question') {
      const val = answers[st.q.id];
      const outcome = evalLogic(st.q, Array.isArray(val) ? undefined : val);
      if (outcome?.skipToEnd) return finish();
      if (outcome?.skipToSection) {
        const ti = steps.findIndex((x) => x.kind === 'section' && x.section.id === outcome.skipToSection);
        if (ti >= 0) {
          setHistory((h) => [...h, stepIndex]);
          setStepIndex(ti);
          return;
        }
      }
    }
    const nx = stepIndex + 1;
    if (nx >= steps.length) return finish();
    setHistory((h) => [...h, stepIndex]);
    setStepIndex(nx);
  }, [steps, stepIndex, answers, finish]);

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const copy = [...h];
      setStepIndex(copy.pop()!);
      return copy;
    });
  }, []);

  const doStart = useCallback(async () => {
    if (startAction && slug && !responseIdRef.current) {
      const r = await startAction(slug, needConsent ? { agreed: true, text: consent.body } : undefined);
      if (r.responseId) responseIdRef.current = r.responseId;
      else if (r.error) setSubmitError(r.error);
    }
  }, [startAction, slug, needConsent, consent]);

  const begin = useCallback(() => {
    if (!canStart) return;
    clearLocal();
    responseIdRef.current = null;
    firedRef.current = new Set();
    setToast(null);
    setResume(null);
    setAnswers({});
    setHistory([]);
    setStepIndex(0);
    setFinished(false);
    setStarted(true);
    void doStart();
  }, [canStart, clearLocal, doStart]);

  const resumeSurvey = useCallback(() => {
    if (!resume) return;
    responseIdRef.current = resume.responseId;
    setAnswers(resume.answers);
    setAgreed(resume.agreed);
    setStepIndex(resume.stepIndex);
    setHistory([]);
    setFinished(false);
    setStarted(true);
    setResume(null);
    if (!responseIdRef.current) void doStart();
  }, [resume, doStart]);

  const restart = useCallback(() => {
    clearLocal();
    responseIdRef.current = null;
    firedRef.current = new Set();
    setToast(null);
    setAnswers({});
    setHistory([]);
    setStepIndex(0);
    setFinished(false);
    setStarted(false);
    setSubmitError(null);
  }, [clearLocal]);

  const setAnswer = useCallback(
    (qid: string, value: AnswerValue, auto?: boolean) => {
      setAnswers((a) => ({ ...a, [qid]: value }));
      if (auto) {
        if (advRef.current) clearTimeout(advRef.current);
        advRef.current = setTimeout(() => goNext(), 360);
      }
    },
    [goNext],
  );

  // Stream answers to the backend (debounced) + persist locally while filling in.
  useEffect(() => {
    if (!started || finished) return;
    writeLocal({ answers, stepIndex, started: true, finished: false, agreed, responseId: responseIdRef.current });
    if (preview || !patchAction) return;
    const t = setTimeout(() => {
      if (responseIdRef.current) {
        patchAction(responseIdRef.current, { answers, complete: false });
        flashSaved();
      }
    }, 500);
    return () => clearTimeout(t);
  }, [answers, stepIndex, started, finished, agreed, preview, patchAction, writeLocal, flashSaved]);

  // Keyboard shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? '').toUpperCase();
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (!started) {
        if (e.key === 'Enter' && canStart) {
          e.preventDefault();
          begin();
        }
        return;
      }
      if (finished) return;
      const st = steps[stepIndex];
      if (!st) return;
      if (e.key === 'Enter') {
        if (tag === 'TEXTAREA') return;
        e.preventDefault();
        goNext();
        return;
      }
      if (st.kind !== 'question' || typing) return;
      const q = st.q;
      if (q.type === 'scale' && q.scale) {
        const n = parseInt(e.key, 10);
        if (n >= q.scale.min && n <= q.scale.max) setAnswer(q.id, n, true);
        return;
      }
      if (q.type === 'rating') {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 5) setAnswer(q.id, n, true);
        return;
      }
      if (q.type === 'single_select' || q.type === 'multi_select' || q.type === 'yes_no') {
        const list = q.type === 'yes_no' ? [{ value: 'Yes' }, { value: 'No' }] : q.options ?? [];
        const i = e.key.toUpperCase().charCodeAt(0) - 65;
        if (i >= 0 && i < list.length) {
          if (q.type === 'multi_select') {
            const arr = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
            const v = list[i].value;
            setAnswer(q.id, arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
          } else setAnswer(q.id, list[i].value, true);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, finished, canStart, begin, goNext, steps, stepIndex, answers, setAnswer]);

  // Confetti on finish.
  useEffect(() => {
    if (!finished) return;
    const c = canvasRef.current;
    if (!c || (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches)) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = c.clientWidth,
      H = c.clientHeight;
    c.width = W * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const colors = ['#9AD571', '#63a834', '#437c1f', '#323546', '#b2dd88', '#cbe9ad'];
    const P = Array.from({ length: 140 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.5,
      y: H * 0.3 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 9,
      vy: Math.random() * -10 - 3,
      g: 0.24 + Math.random() * 0.1,
      s: 5 + Math.random() * 7,
      rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 0.32,
      c: colors[(Math.random() * colors.length) | 0],
    }));
    const dur = 2400;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const el = t - t0;
      ctx.clearRect(0, 0, W, H);
      P.forEach((p) => {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - el / dur);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
        ctx.restore();
      });
      if (el < dur) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [finished]);

  const passed = steps.slice(0, stepIndex).filter((x) => x.kind === 'question').length;
  const curNo = steps.slice(0, stepIndex + 1).filter((x) => x.kind === 'question').length;
  const pct = finished ? 100 : total ? Math.round((passed / total) * 100) : 0;
  const inSurvey = started && !finished;
  const answeredCount = Object.values(answers).filter((v) => v !== '' && v != null && !(Array.isArray(v) && v.length === 0)).length;
  const ending = content.ending;

  // Engagement milestone toasts at 25/50/75% — once per attempt (spec §13.3).
  const showToast = useCallback((m: { title: string; body: string }) => {
    setToast(m);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3600);
  }, []);
  useEffect(() => {
    if (!inSurvey || !theme.engagement.enabled || !theme.engagement.milestones) return;
    for (const m of [75, 50, 25]) {
      if (pct >= m && !firedRef.current.has(m)) {
        firedRef.current.add(m);
        showToast(MILESTONES[m]);
        break;
      }
    }
  }, [pct, inSurvey, theme.engagement.enabled, theme.engagement.milestones, showToast]);

  // Section-divider encouragement note (spec §13.3).
  const sectionEncouragement =
    inSurvey && current?.kind === 'section' && theme.engagement.enabled && theme.engagement.encouragements
      ? ENCOURAGEMENTS[content.sections.findIndex((s) => s.id === current.section.id) % ENCOURAGEMENTS.length] ?? null
      : null;

  // Builder preview frame (spec §13.5): force a phone-width column when device==='mobile'.
  const framed = device === 'mobile';

  return (
    <div
      className="ns-ds"
      style={
        framed
          ? { position: 'relative', width: 402, maxWidth: '100%', minHeight: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', background: '#fff', border: '10px solid var(--slate-800,#20222c)', borderRadius: 40, overflow: 'hidden', boxShadow: 'var(--shadow-lg,0 24px 60px rgba(0,0,0,.2))' }
          : { position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }
      }
    >
      <SurveyDecor background={theme.background} />
      {toast && (
        <div role="status" aria-live="polite" className="ns-toast" style={{ position: framed ? 'absolute' : 'fixed', top: framed ? 70 : 76, left: '50%', transform: 'translateX(-50%)', zIndex: 60, maxWidth: 'min(92vw,360px)', display: 'flex', gap: 12, alignItems: 'flex-start', padding: '13px 16px', borderRadius: 14, background: '#fff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg,0 16px 40px rgba(0,0,0,.16))' }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--green-100)', fontSize: 16 }}>🌱</span>
          <span>
            <span style={{ display: 'block', fontFamily: DISPLAY, fontWeight: 600, fontSize: 14.5, color: 'var(--ink)' }}>{toast.title}</span>
            <span style={{ display: 'block', fontSize: 13, lineHeight: 1.45, color: 'var(--text-muted)', marginTop: 2 }}>{toast.body}</span>
          </span>
        </div>
      )}
      <header style={{ position: framed ? 'static' : 'sticky', top: 0, zIndex: 20, background: 'rgba(255,255,255,.92)', backdropFilter: 'saturate(1.1) blur(8px)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '12px clamp(16px,4vw,40px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18, color: 'var(--ink)' }}>NetSifr</span>
            <span style={{ fontFamily: DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-muted)', paddingLeft: 10, borderLeft: '1px solid var(--border)' }}>Research</span>
          </div>
          {inSurvey && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span role="status" aria-live="polite" style={{ fontFamily: MONO, fontSize: 12.5, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>Question {Math.min(curNo || 1, total)} of {total}</span>
              <span title="Progress saved" style={{ width: 8, height: 8, borderRadius: '50%', background: savedFlash ? 'var(--brand-strong)' : 'var(--slate-300)', transition: 'background .3s ease' }} />
            </div>
          )}
        </div>
        {inSurvey && (
          <div style={{ height: 3, background: 'var(--slate-100)', width: '100%' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brand-strong)', transition: 'width .35s cubic-bezier(.2,.7,.2,1)' }} />
          </div>
        )}
      </header>

      <main style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: framed ? 'clamp(24px,5vh,40px) 22px' : 'clamp(28px,6vh,72px) clamp(20px,5vw,40px)' }}>
        <div ref={stageRef} tabIndex={-1} style={{ width: '100%', maxWidth: 720, outline: 'none' }}>
          {!started && (
            <div className={animClass} style={animStyle}>
              <div className="ns-eyebrow" style={{ marginBottom: 18 }}>NetSifr Research Study</div>
              <h1 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'clamp(30px,5vw,50px)', lineHeight: 1.08, letterSpacing: '-.02em', color: 'var(--ink)' }}>{title}</h1>
              {content.subtitle && <p style={{ fontSize: 'clamp(16px,2vw,19px)', lineHeight: 1.6, color: 'var(--text-body)', margin: '18px 0 0', maxWidth: '60ch' }}>{content.subtitle}</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 22px', margin: '26px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
                {[content.estimatedTime, `${total} questions · skip any`, 'Confidential & anonymous'].map((m, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)' }} />{m}</span>
                ))}
              </div>
              {content.forWho && <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--text-muted)', margin: '20px 0 0', maxWidth: '62ch' }}>{content.forWho}</p>}

              {needConsent && (
                <div style={{ marginTop: 28, border: '1px solid var(--border)', borderRadius: 16, padding: '22px 22px 20px', background: 'var(--slate-50)' }}>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginBottom: 8 }}>{consent.heading}</div>
                  <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-body)', margin: 0, whiteSpace: 'pre-wrap' }}>{consent.body}</p>
                  <button type="button" onClick={() => setAgreed((a) => !a)} style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, width: '100%', padding: '12px 14px', border: `1.5px solid ${agreed ? 'var(--brand-strong)' : 'var(--border)'}`, borderRadius: 11, background: agreed ? 'var(--green-50)' : '#fff', cursor: 'pointer' }}>
                    <span style={{ width: 24, height: 24, borderRadius: 6, flex: 'none', display: 'grid', placeItems: 'center', border: `1.5px solid ${agreed ? 'var(--brand-strong)' : 'var(--border-strong)'}`, background: agreed ? 'var(--brand-strong)' : '#fff' }}>
                      {agreed && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                    </span>
                    <span style={{ fontSize: 15, color: 'var(--ink)', textAlign: 'left' }}>{consent.acknowledgeLabel}</span>
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 30 }}>
                {resume ? (
                  <>
                    <button type="button" className="ns-btn ns-btn--primary ns-btn--lg" disabled={!canStart} onClick={resumeSurvey}>Resume where I left off →</button>
                    <button type="button" className="ns-btn ns-btn--ghost" onClick={begin}>Start over</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="ns-btn ns-btn--primary ns-btn--lg" disabled={!canStart} onClick={begin}>Begin survey →</button>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>or press Enter ⏎</span>
                  </>
                )}
              </div>
              {submitError && <p style={{ color: 'var(--danger)', fontSize: 14, marginTop: 12 }}>{submitError}</p>}
            </div>
          )}

          {inSurvey && current?.kind === 'section' && (
            <div className={animClass} style={animStyle} key={`sec-${stepIndex}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--brand)', flex: 'none' }} />
                <span className="ns-eyebrow">{current.section.kicker || 'Section'}</span>
              </div>
              <h2 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'clamp(28px,4.4vw,44px)', lineHeight: 1.1, letterSpacing: '-.015em', color: 'var(--ink)' }}>{current.section.title}</h2>
              {current.section.subtitle && <p style={{ fontSize: 'clamp(15px,1.9vw,18px)', lineHeight: 1.6, color: 'var(--text-body)', margin: '16px 0 0', maxWidth: '60ch' }}>{current.section.subtitle}</p>}
              {sectionEncouragement && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginTop: 20, padding: '9px 14px', borderRadius: 999, background: 'var(--green-50)', border: '1px solid var(--green-100)' }}>
                  <span aria-hidden style={{ fontSize: 14 }}>🌱</span>
                  <span style={{ fontSize: 13.5, color: 'var(--brand-strong)', fontWeight: 500 }}>{sectionEncouragement}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 32 }}>
                <button type="button" className="ns-btn ns-btn--primary ns-btn--lg" onClick={goNext}>Continue →</button>
                {history.length > 0 && <button type="button" className="ns-btn ns-btn--ghost" onClick={goBack}>← Back</button>}
              </div>
            </div>
          )}

          {inSurvey && current?.kind === 'question' && (
            <div className={animClass} style={animStyle} key={`q-${stepIndex}`}>
              <QuestionView q={current.q} sectionTitle={current.section.title} refLabel={current.q.ref ?? `Q${curNo}`} value={answers[current.q.id]} otherValue={(answers[otherKey(current.q.id)] as string) ?? ''} onChange={setAnswer} isLast={stepIndex === steps.length - 1} onNext={goNext} onBack={history.length > 0 ? goBack : undefined} />
            </div>
          )}

          {finished && (
            <div className={animClass} style={{ position: 'relative', ...animStyle }}>
              <canvas ref={canvasRef} style={{ position: 'absolute', inset: '-40px -80px auto', width: 'calc(100% + 160px)', height: 340, pointerEvents: 'none' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--green-100)', display: 'grid', placeItems: 'center', marginBottom: 24 }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--brand-strong)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <h1 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'clamp(30px,5vw,48px)', lineHeight: 1.08, letterSpacing: '-.02em', color: 'var(--ink)' }}>{ending.heading || 'Thank you.'}</h1>
                {ending.body && <p style={{ fontSize: 'clamp(16px,2vw,19px)', lineHeight: 1.6, color: 'var(--text-body)', margin: '18px 0 0', maxWidth: '60ch' }}>{ending.body}</p>}

                {ending.showSummary && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginTop: 30 }}>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: '18px', background: '#fff', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 34, lineHeight: 1, color: 'var(--brand-strong)' }}>{answeredCount}/{total}</div>
                      <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 8 }}>questions you answered</div>
                    </div>
                  </div>
                )}

                {ending.imageUrl && <div style={{ marginTop: 28 }}><img src={ending.imageUrl} alt="" style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 16 }} /></div>}

                {submitError && <p style={{ color: 'var(--danger)', fontSize: 14, marginTop: 12 }}>{submitError}</p>}
                {preview && <p style={{ fontFamily: MONO, fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>PREVIEW — no response was recorded.</p>}

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 30 }}>
                  {ending.ctaLabel && ending.ctaUrl && <a href={ending.ctaUrl} target="_blank" rel="noopener" className="ns-btn ns-btn--primary ns-btn--lg">{ending.ctaLabel} ↗</a>}
                  {ending.secondaryLabel && ending.secondaryUrl && <a href={ending.secondaryUrl} target="_blank" rel="noopener" className="ns-btn ns-btn--ghost">{ending.secondaryLabel}</a>}
                  {!preview && <button type="button" className="ns-btn ns-btn--ghost" onClick={restart}>↺ Submit another response</button>}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function QuestionView({
  q,
  sectionTitle,
  refLabel,
  value,
  otherValue,
  onChange,
  isLast,
  onNext,
  onBack,
}: {
  q: Question;
  sectionTitle: string;
  refLabel: string;
  value: AnswerValue | undefined;
  otherValue: string;
  onChange: (qid: string, v: AnswerValue, auto?: boolean) => void;
  isLast: boolean;
  onNext: () => void;
  onBack?: () => void;
}) {
  const baseOptions = q.type === 'yes_no' ? [{ id: 'y', label: 'Yes', value: 'Yes' }, { id: 'n', label: 'No', value: 'No' }] : q.options ?? [];
  // Append the "Other…" escape hatch when enabled (spec P5).
  const canOther = q.allowOther && (q.type === 'single_select' || q.type === 'multi_select' || q.type === 'dropdown');
  const options = canOther ? [...baseOptions, { id: '__other', label: 'Other…', value: OTHER_VALUE }] : baseOptions;
  const otherSelected =
    q.type === 'multi_select' ? Array.isArray(value) && value.includes(OTHER_VALUE) : value === OTHER_VALUE;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: 'var(--brand-strong)', letterSpacing: '.02em' }}>{refLabel}</span>
        <span style={{ width: 14, height: 1, background: 'var(--border-strong)' }} />
        <span style={{ fontFamily: DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{sectionTitle}</span>
        {q.required && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· required</span>}
      </div>
      <h2 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'clamp(22px,3.3vw,34px)', lineHeight: 1.16, letterSpacing: '-.01em', color: 'var(--ink)' }}>{q.title}</h2>
      {q.help && <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--text-muted)', margin: '12px 0 0', maxWidth: '60ch' }}>{q.help}</p>}
      {q.imageUrl && <img src={q.imageUrl} alt="" style={{ marginTop: 18, width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 16, border: '1px solid var(--border)' }} />}

      <div style={{ marginTop: 'clamp(24px,4vh,38px)' }}>
        {(q.type === 'single_select' || q.type === 'multi_select' || q.type === 'yes_no') && (
          <div role={q.type === 'multi_select' ? 'group' : 'radiogroup'} aria-label={q.title} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {options.map((o, i) => {
              const multi = q.type === 'multi_select';
              const sel = multi ? Array.isArray(value) && value.includes(o.value) : value === o.value;
              const isOther = o.value === OTHER_VALUE;
              return (
                <button key={o.id} type="button" role={multi ? 'checkbox' : 'radio'} aria-checked={sel} onClick={() => {
                  if (multi) {
                    const arr = Array.isArray(value) ? (value as string[]) : [];
                    onChange(q.id, arr.includes(o.value) ? arr.filter((x) => x !== o.value) : [...arr, o.value]);
                  } else onChange(q.id, o.value, !isOther); // don't auto-advance into "Other" — let them type
                }} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '15px 18px', borderRadius: 14, border: `1.5px solid ${sel ? 'var(--brand-strong)' : 'var(--border)'}`, background: sel ? 'var(--green-50)' : '#fff', color: 'var(--ink)', cursor: 'pointer', fontSize: 17, textAlign: 'left', boxShadow: sel ? 'var(--shadow-sm)' : 'none', transition: 'border-color .16s, background .16s, box-shadow .16s' }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', flex: 'none', fontFamily: DISPLAY, fontWeight: 600, fontSize: 13, border: `1.5px solid ${sel ? 'var(--brand-strong)' : 'var(--border-strong)'}`, background: sel ? 'var(--brand-strong)' : '#fff', color: sel ? '#fff' : 'var(--text-muted)' }}>{String.fromCharCode(65 + i)}</span>
                  <span style={{ flex: 1, textAlign: 'left', lineHeight: 1.4 }}>{o.label}</span>
                </button>
              );
            })}
            {canOther && otherSelected && (
              <input autoFocus value={otherValue} placeholder="Please specify…" onChange={(e) => onChange(otherKey(q.id), e.target.value)} style={{ width: '100%', maxWidth: 480, height: 48, padding: '0 16px', fontSize: 16, color: 'var(--ink)', background: '#fff', border: '1.5px solid var(--brand-strong)', borderRadius: 12, marginLeft: 2 }} />
            )}
          </div>
        )}

        {q.type === 'dropdown' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <select value={(value as string) ?? ''} onChange={(e) => onChange(q.id, e.target.value, e.target.value !== OTHER_VALUE)} style={{ width: '100%', maxWidth: 440, padding: '14px 16px', fontSize: 17, color: 'var(--ink)', background: '#fff', border: '1.5px solid var(--border-strong)', borderRadius: 12, cursor: 'pointer' }}>
              <option value="">Choose…</option>
              {options.map((o) => <option key={o.id} value={o.value}>{o.label}</option>)}
            </select>
            {canOther && otherSelected && (
              <input autoFocus value={otherValue} placeholder="Please specify…" onChange={(e) => onChange(otherKey(q.id), e.target.value)} style={{ width: '100%', maxWidth: 440, height: 48, padding: '0 16px', fontSize: 16, color: 'var(--ink)', background: '#fff', border: '1.5px solid var(--brand-strong)', borderRadius: 12 }} />
            )}
          </div>
        )}

        {q.type === 'scale' && q.scale && (
          <div>
            <div style={{ display: 'flex', gap: 10, maxWidth: 520 }}>
              {Array.from({ length: q.scale.max - q.scale.min + 1 }, (_, i) => q.scale!.min + i).map((n) => {
                const sel = value === n;
                return <button key={n} type="button" onClick={() => onChange(q.id, n, true)} style={{ flex: 1, minWidth: 0, height: 62, borderRadius: 13, cursor: 'pointer', border: `1.5px solid ${sel ? 'var(--brand-strong)' : 'var(--border-strong)'}`, background: sel ? 'var(--brand-strong)' : '#fff', color: sel ? '#fff' : 'var(--ink)', fontFamily: DISPLAY, fontWeight: 600, fontSize: 20 }}>{n}</button>;
              })}
            </div>
            {(q.scale.minLabel || q.scale.maxLabel) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 520, marginTop: 12, gap: 16 }}>
                <span style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: '44%' }}>{q.scale.minLabel}</span>
                <span style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: '44%', textAlign: 'right' }}>{q.scale.maxLabel}</span>
              </div>
            )}
          </div>
        )}

        {q.type === 'rating' && (
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => onChange(q.id, n, true)} aria-label={`${n} star`} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', lineHeight: 0 }}>
                <svg viewBox="0 0 24 24" width="40" height="40"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.6L12 18.9 6.1 21.2l1.2-6.6L2.5 9.4l6.6-.9z" fill={(value as number) >= n ? 'var(--brand)' : 'none'} stroke="var(--brand-strong)" strokeWidth="1.4" strokeLinejoin="round" /></svg>
              </button>
            ))}
          </div>
        )}

        {q.type === 'ranking' && <RankingView options={(q.options ?? []).map((o) => o.value)} value={Array.isArray(value) ? (value as string[]) : (q.options ?? []).map((o) => o.value)} onChange={(v) => onChange(q.id, v)} />}

        {(q.type === 'short_text' || q.type === 'number' || q.type === 'email' || q.type === 'date') && (
          <input type={q.type === 'number' ? 'number' : q.type === 'email' ? 'email' : q.type === 'date' ? 'date' : 'text'} value={(value as string) ?? ''} placeholder={q.placeholder ?? 'Type your answer…'} onChange={(e) => onChange(q.id, e.target.value)} style={{ width: '100%', maxWidth: 480, height: 52, padding: '0 16px', fontSize: 17, color: 'var(--ink)', background: '#fff', border: '1.5px solid var(--border-strong)', borderRadius: 12 }} />
        )}
        {q.type === 'long_text' && (
          <textarea rows={5} value={(value as string) ?? ''} placeholder={q.placeholder ?? 'Type your answer…'} onChange={(e) => onChange(q.id, e.target.value)} style={{ width: '100%', maxWidth: 620, padding: 14, fontSize: 17, lineHeight: 1.55, color: 'var(--ink)', background: '#fff', border: '1.5px solid var(--border-strong)', borderRadius: 12, resize: 'vertical' }} />
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 'clamp(28px,5vh,44px)' }}>
        <button type="button" className="ns-btn ns-btn--primary ns-btn--lg" onClick={onNext}>{isLast ? 'Finish ✓' : 'OK →'}</button>
        {onBack && <button type="button" className="ns-btn ns-btn--ghost" onClick={onBack}>← Back</button>}
      </div>
    </div>
  );
}

function RankingView({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const order = value.length === options.length ? value : options;
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxWidth: 540 }}>
      {order.map((v, i) => (
        <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 14px', border: '1.5px solid var(--border)', borderRadius: 12, background: '#fff' }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--brand-strong)', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: DISPLAY, fontWeight: 600, fontSize: 13, flex: 'none' }}>{i + 1}</span>
          <span style={{ flex: 1, fontSize: 16, color: 'var(--ink)', lineHeight: 1.35 }}>{v}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} style={{ width: 30, height: 22, display: 'grid', placeItems: 'center', border: '1px solid var(--border)', borderRadius: 6, background: i === 0 ? 'var(--slate-50)' : '#fff', color: i === 0 ? 'var(--slate-300)' : 'var(--slate-600)', cursor: i === 0 ? 'default' : 'pointer' }}>↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1} style={{ width: 30, height: 22, display: 'grid', placeItems: 'center', border: '1px solid var(--border)', borderRadius: 6, background: i === order.length - 1 ? 'var(--slate-50)' : '#fff', color: i === order.length - 1 ? 'var(--slate-300)' : 'var(--slate-600)', cursor: i === order.length - 1 ? 'default' : 'pointer' }}>↓</button>
          </div>
        </div>
      ))}
    </div>
  );
}
