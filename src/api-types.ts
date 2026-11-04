// Request/response shapes for /api/*. Shared by the browser (src/lib/api.ts) and the server (server/).
import type { CardSpec, CorePulseKey, Lang, MilestoneKey, PulseAnswer, PulseKey, ThemeKey } from './types';

export interface ChatLine { from: 'pic' | 'employee' | 'manager'; text: string }
export interface PicPersona { name: string; first: string; team: string; skills: string }
export interface TicketContext { q: string; from: string }

export interface AnswerRequest {
  query: string;
  files: string[];
  /** The company-library cards the manager has live, with their edits. Omitted: the built-in sample library. */
  library?: CardSpec[];
  /** Approved knowledge-base cards, so the model can prefer them. */
  learned: { id: string; theme: ThemeKey; title: string; steps: string[]; materials?: { name: string; url: string; mimeType: string }[] }[];
}
export interface AnswerResponse {
  heading: string;
  theme: ThemeKey;
  queue: string;
  /** "chat": not a work issue (a greeting, thanks, small talk); `message` holds a short reply and there is no card. */
  choice: 'chat' | 'library' | 'learned' | 'unknown';
  message?: string;
  /** Library card id or learned KB id, when the answer is based on company knowledge. */
  cardId?: string;
  card?: { title: string; steps: { label: string; detail?: string }[] };
  /** The language the question was written in; heading and message come back in it. */
  lang?: Lang;
}

/** Translate one approved card's text into the employee's language. Same shape back; nothing added. */
export interface TranslateCardRequest { lang: Exclude<Lang, 'en'>; card: CardSpec }
export interface TranslateCardResponse { card: CardSpec }

export interface RoomReplyRequest { pic: PicPersona; employee: string; ticket: TicketContext | null; messages: ChatLine[] }
export interface RoomReplyResponse { reply: string; solved: boolean }

export interface SummarizeRequest { roomName: string; pic: PicPersona; employee: string; ticket: TicketContext | null; messages: ChatLine[] }
export interface SummarizeResponse { title: string; problem: string; steps: string[] }

export interface ThemeSummaryRequest { theme: string; questions: string[] }
export interface ThemeSummaryResponse { summary: string }
export interface HomeSummaryRequest {
  openTickets: number;
  overdue: number;
  activeRooms: number;
  waiting: number;
  topThemes: { name: string; waiting: number; oldest: number }[];
  topExperts: { name: string; load: number }[];
  recommendedExpert: { name: string; load: number; activeRooms: number; activeTickets: number; displayedLoad: number } | null;
  experts: { name: string; covers: string[]; activeRooms: number; activeTickets: number; displayedLoad: number; maxRooms?: number; maxTickets?: number }[];
  newOverdue: { id: string; title?: string; theme: string; domain: string }[];
}
export interface HomeSummaryResponse { summary: string; action: string }
export interface MaterialExtractRequest {
  filename: string;
  mimeType: string;
  data: string;
}
export interface MaterialExtractResponse {
  title: string;
  theme: ThemeKey;
  problem: string;
  steps: string[];
}

/** Milestone check-ins for one cohort. Notes carry no names; `people` holds only those who chose to share theirs. */
export interface CheckinInsightsRequest {
  cohort: number;
  responses: number;
  totals: Record<CorePulseKey, Record<PulseAnswer, number>>;
  stageTotals: Partial<Record<MilestoneKey, Record<PulseAnswer, number>>>;
  anonymousNotes: string[];
  people: { id: string; named: true; milestone: MilestoneKey; answers: Record<PulseKey, PulseAnswer>; followUps?: Partial<Record<PulseKey, string>>; note?: string; signals: string[] }[];
}
export interface CheckinInsightsResponse {
  themes: { name: string; count: number; summary: string; action: string }[];
  people: { id: string; why: string; action: string }[];
}
