// Browser side of /api/*. Every helper returns null on any failure so callers can fall back to local behaviour.
import type {
  AnswerRequest, AnswerResponse, RoomReplyRequest, RoomReplyResponse,
  SummarizeRequest, SummarizeResponse, ThemeSummaryRequest, ThemeSummaryResponse,
} from '../api-types';
import { markAiConnected, markAiOffline } from './ai-status';

async function post<T>(route: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch('/api/' + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
      markAiOffline();
      console.warn(`[ReadyCheck] /api/${route} failed (${res.status}):`, await res.text().catch(() => ''));
      return null;
    }
    markAiConnected();
    return (await res.json()) as T;
  } catch (e) {
    markAiOffline();
    console.warn(`[ReadyCheck] /api/${route} unreachable:`, e);
    return null;
  }
}

export const askAnswer = (b: AnswerRequest) => post<AnswerResponse>('answer', b);
export const askRoomReply = (b: RoomReplyRequest) => post<RoomReplyResponse>('room-reply', b);
export const askSummary = (b: SummarizeRequest) => post<SummarizeResponse>('summarize-room', b);
export const askThemeSummary = (b: ThemeSummaryRequest) => post<ThemeSummaryResponse>('theme-summary', b);
