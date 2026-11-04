// Check-in maths shared by the employee card, the manager's Check-ins tab and Home.
// Only voluntary inputs: check-ins people chose to send and the questions they chose to ask.
import type { CheckIn, CorePulseKey, MilestoneKey, NewHire, PulseAnswer, SupportAction } from '../types';
import { CHECKIN_MILESTONES, CORE_PULSE, daysSince, milestoneOrder, questionsForMilestone, windowOf } from '../data/checkins';

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
type ProgressStatus = 'improved' | 'persisted' | 'worsened';
type DimensionProgress = { p: (typeof CORE_PULSE)[number]; from: PulseAnswer; to: PulseAnswer; status: ProgressStatus };

/** Each person's most recent check-in. */
export function latestByPerson(checkins: CheckIn[]): Map<string, CheckIn> {
  const out = new Map<string, CheckIn>();
  [...checkins].reverse().forEach((c) => { const cur = out.get(c.person); if (!cur || milestoneOrder(c.milestone) >= milestoneOrder(cur.milestone)) out.set(c.person, c); });
  return out;
}

export function latestByPersonAtMilestone(checkins: CheckIn[], milestone: MilestoneKey): CheckIn[] {
  const out = new Map<string, CheckIn>();
  checkins.filter((c) => c.milestone === milestone).forEach((c) => out.set(c.person, c));
  return [...out.values()];
}

export function milestoneParticipation(checkins: CheckIn[], cohort: NewHire[], now = Date.now()) {
  return CHECKIN_MILESTONES.map((milestone) => {
    const { open, close } = windowOf(milestone);
    const eligible = cohort.filter((hire) => daysSince(hire.joinedAt, now) >= open);
    const doneIds = new Set(checkins.filter((checkin) => checkin.milestone === milestone.key).map((checkin) => checkin.person));
    const done = eligible.filter((hire) => doneIds.has(hire.id)).length;
    const overdue = eligible.filter((hire) => daysSince(hire.joinedAt, now) > close && !doneIds.has(hire.id)).length;
    const status = !eligible.length ? 'Upcoming' : done === eligible.length ? 'Completed' : 'In progress';
    return { milestone, eligible: eligible.length, done, overdue, status };
  });
}

export function totalsOf(list: CheckIn[]): Totals {
  const t = Object.fromEntries(CORE_PULSE.map((p) => [p.key, { yes: 0, partly: 0, notyet: 0, na: 0 }])) as Totals;
  list.forEach((c) => CORE_PULSE.forEach((p) => { t[p.key][c.answers[p.key]] += 1; }));
  return t;
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

/** Completed follow-ups with a later, named check-in: compare only the same stable questions. */
export function followUpResults(checkins: CheckIn[], actions: SupportAction[], cohort: NewHire[]) {
  const done = actions.filter((x) => x.person && x.status === 'done');
  return done.flatMap((x) => {
    const before = checkins.find((c) => c.person === x.person && c.milestone === x.milestone && c.named);
    const after = checkins
      .filter((c) => c.person === x.person && c.named && milestoneOrder(c.milestone) > milestoneOrder(x.milestone))
      .sort((a, b) => milestoneOrder(a.milestone) - milestoneOrder(b.milestone))[0];
    const hire = cohort.find((h) => h.id === x.person);
    if (!before?.named || !after?.named || !hire) return [];
    const dimensions = CORE_PULSE.flatMap<DimensionProgress>((p) => {
      const beforeScore = SCORE[before.answers[p.key]];
      const afterScore = SCORE[after.answers[p.key]];
      if (beforeScore === null || beforeScore === 2 || afterScore === null) return [];
      const status = afterScore > beforeScore ? 'improved' as const : afterScore < beforeScore ? 'worsened' as const : 'persisted' as const;
      return [{ p, from: before.answers[p.key], to: after.answers[p.key], status }];
    });
    return dimensions.length ? [{ action: x, hire, afterMilestone: after.milestone, dimensions }] : [];
  });
}
