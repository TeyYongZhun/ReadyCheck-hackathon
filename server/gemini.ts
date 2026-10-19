// Server-only Gemini client. Never import this from src/: the API key must stay on the server.
import { GoogleGenAI } from '@google/genai';

const TIMEOUT_MS = 15000;

let client: GoogleGenAI | null = null;
function gemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new HttpError(503, 'GEMINI_API_KEY is not set');
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type GenerationModel = 'chat' | 'summary';

function generationModel(role: GenerationModel): string {
  if (role === 'summary') return process.env.GEMINI_SUMMARY_MODEL || 'gemini-3.6-flash';
  return process.env.GEMINI_CHAT_MODEL || 'gemini-3.5-flash-lite';
}

/** One Gemini call with a JSON Schema-constrained response, parsed. */
export async function generateJson<T>(opts: { system: string; prompt: string; schema: object; temperature?: number; contents?: unknown; model?: GenerationModel }): Promise<T> {
  const res = await gemini().models.generateContent({
    model: generationModel(opts.model ?? 'chat'),
    contents: opts.contents ?? opts.prompt,
    config: {
      systemInstruction: opts.system,
      responseMimeType: 'application/json',
      responseJsonSchema: opts.schema,
      temperature: opts.temperature ?? 0.3,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    },
  });
  const text = res.text;
  if (!text) throw new HttpError(502, 'Gemini returned an empty response');
  try { return JSON.parse(text) as T; } catch { throw new HttpError(502, 'Gemini returned invalid JSON'); }
}

/** Generate a semantic vector for retrieval. */
export async function embedText(text: string): Promise<number[]> {
  const res = await gemini().models.embedContent({
    model: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
    contents: text,
  });
  const values = res.embeddings?.[0]?.values;
  if (!values?.length || values.some((value) => !Number.isFinite(value))) {
    throw new HttpError(502, 'Gemini returned an invalid embedding');
  }
  return values;
}

/** Reject anything that isn't a non-empty string under `max` chars. */
export function str(v: unknown, name: string, max = 2000): string {
  if (typeof v !== 'string' || !v.trim()) throw new HttpError(400, `${name} is required`);
  return v.trim().slice(0, max);
}
