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

```bash
npm run dev        # http://localhost:5173 (add #manager for the manager view)
npm run build      # type-check, then production build to dist/
npm run typecheck
```

## Project structure

```
design/                      Claude Design export (source of truth for visuals)
  readycheck-export.html     the full exported prototype; open it in a browser to compare
  tokens.json                colour, spacing, radius, type tokens
  component-types.d.ts       the export's component prop types
  DESIGN.md                  design-system notes
src/
  styles/                    export CSS, split in cascade order (index.css imports them in order)
  types.ts                   domain types (tickets, rooms, themes, knowledge)
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

The UI follows the design export. These parts are stubbed with sample data and marked `TODO` in the code:

- Answer retrieval: `pickScenario` matches keywords. Replace it with a real search or LLM call.
- Expert replies in rooms: canned messages. The export plays scripted per-theme dialogues.
- End-of-room feedback ("Did Ana solve your problem?", book a 1:1) and a real AI summariser.
- Knowledge base "New material" form and Expert team "Add expert team" form.
- Persistence: state is in memory. The export saves to `localStorage` key `readycheck.session.v1`.
- Home and Trends numbers are sample data.

## Team

- _Team member names_

## License

_Add a license, or state that the project is unlicensed._
