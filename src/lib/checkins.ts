// Check-in maths shared by the employee card, the manager's Check-ins tab and Home.
// Only voluntary inputs: check-ins people chose to send and the questions they chose to ask.
import type { CheckIn, CorePulseKey, MilestoneKey, NewHire, PulseAnswer, PulseKey, SupportAction } from '../types';
import { CHECKIN_MILESTONES, CORE_PULSE, MIN_GROUP, daysSince, milestoneOrder, questionsForMilestone, windowOf } from '../data/checkins';

export type Totals = Record<CorePulseKey, Record<PulseAnswer, number>>;

export interface ReachOut {
  hire: NewHire;
  signals: string[];
  /** Individual check-in context is always named and explicitly shared. */
  checkin: CheckIn & { named: true };
  /** The follow-up planned for this person's latest milestone, if any. */
  action?: SupportAction;
}

/** Each person's most recent check-in: the highest milestone wins, and within one milestone the later submission wins. */
export function latestByPerson(checkins: CheckIn[]): Map<string, CheckIn> {
  const out = new Map<string, CheckIn>();
  checkins.forEach((c) => {
    const cur = out.get(c.person);
    if (!cur || milestoneOrder(c.milestone) >= milestoneOrder(cur.milestone)) out.set(c.person, c);
  });
  return out;
}

export function latestByPersonAtMilestone(checkins: CheckIn[], milestone: MilestoneKey): CheckIn[] {
  const out = new Map<string, CheckIn>();
  checkins.filter((c) => c.milestone === milestone).forEach((c) => out.set(c.person, c));
  return [...out.values()];
}

export function pulseCheckinsForView(checkins: CheckIn[], latest: CheckIn[], milestone: MilestoneKey | null): CheckIn[] {
  return milestone ? latestByPersonAtMilestone(checkins, milestone) : latest;
}

export function namedShareOf(list: CheckIn[]): { named: number; total: number } {
  return { named: list.filter((checkin) => checkin.named).length, total: list.length };
}

export function pulseQuestionsWithDifficulty(totals: Totals, total: number): CorePulseKey[] {
  if (!total) return [];
  return CORE_PULSE
    .filter(({ key }) => (totals[key].partly + totals[key].notyet) * 2 >= total)
    .map(({ key }) => key);
}

/**
 * Upcoming: nobody has reached this milestone yet.
 * Open:     at least one person is still inside this milestone's window.
 * Closed:   every person's window for this milestone has ended.
 */
export type MilestoneState = 'Upcoming' | 'Open' | 'Closed';

export function milestoneParticipation(checkins: CheckIn[], cohort: NewHire[], now = Date.now()) {
  return CHECKIN_MILESTONES.map((milestone) => {
    const { open, close } = windowOf(milestone);
    const age = (hire: NewHire) => daysSince(hire.joinedAt, now);
    const doneIds = new Set(checkins.filter((c) => c.milestone === milestone.key).map((c) => c.person));

    // Participation counts only employees currently inside this milestone's window.
    const active = cohort.filter((hire) => age(hire) >= open && age(hire) <= close);
    const done = active.filter((hire) => doneIds.has(hire.id)).length;
    // Only people whose window has already ended and who did not check in count as missed.
    // People still inside the window are not penalised: they can still respond.
    const missed = cohort.filter((hire) => age(hire) > close && !doneIds.has(hire.id)).length;

    const state: MilestoneState = !cohort.some((hire) => age(hire) >= open)
      ? 'Upcoming'
      : cohort.every((hire) => age(hire) > close)
        ? 'Closed'
        : 'Open';

    return { milestone, eligible: active.length, done, missed, state };
  });
}

export function totalsOf(list: CheckIn[]): Totals {
  const t = Object.fromEntries(CORE_PULSE.map((p) => [p.key, { yes: 0, partly: 0, notyet: 0, na: 0 }])) as Totals;
  list.forEach((checkin) => questionsForMilestone(checkin.milestone).forEach((question) => {
    t[question.key][checkin.answers[question.key]] += 1;
  }));
  return t;
}

