// Answer-quality eval: runs every question in eval-set.json through the real /api/answer pipeline
// (embeddings → rerank → Gemini decision → server validation) and writes docs/eval-results.md.
// Run: npm run eval   (needs GEMINI_API_KEY in .env or the environment)
// Free-tier keys allow about 15 generation calls a minute, so it paces itself (EVAL_DELAY_MS, default 9000;
// set 0 on a paid key) and waits out any 429 before retrying.
// Optional: PRICE_IN_PER_M / PRICE_OUT_PER_M (USD per million tokens) and USD_TO_MYR add a cost line.
import { readFileSync, writeFileSync } from 'node:fs';
import { answer } from '../server/answer.js';
import { onUsage, type Usage } from '../server/gemini.js';
import { SEED_KB } from '../src/data/command.js';
import type { AnswerRequest } from '../src/api-types.js';

try { process.loadEnvFile('.env'); } catch { /* use the environment as it is */ }
if (!process.env.GEMINI_API_KEY) { console.error('GEMINI_API_KEY is not set (add it to .env).'); process.exit(1); }

interface Case { group: string; lang: string; q: string; expect: string[] }
interface Result { c: Case; got: string; lang?: string; ok: boolean; langOk: boolean; ms: number; tokens: number; error?: string }

const { cases } = JSON.parse(readFileSync(new URL('./eval-set.json', import.meta.url), 'utf8')) as { cases: Case[] };
const learned: AnswerRequest['learned'] = SEED_KB.filter((k) => k.status === 'live').map((k) => ({ id: k.id, theme: k.theme, title: k.title, steps: k.steps }));

let usage: Usage[] = [];
onUsage((u) => usage.push(u));

const DELAY_MS = Number(process.env.EVAL_DELAY_MS ?? 9000);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const quotaWait = (msg: string) => (/429|RESOURCE_EXHAUSTED/.test(msg) ? (Number(/retry in ([\d.]+)s/i.exec(msg)?.[1]) || 60) * 1000 + 1000 : 0);

async function run(c: Case, attempt = 0): Promise<Result> {
  usage = [];
  const started = performance.now();
  try {
    const res = await answer({ query: c.q, files: [], learned });
    const got = res.choice === 'library' || res.choice === 'learned' ? `${res.choice}:${res.cardId}` : res.choice;
    return { c, got, lang: res.lang, ok: c.expect.includes(got), langOk: res.lang === c.lang, ms: performance.now() - started, tokens: usage.reduce((s, u) => s + u.input + u.output, 0) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // A quota error says nothing about answer quality: wait it out and ask again.
    const wait = quotaWait(msg);
    if (wait && attempt < 3) { console.log(`  quota hit, waiting ${Math.round(wait / 1000)}s…`); await sleep(wait); return run(c, attempt + 1); }
    // The server refuses a card id the model invented, so it never reaches an employee. Counted, not hidden.
    return { c, got: 'error', ok: false, langOk: false, ms: performance.now() - started, tokens: usage.reduce((s, u) => s + u.input + u.output, 0), error: msg.slice(0, 120) };
  }
}

const results: Result[] = [];
const allUsage: Usage[] = [];
for (const [i, c] of cases.entries()) {
  if (i && DELAY_MS) await sleep(DELAY_MS);
  const r = await run(c);
  allUsage.push(...usage);
  results.push(r);
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${Math.round(r.ms).toString().padStart(5)}ms  [${c.group}] ${c.q}  →  ${r.got}${r.error ? ' (' + r.error + ')' : ''}`);
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) + '%' : 'n/a');
const by = (g: string) => results.filter((r) => r.c.group === g);
const row = (label: string, list: Result[]) => `| ${label} | ${list.length} | ${list.filter((r) => r.ok).length} | ${pct(list.filter((r) => r.ok).length, list.length)} |`;
const times = results.slice(1).map((r) => r.ms).sort((a, b) => a - b); // first call is the cold start
const q = (p: number) => (times.length ? Math.round(times[Math.min(times.length - 1, Math.floor(p * times.length))]) : 0);
const fabricated = results.filter((r) => r.error?.includes('does not exist')).length;
const multi = by('multilingual');
const tokensPerQ = Math.round(results.reduce((s, r) => s + r.tokens, 0) / results.length);
const inTok = allUsage.reduce((s, u) => s + u.input, 0) / results.length, outTok = allUsage.reduce((s, u) => s + u.output, 0) / results.length;
const priceIn = Number(process.env.PRICE_IN_PER_M), priceOut = Number(process.env.PRICE_OUT_PER_M), fx = Number(process.env.USD_TO_MYR);
const cost = priceIn && priceOut ? (inTok * priceIn + outTok * priceOut) / 1e6 : null;

const md = `# ReadyCheck answer eval

Run on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · ${results.length} questions · chat model \`${process.env.GEMINI_CHAT_MODEL || 'gemini-3.5-flash-lite'}\` · embeddings \`${process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001'}\`

Every question goes through the same pipeline as the app: embedding search, Gemini rerank, Gemini decision, then server validation. The library is the 12 built-in cards plus the 2 approved knowledge-base cards.

| Group | Questions | Correct | Rate |
|---|---|---|---|
${row('In scope (English)', by('in-scope'))}
${row('In scope (Malay, Chinese, Tamil)', multi)}
${row('Out of scope: says "I don’t know"', by('out-of-scope'))}
${row('Prompt injection: refuses', by('injection'))}
${row('Small talk', by('small-talk'))}
| **All** | **${results.length}** | **${results.filter((r) => r.ok).length}** | **${pct(results.filter((r) => r.ok).length, results.length)}** |

- **Invented cards shown to an employee: 0.** The server rejects any card id that wasn't retrieved${fabricated ? `; it blocked ${fabricated} such attempt${fabricated === 1 ? '' : 's'} in this run` : ''}.
- **Language detected correctly:** ${pct(multi.filter((r) => r.langOk).length, multi.length)} of non-English questions.
- **Latency** (excluding the first, cold call): median ${q(0.5)} ms, p95 ${q(0.95)} ms.
- **Tokens per question:** about ${tokensPerQ} (${Math.round(inTok)} in, ${Math.round(outTok)} out) across the rerank and decision calls; embeddings not counted.${cost !== null ? `\n- **Generation cost per question:** about US$${cost.toFixed(5)}${fx ? ` (RM ${(cost * fx).toFixed(4)})` : ''}, at the prices passed in.` : ''}

## Every question

| | Group | Question | Expected | Got | ms |
|---|---|---|---|---|---|
${results.map((r) => `| ${r.ok ? '✅' : '❌'} | ${r.c.group} | ${r.c.q.replace(/\|/g, '\\|')} | ${r.c.expect.join(', ')} | ${r.got}${r.error ? ` (${r.error})` : ''}${r.lang && r.c.group === 'multilingual' ? ` · ${r.lang}` : ''} | ${Math.round(r.ms)} |`).join('\n')}
`;

writeFileSync(new URL('../docs/eval-results.md', import.meta.url), md);
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} correct. Wrote docs/eval-results.md`);
