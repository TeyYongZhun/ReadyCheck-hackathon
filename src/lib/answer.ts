// Turns a question into the one card the canvas shows: Gemini first, keyword fallback if the API fails.
import type { CanvasAnswer, CardSpec, ChatReply, Expert, KbItem, LibraryEntry, ThemeKey } from '../types';
import { DEFAULT_SUGGEST, DEMO_ANSWER_BUDGET_MS, SCENARIOS, SCEN_THEME } from '../data/scenarios';
import { PICS } from '../data/command';
import { askAnswer } from './api';

function expertFor(theme: ThemeKey): Expert {
  const p = PICS.find((x) => x.covers.includes(theme)) ?? PICS[PICS.length - 1];
  return { name: p.name, initials: p.initials, eta: 'a few min' };
}

function themeForQuery(query: string, fallback: ThemeKey): ThemeKey {
  const q = query.toLocaleLowerCase();
  if (/\b(database|staging|postgres|postgresql|sql|warehouse|db-?\d*|read role)\b/.test(q)) return 'db';
  if (/\b(vpn|remote access|wi-?fi|network|globalconnect|split tunnel)\b/.test(q)) return 'vpn';
  if (/\b(mfa|2fa|authenticator|authentication|new phone|sign.?in)\b/.test(q)) return 'mfa';
  if (/\b(expense|receipt|reimburse|concur|claim)\b/.test(q)) return 'exp';
  if (/\b(payroll|bank account|salary)\b/.test(q)) return 'pay';
  return fallback;
}

function queueFor(theme: ThemeKey): string {
  return PICS.find((pic) => pic.covers.includes(theme))?.team ?? 'People Team';
}

function learnedCard(k: KbItem): CardSpec {
  const materials = k.allowEmployeeAccess
    ? (k.files ?? []).filter((file): file is typeof file & { url: string; mimeType: string } => !!file.url && !!file.mimeType)
      .filter((file) => file.mimeType === 'application/pdf' || file.mimeType.startsWith('video/'))
      .map(({ name, url, mimeType }) => ({ name, url, mimeType }))
    : undefined;
  return {
    id: 'learned-' + k.id, type: 'steps',
    props: { title: k.title, kindLabel: 'From an expert', source: `${k.sample ? 'Sample summary' : 'AI summary'} of ${k.roomName} · solved by ${k.pic.first}, approved by Rachel`, steps: k.steps.map((label) => ({ label })), materials },
  };
}

/** Offline stand-in for search: the live card sharing the most longer words with the question, and at least two. */
function bestApproved(query: string, live: KbItem[]): KbItem | undefined {
  const words = (text: string) => new Set(text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
  const q = words(query);
  const scored = live.map((k) => {
    const c = words([k.title, k.problem, ...k.steps].join(' '));
    return { k, hits: [...q].filter((w) => c.has(w)).length };
  }).filter((x) => x.hits >= 2).sort((a, b) => b.hits - a.hits);
  return scored[0]?.k;
}

/** Offline guess at "not a work issue": short greetings, thanks and test messages. */
const SMALL_TALK = /^\s*(hi+|hello|hey|yo|hai|helo|good (morning|afternoon|evening)|thanks?|thank you|ty|ok(ay)?|test(ing)?)\b[\s\w!,.?']{0,30}$/i;

export function isChat(a: CanvasAnswer | ChatReply): a is ChatReply {
  return 'message' in a;
}

export async function resolveAnswer(query: string, files: string[], knowledge: KbItem[], library: LibraryEntry[]): Promise<CanvasAnswer | ChatReply> {
  const live = knowledge.filter((k) => k.status === 'live');
  const libraryCards = library.filter((e) => e.status === 'live').map((e) => e.card);
  const isDemo = DEFAULT_SUGGEST.some((s) => s.demo && s.query === query);
  const res = await askAnswer({ query, files, library: libraryCards, learned: live.map((k) => ({
    id: k.id, theme: k.theme, title: k.title, steps: k.steps,
    materials: k.allowEmployeeAccess ? (k.files ?? []).filter((file): file is typeof file & { url: string; mimeType: string } => !!file.url && !!file.mimeType)
      .filter((file) => file.mimeType === 'application/pdf' || file.mimeType.startsWith('video/'))
      .map(({ name, url, mimeType }) => ({ name, url, mimeType })) : undefined,
  })) }, isDemo ? DEMO_ANSWER_BUDGET_MS : undefined);
  if (res?.choice === 'chat' && res.message) return { heading: res.heading, message: res.message, source: 'ai' };
  if (res?.choice === 'unknown') {
    const message = res.message || 'Sorry, I couldn’t find any relevant knowledge. Please ask a human expert.';
    const theme = themeForQuery(query, res.theme);
    return {
      heading: res.heading,
      theme,
      queue: queueFor(theme),
      expert: expertFor(theme),
      source: 'ai',
      card: {
        id: 'unknown-' + Date.now().toString(36),
        type: 'steps',
        props: {
          title: message,
          kindLabel: 'No relevant knowledge found',
          source: 'No approved company knowledge matched this question.',
          steps: [],
        },
      },
    };
  }
  if (!res && !files.length && SMALL_TALK.test(query)) {
    return { heading: 'Hello there', message: 'Hi! Tell me what you need help with, like an access problem, a policy question or something for your first week.', source: 'offline' };
  }
  if (res) {
    const base = { heading: res.heading, theme: res.theme, queue: res.queue, expert: expertFor(res.theme), source: 'ai' as const };
    if (res.choice === 'library') {
      const card = libraryCards.find((c) => c.id === res.cardId);
      if (card) return { ...base, card };
    } else if (res.choice === 'learned') {
      const k = live.find((x) => x.id === res.cardId);
      if (k) return { ...base, card: learnedCard(k) };
    }
  }
  // Offline: a manager-approved card that covers the question wins, then a built-in company scenario.
  // Anything else is "I don't know", so it goes to a human expert.
  const approved = bestApproved(query, live);
  if (approved) {
    return { heading: 'Here’s what should help', theme: approved.theme, queue: queueFor(approved.theme), expert: expertFor(approved.theme), card: learnedCard(approved), source: 'offline' };
  }
  const s = SCENARIOS.find((scenario) => scenario.match.test(query));
  const sTheme = s ? SCEN_THEME[s.key as keyof typeof SCEN_THEME] : null;
  // The scenario's first library card the manager still has live; none left means nothing to offer.
  const sCard = s ? library.find((e) => e.status === 'live' && e.scenario === s.key)?.card : undefined;
  // A keyword for another topic wins, so "password" alone can't pull the MFA card for a database question.
  if (!s || !sTheme || !sCard || themeForQuery(query, sTheme) !== sTheme) return {
    heading: 'No approved answer found',
    theme: themeForQuery(query, 'onb'),
    queue: queueFor(themeForQuery(query, 'onb')),
    expert: expertFor(themeForQuery(query, 'onb')),
    card: {
      id: 'unknown-' + Date.now().toString(36),
      type: 'steps',
      props: {
        title: 'I can’t find an answer based on the current approved company knowledge available to me. Please ask a human expert for help. Thanks!',
        kindLabel: 'Needs human expert assistance',
        source: 'No approved company knowledge matched this question.',
        steps: [],
      },
    },
    source: 'offline',
  };
  const k = live.find((x) => x.theme === sTheme);
  return { heading: s.heading, theme: sTheme, queue: s.queue, expert: s.expert, card: k ? learnedCard(k) : sCard, source: 'offline' };
}
