# ReadyCheck

ReadyCheck is the internal support tool that gets employees ready: for their first day, a policy question, a broken login. This system holds two views. **Design View 1, the Employee Interface**, is a *Dynamic Knowledge Canvas* where answers arrive as interactive widgets, not as chat messages. **Design View 2, the Manager Dashboard**, is a *Theme Command Center* where escalations land and experts are assigned.

> One rule above all: **no chat bubbles.** There is no conversation thread to scroll back through. You ask once, in the omni bar, and the canvas assembles cards you can act on. Each card either gets you ready, or hands you to a person.

## The canvas at a glance

| Layer | Depth token | What lives there |
| --- | --- | --- |
| Ground | — | `ground` plus a 24px dot grid in `haze` and two blurred light orbs (`orb-a` top-left, `orb-b` bottom-right toward the dashboard) |
| Widgets | `z-widget` | Action Cards in a 3-column grid; ambient widgets at rest (readiness, next up) |
| Omni bar | `z-omni` | The one input. Centred on the canvas at rest; glides to the top once cards are on the canvas |
| Dock | `z-dock` | The **Manager Dashboard** dock, top-right. It is the escalation landing target and opens *over* cards |
| Flight | `z-flight` | The escalation overlay and toasts |

**At rest:** greeting in `display-xl`, one sentence of help, the omni bar at `space-8` tall, suggestion chips under it, two ambient widgets on the bottom corners.
**Asking:** the bar compacts and rises (680ms, ease-out); three skeleton widgets appear while a mint scan line runs along the bar's lower edge.
**Answered:** a results line ("Getting connected on day one", then "Best match for …"), then **one** card rises in from slight depth, centred under the bar. Each question gets the single format that answers it best: a video for setup and onboarding, a PDF summary for policy, steps for a fix.
**Esc** clears the canvas back to rest.

The omni bar's placeholder reads *Describe the work issue you need help with…*. An **Add** button replaces the ⌘K hint: it attaches photos or documents (up to five), which show as chips under the bar, travel with the question, and reach the expert if it is escalated. Under the bar sit three starters, **Access issue**, **Find a guide** and **Missing resources**; each fills the bar with an example the employee can edit before pressing Enter.

## Action Cards

Every answer is a card built on one shell (`ActionCard`): a kind badge, a mono meta value top-right, the title in `card-title`, a source line, the body, and the feedback bar. Ship new kinds by composing that shell. Never write a bare text block.

- **Video Player Card** (`VideoCard`): a chaptered clip. The answer is "watch 00:42 to 01:36", so chapters are first-class and clickable. The screen is `screen` in both themes.
- **PDF Summary Card** (`DocSummaryCard`): the source file row, then the 3 key points that apply to this person, each with its page. "Show all" expands in place.
- **Steps Card** (`ChecklistCard`): a how-to you tick through, with a meter. Progress is the person's, not the card's.

Write card titles as the outcome ("Get connected in four steps"), not the document name. Sources say who owns the answer ("IT Enablement · Onboarding library").

## The feedback loop

Every card ends in the same quiet bar: *Did this get you ready?* · **Solved** · **Need human expert**. Both buttons sit in `ink-muted` until hovered, so the bar never competes with the answer. Solved washes `ready-soft`, Need human expert washes `escalate-soft`. On cards narrower than 420px the prompt drops and the two buttons spread to either end.

- **Solved:** the card gains a 1.5px `ready` rim and a mint wash, the bar becomes "Marked solved. Nice, you're ready." with Undo.
- **Need human expert:** starts the escalation flight below. Nothing asks "are you sure?": the hand-off is cheap and reversible on the dashboard side.

## The escalation flight

The signature moment of View 1. When someone taps **Need human expert**:

1. **Fold (560ms):** the card lifts to glass level 3 and folds, in place, into a `TicketChip` (264 × 60, `escalate` fill), its title carried over.
2. **Fly (980ms):** the ticket arcs along a quadratic curve to the Manager Dashboard dock, tilting into the turn and shrinking to a third. A dotted `escalate` trail draws behind it and fades.
3. **Land:** a ring pulses out of the dock, its counter pops, the drawer opens with the new row ("RC-1042 · Routing", turning mint once an expert takes it).
4. **Receipt:** where the card was, an `EscalatedReceipt` stays: who has it, the three-step track (Sent → Picked up → Answered here) and "Add context". A toast says the same in one sentence.

With `prefers-reduced-motion`, the fold and flight are skipped; the receipt and dock update directly.

## Design View 2: the Theme Command Center

