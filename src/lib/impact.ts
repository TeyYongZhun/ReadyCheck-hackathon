// What ReadyCheck saved: this week's sample baseline plus every question asked in this session.
import type { HistoryEntry } from '../types';
import { THEMES } from '../data/command';

/** Assumed expert minutes per question a card answers instead. Shown next to every number that uses it. */
export const MIN_PER_TICKET = 12;
/** Sample median wait for an expert, for comparison with the card's answer time. */
export const SAMPLE_EXPERT_WAIT = 22;

export interface Impact {
  asked: number;
  answered: number;
  /** Share of questions a card answered without a person, 0 to 1. */
  deflection: number;
  hoursSaved: number;
  /** Median seconds from asking to a card, this session; null before any timed answer. */
  answerSecs: number | null;
  timed: number;
}

export function impactOf(history: HistoryEntry[]): Impact {
  const baseAsked = THEMES.reduce((s, t) => s + t.count, 0), baseAnswered = THEMES.reduce((s, t) => s + t.cards, 0);
  // A card counts as answering unless the employee still asked for a person, or it was an "I don't know".
  const liveAnswered = history.filter((h) => h.state !== 'escalated' && !h.answer.card.id.startsWith('unknown-')).length;
  const asked = baseAsked + history.length, answered = baseAnswered + liveAnswered;
  const times = history.map((h) => h.ms).filter((ms): ms is number => typeof ms === 'number').sort((a, b) => a - b);
  const mid = times.length ? (times.length % 2 ? times[(times.length - 1) / 2] : (times[times.length / 2 - 1] + times[times.length / 2]) / 2) : null;
  return {
    asked, answered,
    deflection: asked ? answered / asked : 0,
    hoursSaved: (answered * MIN_PER_TICKET) / 60,
    answerSecs: mid === null ? null : mid / 1000,
    timed: times.length,
  };
}
