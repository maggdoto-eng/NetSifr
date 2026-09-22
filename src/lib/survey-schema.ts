/*
 * NetSifr Survey — shared, framework-agnostic schema + analytics.
 * Ported/typed from the `Custom Interactive Survey Tool` prototype
 * (survey-schema.js). No prisma / no server-only: imported by the client
 * Builder & Runner AND by the server module. The DB stores a survey's
 * `content` (subtitle, forWho, estimatedTime, consent, sections, ending) as
 * one JSON document; title/slug/status/version are columns.
 */

export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_select'
  | 'multi_select'
  | 'dropdown'
  | 'yes_no'
  | 'ranking'
  | 'scale'
  | 'rating'
  | 'number'
  | 'date'
  | 'email';

export type Option = { id: string; label: string; value: string };
export type Scale = { min: number; max: number; minLabel: string; maxLabel: string };
export type LogicRule = {
  whenValue: string;
  action: 'skipToSection' | 'skipToEnd';
  target?: string;
};

export type Question = {
  id: string;
  ref?: string;
  type: QuestionType;
  title: string;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: Option[];
  scale?: Scale;
  logic?: LogicRule[];
};

export type Section = {
  id: string;
  title: string;
  kicker?: string;
  subtitle?: string;
  questions: Question[];
};

export type Consent = {
  heading: string;
  body: string;
  require: boolean;
  acknowledgeLabel: string;
};

export type Ending = {
  heading: string;
  body: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  secondaryLabel?: string;
  secondaryUrl?: string;
  showSummary?: boolean;
};

/** The editable JSON document stored in Survey.content. */
export type SurveyContent = {
  subtitle: string;
  forWho: string;
  estimatedTime: string;
  consent: Consent;
  sections: Section[];
  ending: Ending;
};

export type AnswerValue = string | number | string[];
export type Answers = Record<string, AnswerValue>;
export type SurveyResponseLite = {
  id?: string;
  submittedAt: string | Date;
  complete: boolean;
  answers: Answers;
};

/* ---- Question-type catalogue (drives the Builder's "add question" menu) ---- */
export const QUESTION_TYPES: Array<{
  type: QuestionType;
  label: string;
  group: string;
  hasOptions: boolean;
  hint: string;
}> = [
  { type: 'short_text', label: 'Short answer', group: 'Text', hasOptions: false, hint: 'One line of free text' },
  { type: 'long_text', label: 'Paragraph', group: 'Text', hasOptions: false, hint: 'Multi-line open response' },
  { type: 'single_select', label: 'Multiple choice', group: 'Choice', hasOptions: true, hint: 'Pick exactly one' },
  { type: 'multi_select', label: 'Checkboxes', group: 'Choice', hasOptions: true, hint: 'Pick any that apply' },
  { type: 'dropdown', label: 'Dropdown', group: 'Choice', hasOptions: true, hint: 'Pick one from a list' },
  { type: 'yes_no', label: 'Yes / No', group: 'Choice', hasOptions: false, hint: 'Binary choice' },
  { type: 'ranking', label: 'Ranking', group: 'Choice', hasOptions: true, hint: 'Order items by priority' },
  { type: 'scale', label: 'Linear scale', group: 'Scale', hasOptions: false, hint: 'e.g. 1 to 5 with end labels' },
  { type: 'rating', label: 'Star rating', group: 'Scale', hasOptions: false, hint: '1–5 stars' },
  { type: 'number', label: 'Number', group: 'Other', hasOptions: false, hint: 'Numeric input' },
  { type: 'date', label: 'Date', group: 'Other', hasOptions: false, hint: 'Calendar date' },
  { type: 'email', label: 'Email', group: 'Other', hasOptions: false, hint: 'Validated email address' },
];
export const TYPE_META = Object.fromEntries(QUESTION_TYPES.map((t) => [t.type, t])) as Record<
  QuestionType,
  (typeof QUESTION_TYPES)[number]
>;

