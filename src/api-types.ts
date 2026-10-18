// Request/response shapes for /api/*. Shared by the browser (src/lib/api.ts) and the server (server/).
import type { ThemeKey } from './types';

export interface ChatLine { from: 'pic' | 'employee'; text: string }
export interface PicPersona { name: string; first: string; team: string; skills: string }
export interface TicketContext { q: string; from: string }

export interface AnswerRequest {
  query: string;
  files: string[];
  /** Approved knowledge-base cards, so the model can prefer them. */
  learned: { id: string; theme: ThemeKey; title: string; steps: string[] }[];
}
export interface AnswerResponse {
  heading: string;
  theme: ThemeKey;
  queue: string;
  choice: 'library' | 'learned' | 'generated';
  /** Library card id or learned KB id, when choice isn't "generated". */
  cardId?: string;
  card?: { title: string; steps: { label: string; detail?: string }[] };
}

export interface RoomReplyRequest { pic: PicPersona; employee: string; ticket: TicketContext | null; messages: ChatLine[] }
export interface RoomReplyResponse { reply: string; solved: boolean }

export interface SummarizeRequest { roomName: string; pic: PicPersona; employee: string; ticket: TicketContext | null; messages: ChatLine[] }
export interface SummarizeResponse { title: string; problem: string; steps: string[] }

export interface ThemeSummaryRequest { theme: string; questions: string[] }
export interface ThemeSummaryResponse { summary: string }
