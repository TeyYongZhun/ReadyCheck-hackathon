# ReadyCheck

A hackathon project built during the AI Bootcamp.

## Overview

ReadyCheck is an internal support tool that gets new employees ready. It has two views in one site, switched by the **Employee | Manager** control in the side menu:

- **Employee: Dynamic Knowledge Canvas.** Ask once in the omni bar and get one answer card (video, PDF summary or steps). Each card ends with **Solved** or **Need human expert**. Escalating flies the card to the Manager Dashboard as a ticket.
- **Manager: Theme Command Center.** Home overview, **Needs you** (stuck themes, with one-click Assign), **Ticket room**, **Trends**, **Knowledge base** (review AI summaries) and **Expert team**.

Assigning an expert opens a **Ticket Room** where the expert and the employee talk. When the room is solved, an AI summary goes to the knowledge base for review.

## Tech Stack

- React 18 + TypeScript, built with Vite
- Plain CSS driven by design tokens (CSS custom properties), dark ("Spatial Night") and light ("Daylight") themes
- Google Gemini (`@google/genai`), called only from server functions on Vercel (`api/`), so the key never reaches the browser

## Where Gemini is used

| Feature | Endpoint | What Gemini does |
|---|---|---|
| Answering a question | `POST /api/answer` | Picks the best card from the library (or an approved expert card), or writes a new steps card labelled "AI answer". Also classifies the theme so escalations land in the right place. |
| Expert in a ticket room | `POST /api/room-reply` | Plays the assigned expert (demo stand-in). Messages are labelled "AI expert (demo)". When the employee confirms it works, ReadyCheck asks "Did … solve your problem?". |
| Room summary | `POST /api/summarize-room` | Turns a solved room into a knowledge-base draft. A manager still has to approve it. |
| Needs you summaries | `POST /api/theme-summary` | One-line summary of why people are stuck on each theme. |

If Gemini fails or no key is set, the app keeps working: answers fall back to keyword matching and say "Offline answer (AI unavailable)". Home and Trends numbers are still sample data.

## Getting Started

### Prerequisites

- Node.js 18 or newer

### Installation

```bash
git clone <repository-url>
cd ReadyCheck-hackathon
npm install
```

### Running the Project

1. Copy `.env.example` to `.env` and paste your Gemini API key (from https://aistudio.google.com/apikey):

   ```
   GEMINI_API_KEY=your-key
   GEMINI_MODEL=gemini-2.5-flash
   ```

2. Run it:

   ```bash
   npm run dev        # http://localhost:5173 (add #manager for the manager view); /api/* runs locally too
   npm run build      # type-check, then production build to dist/
   npm run typecheck
   ```

### Deploying to Vercel

1. Push the repo to GitHub and import it at https://vercel.com/new (framework: Vite; `vercel.json` sets the rest).
2. In the project, open **Settings → Environment Variables** and add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`).
3. Deploy. The site is served from `dist/`, and `api/[route].ts` handles every `/api/*` call.

Never commit `.env`; it is already in `.gitignore`.

## Project structure

```
api/[route].ts               Vercel function: routes /api/<name> to server/
server/                      Gemini client, prompts and handlers (server-only)
design/                      Claude Design export (source of truth for visuals)
  readycheck-export.html     the full exported prototype; open it in a browser to compare
  tokens.json                colour, spacing, radius, type tokens
  component-types.d.ts       the export's component prop types
  DESIGN.md                  design-system notes
src/
  styles/                    export CSS, split in cascade order (index.css imports them in order)
  types.ts                   domain types (tickets, rooms, themes, knowledge)
  api-types.ts               request/response shapes shared with the server
  lib/api.ts, lib/answer.ts  browser calls to /api/* and the offline fallback
  data/                      sample scenarios and manager data (all illustrative)
  state/AppState.tsx         shared state: escalations, assignments, rooms, knowledge
  components/
    primitives/              Icon, GlassPanel, avatars, toast, attachments
    cards/                   ActionCard + Video/Doc/Checklist cards, escalation flight, receipt, dock
    shell/                   ModeSwitch, TicketRoom, KbCard
  views/
    employee/                KnowledgeCanvas, OmniBar, HistorySidebar
    manager/                 CommandCenter + one file per tab
```

## Still to build

These parts are stubbed with sample data and marked `TODO` in the code:

- The answer library is the sample content in `src/data/scenarios.ts`. Replace it with your real documents (see `server/library.ts`).
- "Book a 1:1" option when a room isn't solved.
- Knowledge base "New material" form and Expert team "Add expert team" form.
- Persistence: state is in memory. The export saves to `localStorage` key `readycheck.session.v1`.
- Home and Trends numbers are sample data.

## Team

- _Team member names_

## License

_Add a license, or state that the project is unlicensed._
