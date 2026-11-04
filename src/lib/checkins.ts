// Check-in maths shared by the employee card, the manager's Check-ins tab and Home.
// Only voluntary inputs: check-ins people chose to send and the questions they chose to ask.
import type { CheckIn, CorePulseKey, MilestoneKey, NewHire, PulseAnswer, SupportAction } from '../types';
import type { CheckinInsightsRequest, CheckinInsightsResponse } from '../api-types';
import { CHECKIN_MILESTONES, CORE_PULSE, MIN_GROUP, milestoneOrder, PULSE_ACTION, PULSE_THEME, questionsForMilestone } from '../data/checkins';

export type Totals = Record<CorePulseKey, Record<PulseAnswer, number>>;

export interface ReachOut {
  hire: NewHire;
  signals: string[];
  /** Individual check-in context is always named and explicitly shared. */
  checkin: CheckIn & { named: true };
  /** The follow-up planned for this person's latest milestone, if any. */
  action?: SupportAction;
}

const SCORE: Record<PulseAnswer, number | null> = { yes: 2, partly: 1, notyet: 0, na: null };
type ProgressStatus = 'improved' | 'persisted' | 'worsened' | 'new' | 'not-comparable';
type DimensionProgress = { p: (typeof CORE_PULSE)[number]; from: PulseAnswer; to: PulseAnswer; status: ProgressStatus };

/** Average over applicable answers, excluding N/A so scores remain comparable. */
export function checkInScore(checkin: CheckIn, keys: CorePulseKey[] = CORE_PULSE.map((p) => p.key)): number | null {
  const applicable = keys.filter((key) => SCORE[checkin.answers[key]] !== null);
  if (!applicable.length) return null;
  return applicable.reduce((total, key) => total + (SCORE[checkin.answers[key]] ?? 0), 0) / applicable.length;
}

/** Each person's most recent check-in. */
export function latestByPerson(checkins: CheckIn[]): Map<string, CheckIn> {
  const out = new Map<string, CheckIn>();
  checkins.forEach((c) => { const cur = out.get(c.person); if (!cur || milestoneOrder(c.milestone) > milestoneOrder(cur.milestone)) out.set(c.person, c); });
  return out;
}

export function latestByPersonAtMilestone(checkins: CheckIn[], milestone: MilestoneKey): CheckIn[] {
  const out = new Map<string, CheckIn>();
  checkins.filter((c) => c.milestone === milestone).forEach((c) => out.set(c.person, c));
  return [...out.values()];
}

export function totalsOf(list: CheckIn[]): Totals {
  const t = Object.fromEntries(CORE_PULSE.map((p) => [p.key, { yes: 0, partly: 0, notyet: 0, na: 0 }])) as Totals;
  list.forEach((c) => CORE_PULSE.forEach((p) => { t[p.key][c.answers[p.key]] += 1; }));
  return t;
}

function stageTotalsOf(list: CheckIn[]): CheckinInsightsRequest['stageTotals'] {
  return Object.fromEntries(CHECKIN_MILESTONES.flatMap((milestone) => {
    const checkins = latestByPersonAtMilestone(list, milestone.key);
    if (checkins.length < MIN_GROUP) return [];
    const totals = Object.fromEntries(['yes', 'partly', 'notyet', 'na'].map((answer) => [answer, 0])) as Record<PulseAnswer, number>;
    checkins.forEach((checkin) => { totals[checkin.answers.stage] += 1; });
    return [[milestone.key, totals]];
  }));
}

/** People who shared their name and may need someone to reach out: a "not yet", two "partly", or an open ticket signal. */
export function reachOutList(cohort: NewHire[], latest: Map<string, CheckIn>, signalsFor: (id: string) => string[], actions: SupportAction[]): ReachOut[] {
  return cohort.flatMap((hire) => {
    const checkin = latest.get(hire.id);
    if (!checkin || !checkin.named) return [];
    const signals = signalsFor(hire.id);
    const questions = questionsForMilestone(checkin.milestone);
    const notYet = questions.filter((p) => checkin.answers[p.key] === 'notyet').length;
    const partly = questions.filter((p) => checkin.answers[p.key] === 'partly').length;
    if (!notYet && partly < 2 && !signals.length) return [];
    const action = actions.filter((x) => x.person === hire.id && x.milestone === checkin.milestone).slice(-1)[0];
    return [{ hire, checkin: { ...checkin, named: true as const }, signals, action, rank: (checkin.isNew ? 100 : 0) + notYet * 3 + partly + signals.length }];
  })
    .sort((a, b) => b.rank - a.rank)
    .map(({ rank: _rank, ...r }) => r);
}

