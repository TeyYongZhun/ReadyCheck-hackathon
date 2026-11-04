// Check-in maths shared by the employee card, the manager's Check-ins tab and Home.
// Only voluntary inputs: check-ins people chose to send and the questions they chose to ask.
import type { CheckIn, NewHire, PulseAnswer, PulseKey, SupportAction } from '../types';
import type { CheckinInsightsRequest, CheckinInsightsResponse } from '../api-types';
import { PULSE, PULSE_ACTION, PULSE_THEME } from '../data/checkins';

export type Totals = Record<PulseKey, Record<PulseAnswer, number>>;

export interface ReachOut {
  hire: NewHire;
  checkin: CheckIn;
  signals: string[];
  /** The latest follow-up for this person this week, if a manager chose one. */
  action?: SupportAction;
}

const SCORE: Record<PulseAnswer, number> = { yes: 2, partly: 1, notyet: 0 };

/** Each person's most recent check-in. */
export function latestByPerson(checkins: CheckIn[]): Map<string, CheckIn> {
  const out = new Map<string, CheckIn>();
  checkins.forEach((c) => { const cur = out.get(c.person); if (!cur || c.week > cur.week) out.set(c.person, c); });
  return out;
}

export function totalsOf(list: CheckIn[]): Totals {
  const t = Object.fromEntries(PULSE.map((p) => [p.key, { yes: 0, partly: 0, notyet: 0 }])) as Totals;
  list.forEach((c) => PULSE.forEach((p) => { t[p.key][c.answers[p.key]] += 1; }));
  return t;
}

const concern = (c: CheckIn) => PULSE.filter((p) => c.answers[p.key] !== 'yes');

/** People who shared their name and may need someone to reach out: a "not yet", two "partly", or an open ticket signal. */
export function reachOutList(cohort: NewHire[], latest: Map<string, CheckIn>, signalsFor: (id: string) => string[], actions: SupportAction[]): ReachOut[] {
  return cohort.flatMap((hire) => {
    const checkin = latest.get(hire.id);
    if (!checkin?.named) return [];
    const signals = signalsFor(hire.id);
    const notYet = PULSE.filter((p) => checkin.answers[p.key] === 'notyet').length;
    const partly = PULSE.filter((p) => checkin.answers[p.key] === 'partly').length;
    if (!notYet && partly < 2 && !signals.length) return [];
    const action = actions.filter((x) => x.person === hire.id && x.week === checkin.week).slice(-1)[0];
    return [{ hire, checkin, signals, action, rank: (checkin.isNew ? 100 : 0) + notYet * 3 + partly + signals.length }];
  })
    .sort((a, b) => b.rank - a.rank)
    .map(({ rank: _rank, ...r }) => r);
}

/** Rule-based reading of one person's evidence, shown until (or instead of) the AI's. */
export function fallbackWhy(r: ReachOut): { why: string; action: string } {
  const notYet = PULSE.filter((p) => r.checkin.answers[p.key] === 'notyet');
  const partly = PULSE.filter((p) => r.checkin.answers[p.key] === 'partly');
  const list = (ps: typeof PULSE) => ps.map((p) => p.short.toLowerCase()).join(' and ');
  const answered = [notYet.length ? `“not yet” on ${list(notYet)}` : '', partly.length ? `“partly” on ${list(partly)}` : ''].filter(Boolean).join('; ');
  const parts = [
    answered ? 'Answered ' + answered : '',
    r.signals[0] ? r.signals[0][0].toLowerCase() + r.signals[0].slice(1) : '',
  ].filter(Boolean);
  // The first part opens the sentence, whichever part that is.
  if (parts.length) parts[0] = parts[0][0].toUpperCase() + parts[0].slice(1);
  const first = notYet[0] ?? partly[0];
  return {
    why: parts.join('; ') + '.',
    action: first ? PULSE_ACTION[first.key] : 'Ask the expert to follow up on their ticket',
  };
}

/** Rule-based cohort themes: the statements most people did not answer "yes" to. */
export function fallbackThemes(list: CheckIn[]): CheckinInsightsResponse['themes'] {
  const totals = totalsOf(list);
  return PULSE
    .map((p) => ({ p, n: totals[p.key].notyet + totals[p.key].partly }))
    .filter((x) => x.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .map(({ p, n }) => ({
      name: PULSE_THEME[p.key].name, count: n,
      summary: `${n} of ${list.length} new hires answered “not yet” or “partly” to “${p.text}”.`,
      action: PULSE_THEME[p.key].action,
    }));
}

/** Done follow-ups whose person checked in again the week after: did their answers get better? */
export function followUpResults(checkins: CheckIn[], actions: SupportAction[], cohort: NewHire[]) {
  const done = actions.filter((x) => x.person && x.status === 'done');
  return done.flatMap((x) => {
    const before = checkins.find((c) => c.person === x.person && c.week === x.week);
    const after = checkins.find((c) => c.person === x.person && c.week === x.week + 1);
    const hire = cohort.find((h) => h.id === x.person);
    if (!before || !after || !hire) return [];
    const changed = concern(before).map((p) => ({ p, from: before.answers[p.key], to: after.answers[p.key] }));
    const better = PULSE.reduce((s, p) => s + SCORE[after.answers[p.key]] - SCORE[before.answers[p.key]], 0) > 0;
    return [{ action: x, hire, changed, better }];
  });
}

/** What Gemini is given: counts, anonymous notes, and evidence only for people who shared their name. No names. */
export function insightsRequest(list: CheckIn[], cohortSize: number, reach: ReachOut[]): CheckinInsightsRequest {
  return {
    cohort: cohortSize,
    responses: list.length,
    totals: totalsOf(list),
    notes: list.map((c) => c.note?.trim()).filter((n): n is string => !!n),
    people: reach.map((r) => ({ id: r.hire.id, week: r.checkin.week, answers: r.checkin.answers, note: r.checkin.note, signals: r.signals })),
  };
}
