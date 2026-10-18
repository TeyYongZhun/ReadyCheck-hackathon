// Home tab sample data for any week the manager picks. 12–18 Oct 2026 keeps the hand-made HOME figures;
// every other week gets stable pseudo-random numbers seeded by its start date. All of it is labelled sample data.
// TODO: replace with real ticket counts for the chosen week.
import { HOME } from './command';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86400000;

export const DEFAULT_WEEK = new Date(2026, 9, 12); // Mon 12 Oct 2026

export interface WeekData {
  range: string;
  days: string[]; daily: number[];
  weeks: string[]; weekly: number[];
  stats: { open: number; overdue: number; resolvedPct: number; resolved: number; cohort: number; awaiting: number };
  cats: [string, number][];
  byPic: [string, number][];
}

/** Monday 00:00 of the week containing `d`. */
export function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

const dm = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

export function rangeLabel(start: Date): string {
  const end = addDays(start, 6);
  if (start.getMonth() === end.getMonth()) return `${start.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  if (start.getFullYear() === end.getFullYear()) return `${dm(start)} – ${dm(end)} ${end.getFullYear()}`;
  return `${dm(start)} ${start.getFullYear()} – ${dm(end)} ${end.getFullYear()}`;
}

/** Small deterministic PRNG so a week always shows the same numbers. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return (lo: number, hi: number) => { s = (s * 1664525 + 1013904223) >>> 0; return lo + (s % (hi - lo + 1)); };
}

export function weekData(start: Date): WeekData {
  const days = Array.from({ length: 7 }, (_, i) => dm(addDays(start, i)));
  const weeks = Array.from({ length: 7 }, (_, i) => dm(addDays(start, (i - 6) * 7 + 6)));
  if (start.getTime() === DEFAULT_WEEK.getTime()) {
    return { range: HOME.range, days: HOME.days, daily: HOME.daily, weeks: HOME.weeks, weekly: HOME.weekly, cats: HOME.cats, byPic: HOME.byPic,
      stats: { open: 21, overdue: 4, resolvedPct: 72, resolved: 18, cohort: 25, awaiting: 7 } };
  }
  const r = rng(Math.floor(start.getTime() / DAY_MS));
  let v = r(25, 48);
  const daily = days.map(() => (v = Math.max(5, v + r(-7, 4))));
  const weekly = weeks.map((_, i) => (i === 6 ? daily[6] : r(20, 45)));
  const open = daily[6], overdue = r(1, Math.max(2, Math.round(open / 4)));
  const cohort = r(18, 32), resolved = r(Math.round(cohort / 2), cohort - 2);
  const catNames = HOME.cats.map((c) => c[0]);
  const cats = catNames.map((n) => [n, r(1, 9)] as [string, number]).sort((a, b) => b[1] - a[1]);
  const byPic = HOME.byPic.map(([id]) => [id, r(1, 9)] as [string, number]).sort((a, b) => b[1] - a[1]);
  return { range: rangeLabel(start), days, daily, weeks, weekly, cats, byPic,
    stats: { open, overdue, resolvedPct: Math.round((resolved / cohort) * 100), resolved, cohort, awaiting: r(2, 10) } };
}

/** yyyy-mm-dd for <input type="date">. */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
