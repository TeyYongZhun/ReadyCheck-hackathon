// Shared domain types. Mirrors design/component-types.d.ts from the Claude Design export.

export type Mode = 'employee' | 'manager';
export type CardKind = 'video' | 'doc' | 'steps' | 'answer';
export type CardState = 'idle' | 'solved' | 'escalating' | 'routing' | 'escalated';

export interface Attachment { id: string; name: string; size?: number; kind: 'image' | 'file'; url?: string; mimeType?: string }

export interface Chapter { t: number; label: string }
export interface DocPoint { text: string; page?: number }
export interface Step { label: string; detail?: string }

export interface VideoCardData { title: string; source?: string; kindLabel?: string; duration: number; chapters?: Chapter[] }
export interface DocCardData { title: string; source?: string; kindLabel?: string; file: string; pages: number; updated?: string; points: DocPoint[] }
export interface StepsCardData { title: string; source?: string; kindLabel?: string; steps: Step[]; done?: number[]; materials?: { name: string; url: string; mimeType: string }[] }

export type CardSpec =
  | { id: string; type: 'video'; props: VideoCardData }
  | { id: string; type: 'doc'; props: DocCardData }
  | { id: string; type: 'steps'; props: StepsCardData };

/** One company-library card in the manager's Knowledge base. Edits and discards change what ReadyCheck AI can answer from. */
export interface LibraryEntry {
  card: CardSpec;
  /** The built-in scenario this card came from. */
  scenario: string;
  topic: ThemeKey;
  status: 'live' | 'discarded';
  edited?: boolean;
  discardReason?: string;
}

export interface Expert { name: string; initials: string; eta: string }

export interface Scenario {
  key: string;
  match: RegExp;
  heading: string;
  queue: string;
  expert: Expert;
  cards: CardSpec[];
}

/** One of the employee's own tickets, as the "My tickets" dock shows it. */
export interface DashboardItem {
  id: string; title: string;
  state: 'waiting' | 'live' | 'solved';
  /** "Waiting for an expert", "With Ana", "Solved". */
  status: string;
  roomId?: string;
}

export type ThemeKey = 'db' | 'vpn' | 'onb' | 'exp' | 'pay' | 'mfa' | 'leave' | 'hw' | 'ben';

export interface Theme {
  key: ThemeKey;
  name: string;
  short: string;
  /** Employees who asked. */
  count: number;
  /** How many of them a card solved. */
  cards: number;
  trend: number;
  /** Questions per day, Mon to Sun. */
  days: number[];
  people: string[];
  summary: string;
  asked: string[];
}

export interface Pic { id: string; name: string; first: string; initials: string; team: string; skills: string; covers: string[]; custom?: boolean }

export interface QueueTicket {
  id: string; person: string; first: string; initials: string; role: string; theme: ThemeKey;
  /** Minutes waiting. */
  wait: number;
  /** Timestamp used to keep newly escalated tickets' wait time current. */
  createdAt?: number;
  from: string; slug: string; q: string;
  title?: string;
  files?: Pick<Attachment, 'name' | 'kind'>[];
  isNew?: boolean; leaving?: boolean;
}

export type RoomStatus = 'live' | 'waiting' | 'resolved';
export interface Room {
  id: string; ticket?: string; tickets?: string[]; name: string; theme: ThemeKey; pic: string; people: string[];
  status: RoomStatus;
  /** Minutes since opened. */
  elapsed: number;
  last: string; isNew?: boolean;
  /** Full name of the first employee, for seeded rooms that have no ticket to take it from. */
  who?: string;
}

/** pic = the assigned expert, manager = Rachel replying from the Command Center. */
export type MessageFrom = 'pic' | 'employee' | 'manager' | 'system';
export interface Message {
  id: string; from: MessageFrom; t: string; text: string; kind?: 'kb' | 'booked'; kbId?: string;
  /** Written by Gemini standing in for the expert. */
  ai?: boolean;
  /** Part of the "Play sample conversation" demo script. */
  scripted?: boolean;
}

export type KbStatus = 'review' | 'live' | 'discarded';
export interface KbItem {
  id: string; roomId: string | null; roomName: string; theme: ThemeKey; title: string; problem?: string; steps: string[];
  pic: Pick<Pic, 'id' | 'name' | 'first' | 'initials' | 'team'>; employee: string;
  status: KbStatus; at?: string; edited?: boolean; discardReason?: string; manual?: boolean;
  /** Summarised from the scripted sample conversation, not written by the model. */
  sample?: boolean;
  files?: Pick<Attachment, 'name' | 'kind' | 'size' | 'url' | 'mimeType'>[];
  allowEmployeeAccess?: boolean;
}

/** The languages an employee can ask in: English, Bahasa Melayu, Chinese, Tamil. */
export type Lang = 'en' | 'ms' | 'zh' | 'ta';

/** What the canvas shows for one question: one card, plus who handles it if escalated. */
export interface CanvasAnswer {
  heading: string;
  theme: ThemeKey;
  queue: string;
  expert: Expert;
  card: CardSpec;
  /** "ai": Gemini chose or wrote it. "offline": keyword fallback because the AI call failed. */
  source: 'ai' | 'offline';
  /** The employee asked in another language: `card` is the AI translation, `original` the approved English card. */
  translated?: { lang: Lang; original: CardSpec };
}

/** A short conversational reply when the message isn't a work issue (e.g. "hi"). No card, nothing to escalate. */
export interface ChatReply {
  heading: string;
  message: string;
  source: 'ai' | 'offline';
}

export interface HistoryEntry {
  id: string; query: string; answer: CanvasAnswer; cardType: CardKind; title: string; heading: string; at: string;
  state: 'viewed' | 'solved' | 'escalated'; ticketId?: string; files?: Pick<Attachment, 'name' | 'kind'>[];
  /** Milliseconds from asking to the card, for Home's "Time to an answer". */
  ms?: number;
}

export type ManagerTab = 'home' | 'needs' | 'checkins' | 'rooms' | 'trends' | 'knowledge' | 'team';

export type MilestoneKey = 'week1' | 'week2' | 'day30' | 'day60' | 'day90';
export type PulseKey = 'clarity' | 'support' | 'workload' | 'stage';
export type CorePulseKey = Exclude<PulseKey, 'stage'>;
export type PulseAnswer = 'yes' | 'partly' | 'notyet' | 'na';

/** One person in the onboarding cohort, as the manager's Check-ins tab knows them. */
export interface NewHire {
  id: string; name: string; first: string; initials: string; role: string; team: string;
  /** Current onboarding milestone. */
  milestone: MilestoneKey;
  /** Ticket signals from before this session (seed only). Live ones come from shared state. */
  signals?: string[];
}

/** A milestone check-in the employee chose to send. */
export interface CheckIn {
  id: string; person: string;
  milestone: MilestoneKey;
  at: string;
  /** Timestamp of the original submission; editing does not extend the five-minute window. */
  submittedAt?: number;
  answers: Record<PulseKey, PulseAnswer>;
  /** Optional, question-specific context shown only after Partly or Not yet. */
  followUps?: Partial<Record<PulseKey, string>>;
  note?: string;
  /** The employee chose to share their name. If not, it only counts in cohort totals. */
  named: boolean;
  isNew?: boolean;
}

/** A support step a manager chose, for one person or for a cohort theme, tracked until done. */
export interface SupportAction {
  id: string;
  person?: string;
  theme?: string;
  label: string; owner: string; when: string;
  status: 'planned' | 'done';
  /** The milestone it was planned in, so the next check-in can show whether it helped. */
  milestone: MilestoneKey;
}