The manager's side of every **Need human expert**. The screen answers one question: *what needs me right now?* A support lead should understand it in five seconds and act in one click.

| Zone | What it shows | Component |
| --- | --- | --- |
| Side menu | A vertical menu on the left, kept in view while the page scrolls: brand, the Employee \| Manager switch, then **Home** (default), **Needs you** (orange count of topics), **Ticket room** (count of ongoing rooms), **Trends**, **Knowledge base** (orange count to review) and **Expert team** (grey count of experts). The signed-in manager (Rachel Goh, Support lead) sits at the bottom. On narrow screens the menu becomes a card at the top with the six pages in two rows of three on phones (one row on tablets) and the manager as an avatar | `CommandCenter` |
| Top strip | Three numbers only, top right of every page: **Need you** (people waiting, orange), **Solved by cards** (%), **In progress** (live rooms, green) | `CommandCenter` |
| Home | Four numbers (open, overdue, employee-confirmed resolved, awaiting confirmation), open issues over time (daily or weekly), common issue categories and open tickets by expert. A strip jumps to Needs you when people are waiting. Sample data, labelled | `HomeOverview` |
| Needs you | *Where new hires are stuck*: one full-width card per theme with people waiting, overdue first, then longest wait. Quiet grey *Handled by cards* chips sit underneath | `NeedsCard`, `AssignControl` |
| Ticket room | Every ticket that reached a person, as a table: **Ticket** (number and room), **Theme**, **PIC** (expert and team), **Employees**, **Latest** message and **Progress** (green *Ongoing* with time or *Employee to reply*, grey *Resolved*). Filter by progress (All, Ongoing, Resolved, with counts) and by PIC (one chip per expert), and search across ticket, room, theme, expert and message. Click a row to open its room. On phones each row becomes a small card | `TicketRooms` |
| Expert team | One card per team: what it covers, each expert with a Free / "1 room" pill. **Add expert team** (name, topics covered, experts) and **Add expert** on every card. Everyone added appears in every Assign menu, and the suggested expert is the least-busy person on a team that covers the topic. Saved in the browser | `ExpertTeam` |
| Trends | **Questions by theme**: one bar per theme, sorted by volume, with the number on each bar. A **Daily / Monthly / All** switch sets the time frame (today, this month so far, all time) and the subtitle names it with the total. Hover shows the share of all questions. On phones the bars run sideways. Sample data, labelled | `ThemeTrends` |

**A theme card** shows the theme, "2 people waiting · oldest 26m", an **Overdue** badge at the 15-minute SLA, the **AI summary** in one line, then each waiting person (initials, name, tenure, wait, question on one line). Its one primary action is **Assign Marcus**: the suggested expert, matched by skill, with the reason underneath ("Suggested expert · Data Platform · 0 active rooms"). **Choose another** opens every expert with team, skills and load. Assigning opens a room, the card slides out, and the room appears at the top of *In progress*, glowing mint for three seconds.

**Three status colours, everywhere:** orange = needs you (a pulsing ring only when overdue), green = being handled (a room is open), grey = no action (handled by cards). Room status "Employee to reply" is green, because a person already has it.

**Responsible AI.** Every AI-made part is labelled (*AI summary*, *Suggested expert*, *AI clustered*), so the human decision stays visible. The footnote says it plainly: *Themes are built only from questions employees chose to ask. No monitoring.*

Each number appears once per screen. Cards keep to two weights (400 and 600) and 16px body text. 

## Ticket Rooms: the hand-off, end to end

Both views run together in `ReadyCheckApp`, switched with the Employee | Manager control by the logo (in the side menu of both views).