/**
 * Difficulties at one milestone that at least MIN_GROUP employees reported, so a single answer can never
 * be singled out, each with its group-level action if there is one.
 */
export function supportNeedsAt(checkins: CheckIn[], actions: SupportAction[], milestone: MilestoneKey) {
  const totals = totalsOf(latestByPersonAtMilestone(checkins, milestone));
  return questionsForMilestone(milestone)
    .map((question) => ({
      question,
      partly: totals[question.key].partly,
      notyet: totals[question.key].notyet,
      action: actions.find((action) => !action.person && action.milestone === milestone && (action.pulse === question.key || (!action.pulse && action.theme
        && (action.theme === question.key || action.theme === question.dimension || action.theme.toLowerCase().includes(question.dimension.toLowerCase()))))),
    }))
    .filter(({ partly, notyet }) => partly + notyet >= MIN_GROUP);
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

/** What an action was about, in the words of the milestone it was planned in. */
export function actionTopic(action: SupportAction): string {
  return questionsForMilestone(action.milestone).find((question) => question.key === action.pulse)?.dimension ?? action.label;
}

/** A difficulty with no published action is followed up under this id instead of an action id. */
const DIFFICULTY = 'difficulty:';
const difficultyId = (milestone: MilestoneKey, pulse: PulseKey) => `${DIFFICULTY}${milestone}:${pulse}`;
function difficultyOf(id: string) {
  const [, milestone, pulse] = id.split(':') as [string, MilestoneKey, PulseKey];
  return { milestone, topic: questionsForMilestone(milestone).find((question) => question.key === pulse)?.dimension ?? 'Follow-up' };
}

export interface PendingFollowUp { id: string; topic: string; prompt: string; personal: boolean; hasAction: boolean }

/**
 * Milestone questions change on purpose, so a difficulty is followed up by asking about it directly.
 * Every Partly or Not yet from a person's previous check-in is asked about once at their next one, with
 * the published cohort action if there is one, plus their own completed actions. This works for anonymous
 * check-ins too, because only the system uses the link between a person and their answers. The manager
 * never sees who was asked.
 */
export function followUpsDue(checkins: CheckIn[], actions: SupportAction[], person: string, milestone: MilestoneKey): PendingFollowUp[] {
  const order = milestoneOrder(milestone);
  const earlier = checkins
    .filter((checkin) => checkin.person === person && milestoneOrder(checkin.milestone) < order)
    .sort((a, b) => milestoneOrder(a.milestone) - milestoneOrder(b.milestone));
  const replied = new Set(earlier.flatMap((checkin) => (checkin.actionFollowUps ?? []).map((reply) => reply.actionId)));
  const own = actions
    .filter((action) => action.person === person && action.status === 'done' && milestoneOrder(action.milestone) < order && !replied.has(action.id))
    .map((action) => ({ id: action.id, topic: actionTopic(action), prompt: `Last time: ${action.label}`, personal: true, hasAction: true }));
  const previous = earlier[earlier.length - 1];
  if (!previous) return own;
  const difficulties = questionsForMilestone(previous.milestone)
    .filter((question) => previous.answers[question.key] === 'partly' || previous.answers[question.key] === 'notyet')
    .flatMap((question) => {
      const action = actions.find((item) => !item.person && item.milestone === previous.milestone && item.pulse === question.key && item.status === 'done' && item.publishedAt);
      const id = action?.id ?? difficultyId(previous.milestone, question.key);
      if (replied.has(id)) return [];
      const prompt = action ? `Last time you said this was difficult. ${action.publicNote}` : 'Last time you said this was difficult.';
      return [{ id, topic: question.dimension, prompt, personal: false, hasAction: !!action }];
    });
  return [...difficulties, ...own];
}

function repliesTo(checkins: CheckIn[], actionId: string) {
  return checkins.flatMap((checkin) => (checkin.actionFollowUps ?? [])
    .filter((reply) => reply.actionId === actionId)
    .map((reply) => ({ checkin, reply })));
}

/**
 * Replies to an action, plus earlier replies about the same difficulty once anyone has replied to the action
 * itself. Those earlier replies are why one person's reply can reach MIN_GROUP without being shown alone.
 */
function repliesFor(checkins: CheckIn[], action: SupportAction) {
  const own = repliesTo(checkins, action.id);
  if (!own.length || action.person || !action.pulse) return own;
  return [...repliesTo(checkins, difficultyId(action.milestone, action.pulse)), ...own];
}

/**
 * Replies to a cohort action stay hidden below MIN_GROUP, and also when exactly one is unidentified:
 * the rest could otherwise be subtracted to reveal that one answer.
 */
function canShowReplies(replies: ReturnType<typeof repliesTo>): boolean {
  const unidentified = replies.filter(({ checkin, reply }) => !checkin.named && !reply.talk).length;
  return replies.length >= MIN_GROUP && unidentified !== 1;
}

/**
 * Replies grouped by action or difficulty. Names appear only on named check-ins, and anonymous replies are
 * sorted by content so their order can't hint at who sent them. A reply about a person's own action is shown
 * only if named, because the action already identifies them. Someone who gave their name to talk was told
 * their answers stay out of it, so an anonymous reply of theirs loses its comment.
 */
export function followUpFeed(checkins: CheckIn[], actions: SupportAction[], cohort: NewHire[]) {
  const rowsOf = (list: ReturnType<typeof repliesTo>) => list
    .map(({ checkin, reply }) => ({
      hire: checkin.named ? cohort.find((item) => item.id === checkin.person) : undefined,
      answer: reply.answer,
      comment: checkin.named || !reply.talk ? reply.comment : undefined,
    }))
    .sort((a, b) => Number(!a.hire) - Number(!b.hire) || a.answer.localeCompare(b.answer) || (a.comment ?? '').localeCompare(b.comment ?? ''));
  const forActions = actions.filter((action) => action.status === 'done').flatMap((action) => {
    const all = repliesFor(checkins, action);
    const shown = action.person ? all.filter(({ checkin }) => checkin.person === action.person && checkin.named) : all;
    if (action.person ? !shown.length : !action.publishedAt || !canShowReplies(all)) return [];
    return [{ id: action.id, topic: actionTopic(action), label: action.label as string | undefined, milestone: action.milestone, replies: rowsOf(shown) }];
  });
  const ids = new Set(checkins.flatMap((checkin) => (checkin.actionFollowUps ?? []).map((reply) => reply.actionId)));
  const merged = actions.filter((action) => !action.person && action.pulse && repliesTo(checkins, action.id).length)
    .map((action) => difficultyId(action.milestone, action.pulse!));
  const forDifficulties = [...ids].filter((id) => id.startsWith(DIFFICULTY) && !merged.includes(id)).flatMap((id) => {
    const all = repliesTo(checkins, id);
    if (!canShowReplies(all)) return [];
    return [{ id, ...difficultyOf(id), label: undefined, replies: rowsOf(all) }];
  });
  return [...forActions, ...forDifficulties];
}

/** Totals of the replies to a published cohort action, under the same rule as the replies themselves. */
export function groupFollowUp(checkins: CheckIn[], actions: SupportAction[]) {
  return actions.filter((action) => !action.person && action.status === 'done' && action.pulse && action.publishedAt).flatMap((action) => {
    const replies = repliesFor(checkins, action);
    if (!canShowReplies(replies)) return [];
    return [{ action, improved: replies.filter(({ reply }) => reply.answer === 'better').length, responded: replies.length }];
  });
}

/** People who chose to give their name to talk about one topic. Their answers are not part of this. */
export function talkRequests(checkins: CheckIn[], actions: SupportAction[], cohort: NewHire[]) {
  return checkins.flatMap((checkin) => (checkin.actionFollowUps ?? []).filter((reply) => reply.talk).flatMap((reply) => {
    const action = actions.find((item) => item.id === reply.actionId);
    const hire = cohort.find((item) => item.id === checkin.person);
    const topic = action ? actionTopic(action) : reply.actionId.startsWith(DIFFICULTY) ? difficultyOf(reply.actionId).topic : undefined;
    return topic && hire ? [{ id: `${checkin.id}:${reply.actionId}`, hire, topic }] : [];
  }));
}
