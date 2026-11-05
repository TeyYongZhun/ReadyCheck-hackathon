# ReadyCheck AI Technical README

## 1. AI overview

ReadyCheck uses Google Gemini on the server for structured AI operations. The browser never receives `GEMINI_API_KEY`.

The employee answer flow is a retrieval-augmented generation (RAG) pipeline:

```text
Employee question
  -> semantic embedding
  -> in-memory vector retrieval
  -> cosine-similarity threshold
  -> Gemini semantic reranking
  -> Gemini structured decision
  -> validated company card, or explicit unknown
```

The system is intentionally knowledge-only. Gemini is not allowed to invent a company procedure when no approved source answers the question.

## 2. AI models and configuration

The server-only Gemini client is implemented in [`server/gemini.ts`](./server/gemini.ts).

| Environment variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | none | Required for Gemini API calls |
| `GEMINI_CHAT_MODEL` | `gemini-3.5-flash-lite` | Employee answers, room replies, reranking and dashboard summaries |
| `GEMINI_SUMMARY_MODEL` | `gemini-3.6-flash` | Solved-room summaries and PDF material extraction |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` | Text embeddings for semantic retrieval |
| `RAG_MIN_SIMILARITY` | `0.55` | Minimum cosine similarity for a retrieval candidate |

Example:

```env
GEMINI_API_KEY=your-key-here
GEMINI_CHAT_MODEL=gemini-3.5-flash-lite
GEMINI_SUMMARY_MODEL=gemini-3.6-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
RAG_MIN_SIMILARITY=0.55
```

The chat and summary generation models can be changed independently without changing application code. The configured similarity value is validated; an invalid value falls back to `0.55`.

## 3. Employee answer RAG

The main endpoint is `POST /api/answer`, registered in [`server/routes.ts`](./server/routes.ts). Its request contains:

```ts
{
  query: string;
  files: string[];
  learned: {
    id: string;
    theme: ThemeKey;
    title: string;
    steps: string[];
    materials?: Material[];
  }[];
}
```

The browser sends only live Knowledge Base cards as `learned` cards. This filtering happens in [`src/lib/answer.ts`](./src/lib/answer.ts):

```ts
const live = knowledge.filter((k) => k.status === 'live');
```

Draft and discarded cards are never used for employee answers.

### 3.1 Library retrieval

The built-in company library is created from the cards in [`src/data/scenarios.ts`](./src/data/scenarios.ts). In the manager's Knowledge base each library card can be edited, discarded and restored. The app sends the live library cards, edits included, with every `/api/answer` request as `library`; the server answers from that list (`libraryFromRequest()` in `server/library.ts`) and falls back to the built-in cards only when the field is missing. Discarded cards are never retrieved. [`server/library.ts`](./server/library.ts) converts each card into searchable text containing:

- card title
- source
- step labels and details
- document points
- video chapter labels

The library is retrieved with `semanticSearch()`.

### 3.2 Learned-card retrieval

Live manager-approved cards are retrieved using:

- title
- theme
- approved steps

The learned-card retrieval uses the same semantic vector search and has a keyword fallback if embeddings are unavailable.

### 3.3 Embeddings and vector index

[`server/retrieval.ts`](./server/retrieval.ts) calls Gemini `embedContent()` and caches vectors in:

```ts
Map<string, number[]>
```

This is an in-memory vector index for the demo. It is not a persistent database. The cache is lost after a Vercel cold start or server restart.

For each query:

1. Generate or retrieve the query embedding.
2. Generate or retrieve an embedding for each candidate card.
3. Calculate cosine similarity.
4. Remove candidates below `RAG_MIN_SIMILARITY`.
5. Return at most six candidates.

Candidates with no keyword match are also excluded from the keyword fallback. This prevents unrelated cards from being sent to Gemini merely because the result list needs to be filled.

### 3.4 Cosine similarity

Cosine similarity compares the direction of the query vector and card vector:

```text
similarity = dot(query, card) / (norm(query) * norm(card))
```

The default threshold is `0.55`. The threshold should be calibrated with representative company questions before production use.

### 3.5 Semantic reranking

The retrieved library and learned candidates are combined and sent to `rerankCandidates()`.

The reranker receives the full searchable text, not only the title. It returns an ordered list of existing candidate IDs. Unknown IDs are ignored, and any candidates omitted by the model are appended in their original order.

Reranking is a second relevance check; it does not authorize new content and cannot create a new card.

### 3.6 Final Gemini decision

Gemini receives only the retrieved candidates and the allowed theme list. Its response schema is:

```ts
{
  heading: string;
  theme: ThemeKey;
  choice: 'chat' | 'library' | 'learned' | 'unknown';
  message?: string;
  cardId?: string;
}
```

The server validates the response:

- `library` is accepted only when `cardId` exists in the retrieved library candidates.
- `learned` is accepted only when `cardId` exists in the retrieved live learned candidates.
- `unknown` is converted to the fixed company-knowledge message.
- Invalid or fabricated card IDs produce an API error instead of a success-shaped answer.

The server does not accept a generated answer card. There is no generic AI guidance path.

## 4. Unknown-answer behavior

When no approved card directly answers the question, the employee receives:

```text
I don’t know based on the approved company knowledge available to me.
Please ask a human expert.
```

The frontend represents this as an answer card with no steps and a `Need human expert` action. Clicking the action creates a ticket through the existing escalation flow.

For routing, the frontend applies explicit topic recognition to unknown questions. For example:

| Query terms | Theme |
|---|---|
| `database`, `staging`, `postgres`, `sql`, `warehouse` | Databases |
| `vpn`, `remote access`, `GlobalConnect`, `network` | VPN & remote access |
| `mfa`, `2fa`, `authenticator`, `new phone` | MFA & new phones |
| `expense`, `receipt`, `Concur`, `claim` | Expenses |
| `payroll`, `bank account`, `salary` | Payroll & bank details |

This only routes the ticket to a Needs you theme. It does not automatically assign an expert.

## 5. Offline behavior

If the AI API is unavailable:

- small talk can still receive the local small-talk response;
- a question can use a built-in scenario only when its explicit scenario pattern matches;
- there is no catch-all onboarding pattern;
- unmatched questions return the same unknown behavior;
- keyword retrieval is used only as a retrieval fallback, not as permission to invent an answer.

The frontend marks the AI connection as offline through [`src/lib/ai-status.ts`](./src/lib/ai-status.ts).

## 6. Manager dashboard AI

### Home summary

`POST /api/home-summary` is implemented in [`server/homeSummary.ts`](./server/homeSummary.ts).

The frontend computes dashboard metrics and sends them to Gemini:

- open tickets
- overdue tickets
- active rooms
- waiting tickets
- top themes
- expert workload
- active rooms and active tickets per expert
- expert capacity

Gemini writes a short summary and one action. It does not calculate dashboard metrics.

Expert recommendation is determined by code before Gemini is called:

1. Match the expert's covered domain.
2. Require capacity under `maxRooms` and `maxTickets`.
3. Prefer fewer active rooms.
4. Track a busy expert or an all-busy domain.
5. Use Gemini only to explain the already-selected recommendation.

The manager must still click Assign. Home AI text and Needs you suggestions never assign tickets automatically.

The dashboard retains its operational KPI cards, including the waiting-time indicator. The Smart suggestions panel uses these metrics only to offer a neutral reminder and suggested next step; it does not describe SLA breaches, judge individual performance, or turn the KPI into a compliance message.

### Theme summaries

`POST /api/theme-summary` summarizes waiting questions within one manager theme. The question list comes from tickets already grouped by the application.

### Room replies and solved-room summaries

The room AI endpoints are:

- `POST /api/room-reply`: demo expert response in a ticket room.
- `POST /api/summarize-room`: turns a solved room conversation into a Knowledge Base draft.

Room-generated knowledge remains `review` until a manager approves it.

## 7. PDF material extraction

`POST /api/material-extract` is implemented in [`server/materialExtract.ts`](./server/materialExtract.ts).

The endpoint currently accepts only PDFs up to 8 MB. Gemini receives the PDF as inline data and returns:

```ts
{
  title: string;
  theme: ThemeKey;
  problem: string;
  steps: string[];
}
```

The manager's existing Title, Problem, Steps and manually selected Topic are preserved by the frontend. AI extraction fills only empty fields, subject to the manager's review.

## 8. Video materials

Video files can be attached to a Knowledge Base card. The current implementation stores the file metadata and, for the demo, a browser data URL. If the manager grants access and publishes the card, employees can play the video in the answer card.

Video content is not currently sent to Gemini for analysis. There is no video:

- transcription;
- speech or audio extraction;
- visual analysis;
- chapter extraction;
- automatic title generation;
- automatic topic generation;
- automatic problem description generation; or
- automatic step generation.

Therefore the current video workflow is:

```text
Manager attaches video
  -> manager enters Title, Topic, Problem and Steps manually
  -> manager reviews and publishes the card
  -> employee can play the approved video if access is allowed