let _seq = 0;
export function uid(prefix = 'id'): string {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}${_seq}`;
}
function opts(...labels: string[]): Option[] {
  return labels.map((label, i) => ({ id: `o${i + 1}`, label, value: label }));
}

/* ---- Builder blanks ---- */
export function blankQuestion(type: QuestionType = 'single_select'): Question {
  const meta = TYPE_META[type] ?? TYPE_META.single_select;
  const q: Question = { id: uid('q'), type, title: '', required: false };
  if (meta.hasOptions) q.options = opts('Option 1', 'Option 2', 'Option 3');
  if (type === 'scale') q.scale = { min: 1, max: 5, minLabel: '', maxLabel: '' };
  return q;
}
export function blankSection(): Section {
  return { id: uid('sec'), title: 'Untitled section', kicker: '', questions: [blankQuestion('single_select')] };
}
export function blankSurveyContent(): SurveyContent {
  return {
    subtitle: '',
    forWho: '',
    estimatedTime: '5 minutes',
    consent: { heading: 'Before we begin', body: '', require: false, acknowledgeLabel: 'I understand and agree to take part.' },
    sections: [blankSection()],
    ending: { heading: 'Thank you.', body: '', imageUrl: '', ctaLabel: '', ctaUrl: '', showSummary: false },
  };
}

/* ---- Runner stepping ---- */
export type Step =
  | { kind: 'section'; section: Section }
  | { kind: 'question'; q: Question; section: Section };

export function buildSteps(content: SurveyContent): Step[] {
  const steps: Step[] = [];
  content.sections.forEach((section) => {
    steps.push({ kind: 'section', section });
    section.questions.forEach((q) => steps.push({ kind: 'question', q, section }));
  });
  return steps;
}

export function evalLogic(
  q: Question | undefined,
  value: AnswerValue | undefined,
): { skipToSection?: string; skipToEnd?: boolean } | null {
  if (!q || !q.logic) return null;
  for (const rule of q.logic) {
    if (rule.whenValue === value) {
      if (rule.action === 'skipToEnd') return { skipToEnd: true };
      if (rule.action === 'skipToSection') return { skipToSection: rule.target };
    }
  }
  return null;
}

export function countQuestions(content: SurveyContent): number {
  return content.sections.reduce((n, s) => n + s.questions.length, 0);
}

/* ---- Filtering + analytics (ported verbatim in behaviour) ---- */
export function filterResponses(
  responses: SurveyResponseLite[],
  f: { completeOnly?: boolean; from?: string; to?: string; segQid?: string; segValue?: string } = {},
): SurveyResponseLite[] {
  return responses.filter((r) => {
    if (f.completeOnly && !r.complete) return false;
    const t = new Date(r.submittedAt).getTime();
    if (f.from && t < new Date(f.from).getTime()) return false;
    if (f.to && t > new Date(f.to + 'T23:59:59').getTime()) return false;
    if (f.segQid && f.segValue != null && f.segValue !== '') {
      const a = r.answers[f.segQid];
      if (Array.isArray(a) ? !a.includes(f.segValue) : a !== f.segValue) return false;
    }
    return true;
  });
}

export function segmentableQuestions(content: SurveyContent) {
  const out: Array<{ id: string; ref?: string; title: string; options: { value: string; label: string }[] }> = [];
  content.sections.forEach((sec) =>
    sec.questions.forEach((q) => {
      if (q.type === 'single_select' || q.type === 'dropdown' || q.type === 'yes_no') {
        const o =
          q.type === 'yes_no'
            ? [
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
              ]
            : q.options ?? [];
        if (o.length && o.length <= 8) out.push({ id: q.id, ref: q.ref, title: q.title, options: o });
      }
    }),
  );
  return out;
}

export type AggregateItem = {
  id: string;
  ref?: string;
  title: string;
  type: QuestionType;
  section: string;
  answered: number;
  answerRate: number;
  distribution?: { label: string; count: number; pct: number }[];
  average?: number;
  scaleMin?: number;
  scaleMax?: number;
  minLabel?: string;
  maxLabel?: string;
  ranking?: { label: string; avgRank: number }[];
  textResponses?: string[];
};

export function aggregate(content: SurveyContent, responses: SurveyResponseLite[]) {
  const total = responses.length;
  const completed = responses.filter((r) => r.complete).length;
  const questions: AggregateItem[] = [];
  content.sections.forEach((sec) =>
    sec.questions.forEach((q) => {
      const vals = responses
        .map((r) => r.answers[q.id])
        .filter((v) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0));
      const answered = vals.length;
      const item: AggregateItem = {
        id: q.id,
        ref: q.ref,
        title: q.title,
        type: q.type,
        section: sec.title,
        answered,
        answerRate: total ? Math.round((answered / total) * 100) : 0,
      };
      if (q.type === 'single_select' || q.type === 'dropdown' || q.type === 'yes_no') {
        const o =
          q.type === 'yes_no'
            ? [
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
              ]
            : q.options ?? [];
        item.distribution = o.map((opt) => {
          const c = vals.filter((v) => v === opt.value).length;
          return { label: opt.label, count: c, pct: answered ? Math.round((c / answered) * 100) : 0 };
        });
      } else if (q.type === 'multi_select') {
        const o = q.options ?? [];
        item.distribution = o.map((opt) => {
          const c = vals.filter((v) => Array.isArray(v) && v.includes(opt.value)).length;
          return { label: opt.label, count: c, pct: answered ? Math.round((c / answered) * 100) : 0 };
        });
      } else if (q.type === 'scale' || q.type === 'rating') {
        const mn = q.type === 'rating' ? 1 : q.scale!.min;
        const mx = q.type === 'rating' ? 5 : q.scale!.max;
        const nums = vals.map(Number).filter((x) => !isNaN(x));
        item.average = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        item.scaleMin = mn;
        item.scaleMax = mx;
        item.minLabel = q.type === 'scale' ? q.scale!.minLabel : '1 star';
        item.maxLabel = q.type === 'scale' ? q.scale!.maxLabel : '5 stars';
        const dist: { label: string; count: number; pct: number }[] = [];
        for (let n = mn; n <= mx; n++) {
          const c = nums.filter((x) => x === n).length;
          dist.push({ label: String(n), count: c, pct: nums.length ? Math.round((c / nums.length) * 100) : 0 });
        }
        item.distribution = dist;
      } else if (q.type === 'ranking') {
        const o = q.options ?? [];
        item.ranking = o
          .map((opt) => {
            let sum = 0,
              cnt = 0;
            vals.forEach((arr) => {
              if (Array.isArray(arr)) {
                const idx = arr.indexOf(opt.value);
                if (idx >= 0) {
                  sum += idx + 1;
                  cnt++;
                }
              }
            });
            return { label: opt.label, avgRank: cnt ? sum / cnt : 0 };
          })
          .sort((a, b) => a.avgRank - b.avgRank);
      } else {
        item.textResponses = (vals as string[]).slice().reverse();
      }
      questions.push(item);
    }),
  );
  return { total, completed, completionRate: total ? Math.round((completed / total) * 100) : 0, questions };
}

export function crosstab(
  content: SurveyContent,
  responses: SurveyResponseLite[],
  segQid: string,
  targetQid: string,
) {
  let segQ: Question | undefined, tgtQ: Question | undefined;
  content.sections.forEach((sec) =>
    sec.questions.forEach((q) => {
      if (q.id === segQid) segQ = q;
      if (q.id === targetQid) tgtQ = q;
    }),
  );
  if (!segQ || !tgtQ) return null;
  const segOpts =
    segQ.type === 'yes_no'
      ? [
          { value: 'Yes', label: 'Yes' },
          { value: 'No', label: 'No' },
        ]
      : segQ.options ?? [];
  const segments = segOpts
    .map((o) => {
      const subset = responses.filter((r) => r.answers[segQid] === o.value);
      return { value: o.value, label: o.label, n: subset.length, subset };
    })
    .filter((s) => s.n > 0);

  const base = {
    segTitle: segQ.title,
    targetTitle: tgtQ.title,
    targetType: tgtQ.type,
    segments: segments.map((s) => ({ value: s.value, label: s.label, n: s.n })),
  };

  if (tgtQ.type === 'scale' || tgtQ.type === 'rating') {
    return {
      ...base,
      mode: 'average' as const,
      scaleMax: tgtQ.type === 'rating' ? 5 : tgtQ.scale!.max,
      averages: segments.map((s) => {
        const nums = s.subset.map((r) => Number(r.answers[targetQid])).filter((x) => !isNaN(x));
        return { label: s.label, n: nums.length, avg: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0 };
      }),
    };
  }
  const tOpts =
    tgtQ.type === 'yes_no'
      ? [
          { value: 'Yes', label: 'Yes' },
          { value: 'No', label: 'No' },
        ]
      : tgtQ.options ?? [];
  return {
    ...base,
    mode: 'distribution' as const,
    rows: tOpts.map((o) => ({
      label: o.label,
      cells: segments.map((s) => {
        const vals = s.subset.map((r) => r.answers[targetQid]).filter((x) => x != null && x !== '');
        const c = vals.filter((v) => (Array.isArray(v) ? v.includes(o.value) : v === o.value)).length;
        return { count: c, pct: vals.length ? Math.round((c / vals.length) * 100) : 0 };
      }),
    })),
  };
}
