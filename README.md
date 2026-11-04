# ReadyCheck

![ReadyCheck: catch weak onboarding before it becomes a resignation](docs/cover.png)

**An AI onboarding companion that helps new employees get unstuck, and shows HR where onboarding is failing.**

Built for AI Future Makers · Challenge 4 (Retain): Early Employee Disengagement.

**Live demo:**[[ready-check-hackathon.vercel.app](https://ready-check-hackathon.vercel.app/)]

---

## The problem

New employees get stuck on small things in their first weeks: the VPN doesn't work, they don't know who their buddy is, they're unsure how to claim an expense.

- They don't know who to ask, so many questions never get asked.
- Each question is small, so HR never sees the pattern.
- A new hire who stays stuck feels unsupported and starts to disengage.
- HR often only finds out in the exit interview, when it's too late.

### This is a real, common problem

| Finding | Source |
|---|---|
| Only **12%** of employees strongly agree their organisation does a great job of onboarding new employees. | [Gallup](https://www.gallup.com/workplace/247172/problems-onboarding-program.aspx) |
| Up to **20%** of employee turnover happens in the **first 45 days**. | O.C. Tanner research, reported by [SHRM](https://www.shrm.org/in/topics-tools/news/hr-magazine/original-onboarding-options-4-hr-leaders) |
| **31%** of people surveyed had quit a job within the **first six months**. Clearer responsibilities (23%) and better training (21%) were among the changes that would have kept them. | BambooHR survey, reported by [HR Dive](https://hrdive.com/news/many-employees-quit-early-due-to-poor-onboarding-survey-says/405359) |
| When managers take an active role in onboarding, employees are **3.4×** as likely to say their onboarding was exceptional. | [Gallup](https://www.gallup.com/workplace/247172/problems-onboarding-program.aspx) |

These studies are a few years old and mostly from the US, but they point the same way as the challenge brief: new hires leave early because of unclear expectations, weak onboarding and too little support, and those problems are visible long before they resign.

## Our solution

ReadyCheck is one website with two views.

ReadyCheck reads three signals, all of them voluntary:

| Signal | Where it comes from |
|---|---|
| **Stuck** | The questions a new hire chooses to ask, and whether a card or a person solved them |
| **Onboarding pulse** | Five milestone check-ins with three stable questions and one stage-specific question; Yes, Partly, Not yet or Not applicable, plus optional follow-up prompts and an open note |
| **Acted on** | The follow-up a manager chose, and whether stable core answers improved at the next milestone |

**For new employees**
- Ask a question in plain words, in **English, Bahasa Melayu, 中文 or தமிழ்**.
- AI gives **one answer card**: a short video, a policy summary, or a step-by-step checklist. Asked in another language, the approved card is translated and labelled, with "Show original".
- "You're not the only one: 9 new hires asked about this this week", so asking feels normal.
- If it doesn't help, tap **Need human expert**. The question becomes a ticket.
- Chat with the assigned expert in a **ticket room**. If it's still not fixed, book a **1:1 session**.
- **Onboarding check-ins:** Five milestones: Week 1 (Getting Started), Week 2 (Early Adjustment), Day 30 (Building Competence), Day 60 (Growing Independence), and Day 90 (Successful Integration). In the demo, use the **Demo** button to switch the displayed milestone. Each has the same three core questions plus one stage-specific question. Answers are Yes, Partly, Not yet or Not applicable. Partly/Not yet reveals a relevant optional follow-up; an optional open note accepts any language. Employees choose to share their name with Rachel for direct help or share anonymously for cohort insights; anonymous insights appear only after at least 3 people check in. A submitted check-in can be edited for 5 minutes.

**For managers and HR**
- **Check-ins:** a "Reach out this week" list built only from feedback employees explicitly shared with their name. Each row shows their own answers, note and open tickets, with an AI reason and suggested human step. Anonymous responses never enter this list or individual follow-up.
- **Cohort pulse and themes:** anonymous answers and comments contribute only to grouped insights, shown after at least 3 employees check in. Anonymous comments are never shown verbatim or in individual rows; AI is instructed to omit identifying details. Each milestone-specific question is shown separately only when at least 3 people checked in at that milestone.
- **Did it help?** For named follow-ups, managers can see whether each previously reported difficulty improved, persisted or worsened at the next milestone. Only the same three core questions are compared; stage-specific questions are not treated as equivalent.
- **Needs you:** questions are grouped into topics (for example "VPN" or "Payroll"), with an AI summary of why people are stuck.
- **One click** assigns an expert to everyone stuck on that topic.
- **Knowledge base:** when a problem is solved, AI writes a new answer card. A manager approves it, so the next new hire gets the answer instantly. Each live card shows how many new hires it has answered since.
- **Home:** expert time saved, time to an answer, and a **business case** in RM with every assumption on screen and editable.
- **Trends:** see which topics come up most, by day, week or month.

## Version 1 vs Version 2

Version 1 focused on helping new employees get answers and connecting unresolved questions to a human expert. Version 2 keeps that core workflow and adds an onboarding support and follow-up loop.

| Area | Version 1 | Added or improved in Version 2 |
|---|---|---|
| **Employee questions** | Ask a question, get one recommended knowledge card, and request a human expert if it does not help. | Adds multilingual questions and translations of approved answer cards, with an option to show the original. |
| **Onboarding check-ins** | Not included. | Adds five milestones, with three stable core questions and a stage-specific question at each milestone. Partly/Not yet opens a relevant optional follow-up; employees can also add an optional note in any language. Named or anonymous sharing and the 5-minute edit window are retained. |
| **Cohort insights** | Not included. | AI summarizes check-in responses and notes into themes. Anonymous cohort insights appear only when at least 3 people have checked in. |
| **Manager follow-up** | Managers review grouped question topics and assign experts to unresolved questions. | Individual follow-up uses only feedback explicitly shared by name; anonymous feedback is excluded from person-level workflows. |
| **Follow-up impact** | Not included. | Tracks stable core answers across milestones and shows whether previously reported difficulties improved, persisted or worsened. Different stage-specific questions are not compared. |
| **Business case** | Basic Home and Trends views for onboarding questions. | Adds estimated expert time saved, time to an answer, and an editable business case in RM. |
| **Trends** | Shows which question topics come up most by day, week, or month. | Extends analytics with onboarding check-in themes and follow-up results. |

## Workflow

![How ReadyCheck works: 8 steps from a new hire asking a question to an approved knowledge card](docs/workflow.svg)

1. **New hire** asks a question.
2. **AI** gives one answer card based on company's knowledge base. If it helps, done.
3. If not, the **new hire** taps *Need human expert* and a ticket is created.
4. **AI** groups tickets by topic and summarises why people are stuck.
5. **Manager / HR** assigns an expert in one click.
6. The **new hire and expert** solve it in a ticket room. If it's still not fixed, they book a 1:1.
7. **AI** drafts a knowledge card from the solved conversation.
8. **Manager / HR** approves it, so the next new hire with the same question gets the answer straight away.

Alongside it runs the milestone check-in loop:

1. **New hire** sends a check-in, named or anonymous.
2. **AI** groups the answers and notes into themes, and for each named person writes a reason from their own evidence and suggests one human step.
3. **Manager / HR** chooses the step (a 15-minute priorities chat, a buddy, an expert follow-up) and marks it done.
4. **The next milestone check-in** shows whether the stable core answers changed.

This matches the challenge's required flow: **employee feedback → AI finds themes → HR/manager reviews → support action**, with the action tracked.

## How we use AI

We use **three Google Gemini models**, each picked for its job:

| Model | Used for | Why this model |
|---|---|---|
| **Gemini 3.5 Flash-Lite** (`GEMINI_CHAT_MODEL`) | Choosing the answer card, reranking search results, detecting the question's language, translating the approved card, small-talk replies, the AI expert in rooms, topic and Home summaries | Fast and low-cost for short, frequent answers |
| **Gemini 3.6 Flash** (`GEMINI_SUMMARY_MODEL`) | Turning a solved chat into a knowledge card, turning an uploaded PDF into a knowledge card, reading milestone check-ins into themes and follow-ups | Stronger at reading longer content and writing accurate steps |
| **Gemini Embedding 001** (`GEMINI_EMBEDDING_MODEL`) | Semantic search: finds the knowledge-base cards that mean the same as the question, even with different words | Turns text into vectors for similarity search |

| What AI does | What a person still decides |
|---|---|
| Finds the matching card in the knowledge base. If nothing matches, it says so and suggests a human expert instead of guessing | The employee says if it helped, or asks an expert |
| Groups tickets into topics and summarises each topic | The manager decides who to assign |
| Reads check-ins into themes, and suggests one follow-up per named person from their own evidence | The manager chooses the step, does it, and marks it done |
| Translates an approved card into the employee's language | The approved English card stays one tap away ("Show original") |
| Turns a solved chat, or an uploaded PDF, into a draft knowledge card | The manager approves, edits or discards it |
| Plays the expert in the demo chat (labelled "AI expert (demo)") | In real use, real experts reply |

**How an answer is found**
1. **Search:** Embedding 001 compares the question with every knowledge-base card and keeps the closest ones.
2. **Rerank:** Flash-Lite puts those candidates in order of how well they answer the question.
3. **Answer:** Flash-Lite picks one card (manager-approved cards first), or replies "I don't know" and points to a human expert.
4. **Fallback:** if Gemini is unavailable, simple keyword matching takes over, so the app keeps working.

**Responsible by design**
- Uses only questions employees **choose** to ask and check-ins they **choose** to send. No monitoring, no emotion detection, no "flight risk" score.
- The employee chooses whether to share a check-in with their name or anonymously. Only named feedback enters individual follow-up; anonymous answers and comments contribute to grouped insights only after at least 3 employees check in. Anonymous comments are not shown verbatim, and AI themes must omit identifying details. Check-ins can be edited for 5 minutes after submission.
- The AI never predicts resignation or judges performance. It cites the person's own answers and suggests a human step; a manager decides.
- Every AI output is **labelled** in the app.
- Nothing AI writes reaches employees until a **manager approves** it. Translations are of approved cards only.
- Cards shown to future hires name the expert, never the employee or their room.
- The API key stays on the server, never in the browser.

## Tech stack

| Part | Technology |
|---|---|
| Front end | React 18, TypeScript, Vite |
| Styling | CSS with design tokens (dark and light themes) |
| AI | Google Gemini API (`@google/genai`): Gemini 3.5 Flash-Lite, Gemini 3.6 Flash, Gemini Embedding 001 |
| Search | Embedding-based semantic search (cosine similarity) + Gemini reranking |
| Back end | Vercel serverless functions |
| Hosting | Vercel |
| Design | Claude Design |

## Architecture

![ReadyCheck architecture: users → React web app → Vercel serverless API → Google Gemini](docs/architecture.svg)

- **Browser:** the React web app has both the employee and manager views.
- **Vercel:** serves the website and runs one serverless API. The Gemini API key is stored only here.
- **Google Gemini (3 models):** Embedding 001 for search vectors, 3.5 Flash-Lite for answers and chat, 3.6 Flash for knowledge-card summaries. All return structured JSON.
- **Retrieval:** the server keeps an in-memory vector index, ranks candidates with cosine similarity, then uses Gemini as a semantic reranker. It falls back to keyword matching if embeddings are unavailable.

| API endpoint | What it does | Model |
|---|---|---|
| `/api/answer` | Finds the best knowledge-base card for a question, or says "I don't know" | Embedding 001 + 3.5 Flash-Lite |
| `/api/theme-summary` | Summarises why people are stuck on a topic | 3.5 Flash-Lite |
| `/api/home-summary` | Briefs the manager on the Home dashboard and suggests who to assign | 3.5 Flash-Lite |
| `/api/room-reply` | Writes the expert's reply in the demo chat | 3.5 Flash-Lite |
| `/api/summarize-room` | Turns a solved chat into a knowledge card | 3.6 Flash |
| `/api/material-extract` | Turns an uploaded PDF into a knowledge card draft | 3.6 Flash |
| `/api/checkin-insights` | Cohort themes from check-ins, and a reason plus one follow-up per named person | 3.6 Flash |
| `/api/translate-card` | Translates the chosen approved card into Malay, Chinese or Tamil, string for string | 3.5 Flash-Lite |
| `/api/warmup` | Embeds the library on page load so the first question is fast | Embedding 001 |

The vector index is rebuilt on a cold start. For a multi-instance production deployment, replace the in-memory index with a persistent vector database.

## Run it locally

**You need:** Node.js 18+ and a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

**1. Install**
```bash
git clone <repository-url>
cd ReadyCheck-hackathon
npm install
```

**2. Add your API key**

Create a file named `.env` in the project folder:
```
GEMINI_API_KEY=your-key-here
GEMINI_CHAT_MODEL=gemini-3.5-flash-lite
GEMINI_SUMMARY_MODEL=gemini-3.6-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
# Optional: minimum cosine similarity for a RAG candidate (default: 0.55)
RAG_MIN_SIMILARITY=0.55
```

**3. Start**
```bash
npm run dev
```

**4. Open**
- Employee view: http://localhost:5173
- Manager view: http://localhost:5173/#manager

## Deploy to Vercel

1. Push the project to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. In **Settings → Environment Variables**, add `GEMINI_API_KEY`. Optionally add `GEMINI_CHAT_MODEL`, `GEMINI_SUMMARY_MODEL` and `GEMINI_EMBEDDING_MODEL` to change the models.
4. Click **Deploy**.

## Run with Docker

Build and start the production container:

```bash
docker build -t readycheck .
docker run --rm -p 3000:3000 \
  -e GEMINI_API_KEY=your-key-here \
  -e GEMINI_CHAT_MODEL=gemini-3.5-flash-lite \
  -e GEMINI_SUMMARY_MODEL=gemini-3.6-flash \
  -e GEMINI_EMBEDDING_MODEL=gemini-embedding-001 \
  readycheck
```
OR
1. Input your GEMINI-API-KEY in .env, following the format of .env.example.
2. Then start the container:
```bash
docker build -t readycheck .
docker run --rm --name readycheck -p 3000:3000 `
  --env-file .env `
  readycheck

```

Open http://localhost:3000. The container serves the Vite build and the `/api/*` endpoints from the same process. If `GEMINI_API_KEY` is omitted, the app still works with its local fallback behaviour, but AI-powered responses are unavailable.

## Try it (2-minute demo)

Open the site with `?presenter` to see a small "Gemini live" status pill at the top (only you see it).

1. On the employee view, ask *"Boleh saya bawa cuti tahunan ke tahun depan?"*. The approved leave card comes back in Bahasa Melayu, labelled as translated.
2. Click **Database access** and press Enter. There is no approved answer, so ReadyCheck says so. Click **Need human expert**; the ticket flies to **My tickets**.
3. In the side menu, click **Start check-in**. Answer *Not yet* to the first statement, add a note, choose **Share with my name**, and submit.
4. Switch to **Manager → Check-ins**. Mira is at the top with her answers and her open ticket. Click **Plan: 15-min priorities chat**. Back on the employee side, Mira sees it.
5. **Needs you → Assign Marcus**, open the room and click **▶ Play sample conversation**. Answer **Yes** to "Did Marcus solve your problem?"; a knowledge card is drafted.
6. In **Knowledge base**, approve the new card. On **Home**, see expert time saved and the business case.

## Testing

`npm run eval` sends 53 questions through the real answer pipeline and writes [docs/eval-results.md](docs/eval-results.md): English and Malay/Chinese/Tamil questions the library covers, out-of-scope questions that must get "I don't know", prompt injections, and small talk. It reports accuracy per group, invented cards (the server rejects any card id that wasn't retrieved), language detection, latency and tokens per question. On a free-tier key it paces itself to stay under the per-minute limit.

## Repository structure

```
ReadyCheck-hackathon/
├── api/
│   └── [route].ts             # Vercel serverless entry for all /api calls
├── server/                    # Back end: Gemini prompts (API key stays here)
│   ├── gemini.ts              # The 3 Gemini models: chat, summary, embedding
│   ├── retrieval.ts           # Semantic search (embeddings) + Gemini reranking
│   ├── answer.ts              # Finds the knowledge-base card, or says "I don't know"
│   ├── room.ts                # AI expert replies + knowledge card from a solved chat
│   ├── materialExtract.ts     # Knowledge card from an uploaded PDF
│   ├── themeSummary.ts        # Why new hires are stuck on a topic
│   ├── homeSummary.ts         # Manager briefing on the Home dashboard
│   ├── checkinInsights.ts     # Check-in themes and one follow-up per named person
│   ├── translate.ts           # Approved card → Malay, Chinese or Tamil
│   ├── warmup.ts              # Embeds the library on page load
│   └── production.ts          # Server used by the Docker container
├── scripts/
│   ├── eval.ts                # npm run eval: answer-quality test → docs/eval-results.md
│   └── eval-set.json          # The 53 test questions and what counts as correct
├── src/                       # Front end (React + TypeScript)
│   ├── views/
│   │   ├── employee/          # Ask a question, answer cards, My tickets, milestone check-ins
│   │   └── manager/           # Home, Needs you, Check-ins, Ticket room, Trends, Knowledge base, Expert team
│   ├── components/            # Answer cards, ticket room chat, shared UI
│   ├── state/AppState.tsx     # Shared data: tickets, rooms, knowledge cards
│   └── data/                  # Sample answers, topics, experts, demo chats
├── docs/                      # Workflow and architecture diagrams
├── .env.example               # Template for the Gemini API key and the 3 model names
├── Dockerfile                 # Production container definition
├── vercel.json                # Vercel deployment settings
└── package.json               # Scripts and dependencies
```

## Limitations

- This is a prototype. Charts, counts and the check-in cohort use **sample data**; the business case is an estimate with editable assumptions.
- Data resets when the page is refreshed (no database or login yet).
- In the demo, AI plays the expert in chats.
- A free-tier Gemini key allows about 15 requests a minute, which a busy demo can reach. Use a paid-tier key for live use (paid-tier prompts are also not used to improve Google's models).