1. **Employee** taps Need human expert. The ticket flies to the dashboard; the receipt says a manager is choosing the right person.
2. **Manager** sees it at the top of the queue, tagged *Just in*, and drags an expert onto it (or onto its theme to cover everyone with the same problem).
3. A **Ticket Room** opens. The employee's receipt turns mint with **Open room**, and the expert's first message is already waiting.
4. They talk in the room. The escalated question and the skipped card stay pinned at the top, so nobody re-asks.
5. **Mark solved** closes the room for both sides; the room tile dims to Resolved and the receipt's track completes.
6. **Feedback closes the loop.** When the expert's fix lands, ReadyCheck asks the employee *"Did Daniel solve your problem?"*
   - **Yes:** the room resolves and ReadyCheck AI summarises it into a Steps card (labelled *AI summary*, with the problem, the steps and which room it came from). It lands in the manager's **New knowledge** panel as *Needs manager review*. Once Rachel approves it, the next new hire who asks the same thing gets it first, as a card marked *From an expert*.
   - **Not yet:** ReadyCheck asks whether a **1:1 session** with the expert would help. Booking adds a slot to the room (the next half hour, at the team's desk or on Meet); declining keeps the conversation going.
7. Every room has a **Play sample conversation** demo chip that plays a realistic exchange for its theme, so the whole loop can be shown in under a minute.

**Employee side menu.** The employee canvas has the same vertical menu as the manager's: brand, the Employee | Manager switch, then only two pages, **Ask** (the canvas) and **Your questions**, with Mira Tan (name and day) at the bottom. The Manager Dashboard dock stays top right. On narrow screens the menu becomes a card at the top and Your questions starts folded.

**Your questions.** Inside that menu, a list of every question from the session, rooms first, with a live status chip (Waiting for an expert, Live with Ana, Solved) and unread counts. Clicking a question brings its card back; the chip opens its room. History, escalations and room messages are saved in the browser, so a refresh keeps them.

**Reviewing knowledge.** The manager's **Knowledge base** tab holds every AI summary. A card waiting for review has three actions. **Approve** publishes it. **Edit** opens the title, the problem and the steps (one per line) in place, with **Save draft** (the card stays in review, marked *Draft · edited*) or **Approve**. Live cards have **Edit** too (**Save changes** updates what new hires see at once). **New material** (top right of the tab) opens a form for the manager to write a card from scratch: title, topic, what it helps with, steps, and optional photos or documents. **Publish** makes it live; **Save draft** parks it under review. **Discard** asks for a one-tap reason (Not accurate, Already covered, Out of date, Too specific to one person, Other) and moves the card to **Discarded**, where it keeps its reason and a **Restore** button that sends it back to review.

Rooms are the only place ReadyCheck shows a conversation, because a person is involved. Everything the AI says stays a card.

## Voice

Calm, plain and specific. Write the way a helpful colleague on the next desk talks.

- Say what will happen and who will do it: "Ana Okafor from IT Enablement will answer right here, usually within 12 min."
- Numbers over adjectives: "14 pages", "within 1 hour", "RM 250 per head".
- "Ready" is the brand word; use it sparingly and only as an outcome ("Nice, you're ready"), never as decoration.
- No exclamation marks, no emoji, no "AI" or "assistant" language. The canvas is a tool, not a character.

## Visual foundations

**Glass, three depths.** `glass-100` (chips, wells), `glass-200` (cards, dock), `glass-300` (omni bar, anything in flight). Every panel: `backdrop-filter: blur(var(--blur-glass)) saturate(1.5)`, a 1px `glass-edge` rim and its shadow token, whose inset top highlight says light comes from above. Level 3 uses `blur-heavy`. Never stack more than two glass layers over each other.

**Colour is meaning.** The canvas is neutral graphite-green; only two hues speak:
- `ready` (mint) = act or confirm: submit, progress, Solved, focus rings.
- `escalate` (amber) = a person is now involved: the ticket, the trail, the dock counter, the receipt. Never use amber decoratively.
The two always carry an icon and a label too, so they are never told apart by hue alone.

**Type.** `display` (Instrument Serif) appears once per view: the greeting, or one big figure in a widget. Everything else is `sans` (Geist). `mono` (Geist Mono) is for things you could copy: timecodes, page numbers, ticket IDs, keyboard hints.

**Shape.** Cards and widgets `radius-lg`; media and the ticket `radius-md`; small rows `radius-sm`; the bar, chips and buttons `radius-pill`.

**Motion.** Spatial and short: rise in from depth (`translateY` + a 10° tilt), ease-out `cubic-bezier(.16,1,.3,1)`, 160 / 280 / 560ms. The only long motion is the escalation flight, because it carries meaning.

**Contrast.** All text passes 4.5:1 on ground and on every glass level in both themes; `ink-faint` is tuned to stay above it over `glass-300`.

## Iconography

Inline SVG, 24px grid, 1.6px rounded strokes in `currentColor` (`Icon`, 17 glyphs). Icons sit beside labels; an icon alone needs `label` for its accessible name. There is no logo file yet: the mark is a `check` on a `ready` tile with the name set in `sans` 600.

## Using it

Mount `KnowledgeCanvas` (View 1) or `CommandCenter` (View 2) for a whole view, or compose the parts: `OmniBar`, the three cards on `ActionCard`, `FeedbackBar`, `DashboardDock` + `EscalationFlight` for the hand-off, and `ThemeMap`, `EscalationQueue`, `PICRoster` and `RoomGrid` for the dashboard. Previews run on the dark theme (Spatial Night); Daylight is the second theme.
