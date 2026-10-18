// The company content Gemini may answer from. For the hackathon this is the sample library in src/data.
// Swap SCENARIOS for real documents (or a search index) when you have them.
import { SCENARIOS } from '../src/data/scenarios.js';
import { PICS, THEMES } from '../src/data/command.js';
import type { CardSpec, ThemeKey } from '../src/types.js';

export const THEME_KEYS = THEMES.map((t) => t.key) as ThemeKey[];

/** Which team handles each theme, from the experts' coverage. */
export const QUEUE_BY_THEME = Object.fromEntries(
  THEMES.map((t) => [t.key, PICS.find((p) => p.covers.includes(t.key))?.team ?? 'People Team']),
) as Record<ThemeKey, string>;

export const LIBRARY: CardSpec[] = SCENARIOS.flatMap((s) => s.cards);

/** A compact, model-readable view of every library card. */
export function libraryForPrompt(): string {
  return JSON.stringify(LIBRARY.map((c) => {
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
