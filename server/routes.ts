// One place that maps /api/<name> to its handler, shared by the Vercel functions and the Vite dev server.
import { HttpError } from './gemini.js';
import { answer } from './answer.js';
import { roomReply, summarizeRoom } from './room.js';
import { themeSummary } from './themeSummary.js';
import { homeSummary } from './homeSummary.js';
import { materialExtract } from './materialExtract.js';

// Bodies are untrusted JSON; each handler validates its own.
type Handler = (body: any) => Promise<unknown>;

export const ROUTES: Record<string, Handler> = {
  answer,
  'room-reply': roomReply,
  'summarize-room': summarizeRoom,
  'theme-summary': themeSummary,
  'home-summary': homeSummary,
  'material-extract': materialExtract,
};

/** Run a route and turn any failure into { status, body } without leaking internals. */
export async function runRoute(name: string, method: string | undefined, body: unknown): Promise<{ status: number; body: unknown }> {
  const handler = ROUTES[name];
  if (!handler) return { status: 404, body: { error: 'Not found' } };
  if (method !== 'POST') return { status: 405, body: { error: 'Use POST' } };
  try {
    return { status: 200, body: await handler(body ?? {}) };
  } catch (e) {
    if (e instanceof HttpError) return { status: e.status, body: { error: e.message } };
    console.error(`[api/${name}]`, e);
    const timeout = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    return { status: timeout ? 504 : 502, body: { error: timeout ? 'Gemini timed out' : 'Gemini request failed' } };
  }
}