```

The PDF and video capabilities are currently different:

| Capability | PDF | Video |
|---|---:|---:|
| Attach to a Knowledge Base card | Yes | Yes |
| AI content extraction | Yes | No |
| Automatic title/topic/problem/steps | Yes | No |
| Employee viewing or playback | Yes | Yes |
| Manager-controlled employee access | Yes | Yes |

Adding video extraction would require a separate processing pipeline:

```text
Upload video
  -> persistent object storage
  -> Gemini video input or speech-to-text
  -> transcript and/or visual context
  -> Gemini-generated editable card fields
  -> manager review
  -> publish
```

That pipeline would need video format and size validation, upload progress, processing timeouts, quota handling and persistent object storage. It should not rely on browser `localStorage` for large files.

## 9. Knowledge governance and material access

A Knowledge Base card is employee-visible only when:

```ts
status === 'live'
```

Raw PDF/video materials are included in the employee card only when:

```ts
status === 'live'
allowEmployeeAccess === true
```

The manager permission checkbox is shown only after a PDF or video has been attached. The employee can then open PDFs in an iframe or play videos in the card.

The current demo keeps file data URLs and session state in browser memory only, so everything resets to the seed data on refresh. This keeps the demo repeatable, but it is not suitable for cross-device sharing or large videos. A shared deployment should use object storage and a database, preferably with signed URLs.

## 10. AI safety and source-of-truth rules

The following rules are enforced:

- The API key remains server-side.
- Gemini sees retrieved reference cards, not arbitrary company data.
- The server validates selected card IDs.
- Only live approved Knowledge Base cards enter learned retrieval.
- No matching approved knowledge means `unknown`.
- Unknown answers contain no generic steps.
- The employee can escalate an unknown answer to a human expert.
- Manager approval is required before solved-room summaries become employee knowledge.
- AI recommendations do not automatically assign experts.

## 11. Onboarding milestone check-ins

Check-ins are scheduled at five onboarding milestones: Week 1 (Getting Started), Week 2 (Early Adjustment), Day 30 (Building Competence), Day 60 (Growing Independence), and Day 90 (Successful Integration). Each milestone has its own four questions and focus areas, defined in [`src/data/checkins.ts`](./src/data/checkins.ts). In the demo check-in sheet, the Demo button lets a presenter switch which milestone is displayed; it does not advance the employee's real onboarding schedule. Answers are `yes`, `partly`, `notyet` or `na`; Partly/Not yet can include an optional question-specific follow-up, and there is one optional open note in any language. The employee explicitly chooses whether the check-in carries their name. State lives in [`src/state/AppState.tsx`](./src/state/AppState.tsx), and the maths is in [`src/lib/checkins.ts`](./src/lib/checkins.ts). `na` is excluded from difficulty comparisons. Manager pulse distributions are grouped by milestone; follow-up outcomes compare only exact repeated question wording.

- **Check-ins page:** participation metrics, pulse distributions from each employee's latest check-in, the five milestone timeline, and expandable follow-up outcomes. The illustrative cohort is labeled as sample data. Pulse and milestone response counts are withheld until at least `MIN_GROUP` (3) check-ins are available.
- **Progress tracking:** comparisons require a completed support action and named check-ins at the action milestone and a later milestone. Only the same employee's answers to exactly repeated question wording are compared. Existing difficulties are labeled improved, unchanged or worsened; `na` is excluded. Anonymous check-ins never enter individual comparisons, and the page does not claim that an action caused a change.

The server-side check-in insight endpoint ([`server/checkinInsights.ts`](./server/checkinInsights.ts)) remains available for compatibility and accepts the same four stable-question totals. It is not called by the current Check-ins page, which does not display an AI-generated organizational themes section. If invoked, its aggregate comment processing is threshold-gated, person-level context is limited to check-ins explicitly marked named, and employee display names are not sent. It returns:

```ts
{ themes: { name, count, summary, action }[]; people: { id, why, action }[] }
```

The server drops unknown ids, caps counts at the number of responses and trims every string. The prompt forbids emotion inference, resignation prediction, scores and performance judgement. The current Check-ins page uses deterministic comparisons from `src/lib/checkins.ts`; it does not display the endpoint's themes or named summaries.

## 12. Multilingual answers

`/api/answer` also returns `lang` (`en`, `ms`, `zh`, `ta`). Heading and chat replies come back in that language, and the fixed "I don't know" reply has one approved wording per language. Retrieval needs no change because `gemini-embedding-001` embeds across languages.

When `lang` isn't English, the client calls `POST /api/translate-card` ([`server/translate.ts`](./server/translate.ts)). The server flattens the card's own strings into an array, Gemini translates them one for one, and the server rejects a reply with a different count or an empty string where the source had text. Numbers, RM amounts, page numbers and system names stay unchanged. The card is labelled "Translated by AI from the approved English card", with "Show original". If translation fails, the English card is shown.

## 13. Evaluation

`npm run eval` ([`scripts/eval.ts`](./scripts/eval.ts), cases in [`scripts/eval-set.json`](./scripts/eval-set.json)) calls `answer()` directly, so it tests the same embeddings, rerank, decision and validation as the app. It writes [`docs/eval-results.md`](./docs/eval-results.md). On a free-tier key, `EVAL_DELAY_MS` (default 9000) paces it, and a 429 is waited out and retried rather than counted as a wrong answer.

## 14. Current limitations

This implementation is optimized for the hackathon demo:

- The vector index is in memory and rebuilt after cold starts. `POST /api/warmup` embeds the built-in library on page load to hide most of that.
- There is no persistent vector database yet.
- Embeddings are generated lazily on first retrieval.
- Embeddings are generated per candidate rather than from a prebuilt batch index.
- The similarity threshold needs evaluation against real company questions.
- The fallback keyword index is not a substitute for semantic retrieval.
- Video content is not automatically extracted or transcribed.
- Session state lives in browser memory, so it resets on refresh and is not shared between users.

For production, add a persistent vector store such as pgvector, Supabase Vector, Pinecone or another managed vector database. Precompute embeddings when a library or Knowledge Base card is created or approved, and store material files in private object storage.