/** Rule-based reading of one person's evidence, shown until (or instead of) the AI's. */
export function fallbackWhy(r: ReachOut): { why: string; action: string } {
  const questions = questionsForMilestone(r.checkin.milestone);
  const notYet = questions.filter((p) => r.checkin.answers[p.key] === 'notyet');
  const partly = questions.filter((p) => r.checkin.answers[p.key] === 'partly');
  const list = (ps: typeof questions) => ps.map((p) => p.short.toLowerCase()).join(' and ');
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
  return CORE_PULSE
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

/** Completed follow-ups with a later milestone check-in: compare only the stable core questions. */
export function followUpResults(checkins: CheckIn[], actions: SupportAction[], cohort: NewHire[]) {
  const done = actions.filter((x) => x.person && x.status === 'done');
  return done.flatMap((x) => {
    const before = checkins.find((c) => c.person === x.person && c.milestone === x.milestone);
    const nextMilestone = CHECKIN_MILESTONES.find((m) => m.order === milestoneOrder(x.milestone) + 1);
    const after = nextMilestone && checkins.find((c) => c.person === x.person && c.milestone === nextMilestone.key);
    const hire = cohort.find((h) => h.id === x.person);
    if (!before?.named || !after?.named || !hire) return [];
    const comparable = CORE_PULSE.filter((p) => SCORE[before.answers[p.key]] !== null && SCORE[after.answers[p.key]] !== null);
    const dimensions = CORE_PULSE.flatMap<DimensionProgress>((p) => {
      const beforeScore = SCORE[before.answers[p.key]];
      const afterScore = SCORE[after.answers[p.key]];
      if (beforeScore === null) {
        return afterScore !== null && afterScore < 2
          ? [{ p, from: before.answers[p.key], to: after.answers[p.key], status: 'new' as const }]
          : [];
      }
      if (afterScore === null) {
        return beforeScore < 2
          ? [{ p, from: before.answers[p.key], to: after.answers[p.key], status: 'not-comparable' as const }]
          : [];
      }
      if (beforeScore === 2 && afterScore === 2) return [];
      const status = beforeScore < 2
        ? afterScore > beforeScore ? 'improved' as const : afterScore < beforeScore ? 'worsened' as const : 'persisted' as const
        : 'new' as const;
      return [{ p, from: before.answers[p.key], to: after.answers[p.key], status }];
    });
    const beforeScore = checkInScore(before, comparable.map((p) => p.key));
    const afterScore = checkInScore(after, comparable.map((p) => p.key));
    const scoreChange = beforeScore === null || afterScore === null ? null : afterScore - beforeScore;
    return [{ action: x, hire, dimensions, comparableCount: comparable.length, beforeScore, afterScore, scoreChange, better: scoreChange !== null && scoreChange > 0 }];
  });
}

/** What Gemini is given: counts, anonymous notes, and evidence only for people who shared their name. No names. */
export function insightsRequest(checkins: CheckIn[], cohortSize: number, reach: ReachOut[]): CheckinInsightsRequest {
  const list = [...latestByPerson(checkins).values()];
  return {
    cohort: cohortSize,
    responses: list.length,
    totals: totalsOf(list),
    stageTotals: stageTotalsOf(checkins),
    anonymousNotes: list.length >= MIN_GROUP ? checkins
      .filter((checkin) => !checkin.named)
      .map((checkin) => checkin.note?.trim())
      .filter((note): note is string => !!note) : [],
    people: reach.filter((r) => r.checkin.named).map((r) => ({
      id: r.hire.id,
      named: true,
      milestone: r.checkin.milestone,
      answers: r.checkin.answers,
      followUps: r.checkin.followUps,
      note: r.checkin.note,
      signals: r.signals,
    })),
  };
}
