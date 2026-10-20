import { embedText, generateJson } from './gemini.js';

type VectorEntry<T> = { item: T; text: string; vector: number[]; index: number };

const vectorCache = new Map<string, number[]>();
const configuredSimilarity = Number(process.env.RAG_MIN_SIMILARITY ?? 0.55);
const MIN_SIMILARITY = Number.isFinite(configuredSimilarity) ? configuredSimilarity : 0.55;

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return -1;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : -1;
}

async function cachedEmbedding(text: string): Promise<number[]> {
  const cached = vectorCache.get(text);
  if (cached) return cached;
  const vector = await embedText(text);
  vectorCache.set(text, vector);
  return vector;
}

/** In-memory vector database for the current server instance. */
export async function semanticSearch<T>(
  query: string,
  items: T[],
  textFor: (item: T) => string,
  limit: number,
  keywordFallback: () => T[],
): Promise<T[]> {
  try {
    // Embed the question and every card together: one after another a cold start took seconds.
    const texts = items.map(textFor);
    const [queryVector, ...vectors] = await Promise.all([query, ...texts].map(cachedEmbedding));
    const entries: VectorEntry<T>[] = items.map((item, index) => ({ item, text: texts[index], vector: vectors[index], index }));
    return entries
      .map((entry) => ({ ...entry, score: cosineSimilarity(queryVector, entry.vector) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .filter((entry) => entry.score >= MIN_SIMILARITY)
      .slice(0, limit)
      .map((entry) => entry.item);
  } catch {
    return keywordFallback();
  }
}

/** Use Gemini as a cross-encoder-style reranker over the retrieved candidates. */
export async function rerankCandidates<T extends { id: string }>(
  query: string,
  candidates: T[],
  textFor: (candidate: T) => string,
): Promise<T[]> {
  if (candidates.length < 2) return candidates;
  try {
    const ranked = await generateJson<{ ids: string[] }>({
      system: 'Rank support knowledge candidates for the employee question. Return candidate IDs from the supplied list, most relevant first. Use semantic meaning, synonyms and the exact problem context. Never invent IDs.',
      prompt: JSON.stringify({
        question: query,
        candidates: candidates.map((candidate) => ({ id: candidate.id, text: textFor(candidate) })),
      }),
      schema: {
        type: 'object',
        properties: { ids: { type: 'array', items: { type: 'string' } } },
        required: ['ids'],
      },
      temperature: 0,
    });
    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const ordered = ranked.ids.map((id) => byId.get(id)).filter((candidate): candidate is T => !!candidate);
    return [...ordered, ...candidates.filter((candidate) => !ranked.ids.includes(candidate.id))];
  } catch {
    return candidates;
  }
}
