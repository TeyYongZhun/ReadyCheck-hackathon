// Turns a question into the one card the canvas shows: Gemini first, keyword fallback if the API fails.
import type { CanvasAnswer, CardSpec, Expert, KbItem, ThemeKey } from '../types';
import { SCENARIOS, SCEN_THEME, pickScenario } from '../data/scenarios';
import { PICS } from '../data/command';
import { askAnswer } from './api';

const LIBRARY = SCENARIOS.flatMap((s) => s.cards);

function expertFor(theme: ThemeKey): Expert {
  const p = PICS.find((x) => x.covers.includes(theme)) ?? PICS[PICS.length - 1];
  return { name: p.name, initials: p.initials, eta: 'a few min' };
}

function learnedCard(k: KbItem): CardSpec {
  return {
    id: 'learned-' + k.id, type: 'steps',
    props: { title: k.title, kindLabel: 'From an expert', source: `AI summary of ${k.roomName} · solved by ${k.pic.first}, approved by Rachel`, steps: k.steps.map((label) => ({ label })) },
  };
}

export async function resolveAnswer(query: string, files: string[], knowledge: KbItem[]): Promise<CanvasAnswer> {
  const live = knowledge.filter((k) => k.status === 'live');
  const res = await askAnswer({ query, files, learned: live.map((k) => ({ id: k.id, theme: k.theme, title: k.title, steps: k.steps })) });
  if (res) {
    const base = { heading: res.heading, theme: res.theme, queue: res.queue, expert: expertFor(res.theme), source: 'ai' as const };
    if (res.choice === 'library') {
      const card = LIBRARY.find((c) => c.id === res.cardId);
      if (card) return { ...base, card };
    } else if (res.choice === 'learned') {
      const k = live.find((x) => x.id === res.cardId);
      if (k) return { ...base, card: learnedCard(k) };
    } else if (res.card) {
      return { ...base, card: { id: 'ai-' + Date.now().toString(36), type: 'steps', props: { title: res.card.title, kindLabel: 'AI answer', source: 'Written by Gemini from company guidance. Check before acting.', steps: res.card.steps } } };
    }
  }
  // Offline: keyword match, approved knowledge first.
  const s = pickScenario(query), theme = SCEN_THEME[s.key as keyof typeof SCEN_THEME];
  const k = live.find((x) => x.theme === theme);
  return { heading: s.heading, theme, queue: s.queue, expert: s.expert, card: k ? learnedCard(k) : s.cards[0], source: 'offline' };
}
