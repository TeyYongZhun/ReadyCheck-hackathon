// The company content Gemini may answer from. For the hackathon this is the sample library in src/data.
// Swap SCENARIOS for real documents (or a search index) when you have them.
import { SCENARIOS } from '../src/data/scenarios.js';
import { PICS, THEMES } from '../src/data/command.js';
import type { CardSpec, ThemeKey } from '../src/types.js';
import { semanticSearch } from './retrieval.js';

export const THEME_KEYS = THEMES.map((t) => t.key) as ThemeKey[];

/** Which team handles each theme, from the experts' coverage. */
export const QUEUE_BY_THEME = Object.fromEntries(
  THEMES.map((t) => [t.key, PICS.find((p) => p.covers.includes(t.key))?.team ?? 'People Team']),
) as Record<ThemeKey, string>;

export const LIBRARY: CardSpec[] = SCENARIOS.flatMap((s) => s.cards);

export function cardText(c: CardSpec): string {
  const p = c.props;
  const content = c.type === 'video' ? (c.props.chapters ?? []).map((x) => x.label)
    : c.type === 'doc' ? c.props.points.map((x) => x.text)
    : c.props.steps.map((x) => x.label + (x.detail ? ` (${x.detail})` : ''));
  return [p.title, p.source, ...content].join(' ');
}

function tokens(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/** Retrieve the most relevant library cards before Gemini sees the context. */
function keywordRetrieveLibrary(query: string, cards: CardSpec[], limit: number): CardSpec[] {
  const queryTokens = new Set(tokens(query));
  return cards
    .map((card, index) => {
      const matches = tokens(cardText(card)).filter((token) => queryTokens.has(token)).length;
      return { card, score: matches, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .filter((entry) => entry.score > 0)
    .slice(0, limit)
    .map(({ card }) => card);
}

export function retrieveLibrary(query: string, cards: CardSpec[], limit = 6): Promise<CardSpec[]> {
  return semanticSearch(query, cards, cardText, limit, () => keywordRetrieveLibrary(query, cards, limit));
}

function isCard(c: any): c is CardSpec {
  const list = c?.type === 'doc' ? c.props?.points : c?.type === 'steps' ? c.props?.steps : c?.props?.chapters ?? [];
  return typeof c?.id === 'string' && ['video', 'doc', 'steps'].includes(c.type) && typeof c.props?.title === 'string' && Array.isArray(list);
}

/** The library a question is answered from: the cards the manager has live (edits included), else the built-in sample. */
export function libraryFromRequest(raw: unknown): CardSpec[] {
  return Array.isArray(raw) ? raw.filter(isCard).slice(0, 60) : LIBRARY;
}

/** A compact, model-readable view of retrieved library cards. */
export function libraryForPrompt(cards: CardSpec[] = LIBRARY): string {
  return JSON.stringify(cards.map((c) => {
    const p = c.props;
    const content = c.type === 'video' ? (c.props.chapters ?? []).map((x) => x.label)
      : c.type === 'doc' ? c.props.points.map((x) => x.text)
      : c.props.steps.map((x) => x.label + (x.detail ? ` (${x.detail})` : ''));
    return { id: c.id, type: c.type, title: p.title, source: p.source, content };
  }));
}

export function themesForPrompt(): string {
  return THEMES.map((t) => `${t.key}: ${t.name}`).join('\n');
}
