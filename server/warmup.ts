// Fills this instance's vector cache with the built-in library so the first real question isn't the slow one.
// Embeddings only: no generation call, so loading the page never spends the per-minute generation quota.
// The first embedding is not caught: if Gemini is unreachable the route fails and the presenter's dot shows offline.
import { embedText } from './gemini.js';
import { LIBRARY, retrieveLibrary } from './library.js';

export async function warmup(): Promise<{ ok: true; cards: number }> {
  await embedText('warm up');
  await retrieveLibrary('warm up', LIBRARY);
  return { ok: true, cards: LIBRARY.length };
}
