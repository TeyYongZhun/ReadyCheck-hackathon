// Shared state for both views: escalations flow employee → manager, rooms flow back.
// Everything is in-memory and starts fresh on every page load, so a demo can always be run again from the seed data.
// TODO: move to a backend if it should survive a refresh.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Attachment, CardKind, CardSpec, CheckIn, HistoryEntry, KbItem, LibraryEntry, Message, MilestoneKey, Mode, Pic, PulseAnswer, PulseKey, QueueTicket, Room, SupportAction, ThemeKey } from '../types';
import { PICS, QUEUE, ROOMS, SEED_KB, THEMES_BY_KEY } from '../data/command';
import { CHECKIN_EDIT_WINDOW_MS, CHECKIN_MILESTONES, COHORT, SEED_ACTIONS, SEED_CHECKINS } from '../data/checkins';
import { latestByPerson, reachOutList } from '../lib/checkins';
import { SCENARIOS, SCEN_THEME } from '../data/scenarios';
import { askRoomReply, askSummary } from '../lib/api';
import { SAMPLE_SUMMARIES, dialogueFor, fillLine } from '../data/dialogues';
import type { ChatLine, PicPersona, TicketContext } from '../api-types';
import { clock, slugify, uid } from '../lib/util';

export interface Assignment { roomId: string; roomName: string; pic: Pic; status: 'live' | 'resolved' }

export interface RoomRecord {
  room: Room;
  pic: Pic;
  employee: { name: string; first: string; initials: string };
  ticket: QueueTicket | null;
  messages: Message[];
  typing: false | 'pic' | 'employee' | 'ai';
  /** "ask": the expert thinks it's fixed, so the employee is asked to confirm.
   *  "ask1v1": the employee said it isn't fixed, so they're offered a 1:1 with the expert. "booked": a 1:1 is booked. */
  feedback?: 'ask' | 'ask1v1' | 'booked' | null;
  /** The scripted sample conversation is playing. */
  demo?: boolean;
}

export interface EscalationInput {
  id: string; title: string; query: string; kind: CardKind; theme: ThemeKey; entryId: string | null;
  /** No approved card matched, so the employee saw "I don't know" rather than a card. */
  noAnswer?: boolean;
  files: Pick<Attachment, 'name' | 'kind'>[];
}

/** The demo employee, the same everywhere she appears. `id` is her place in the check-in cohort. */
export const ME = { id: 'mt', person: 'Mira Tan', first: 'Mira', initials: 'MT', role: 'Product Designer · Day 3', team: 'Product Design', milestone: 'week1' as const };

export interface CheckInInput { answers: Record<PulseKey, PulseAnswer>; followUps?: Partial<Record<PulseKey, string>>; note?: string; named: boolean }
const NOT_YET = 'Not yet, it’s still not working.';

function useAppStateValue() {
  const [mode, setMode] = useState<Mode>(location.hash === '#manager' ? 'manager' : 'employee');
  const [demoMilestone, setDemoMilestone] = useState<MilestoneKey>(ME.milestone);
  const [queue, setQueue] = useState<QueueTicket[]>(() => QUEUE.map((q) => ({ ...q })));
  const [mine, setMine] = useState<string[]>([]); // ticket ids raised from this employee canvas
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [rooms, setRooms] = useState<Record<string, RoomRecord>>(() => Object.fromEntries(ROOMS.map((r) => [r.id, seedRecord(r)])));
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [knowledge, setKnowledge] = useState<KbItem[]>(() => SEED_KB.map((k) => ({ ...k })));
  const [experts, setExperts] = useState<Pic[]>(PICS);
  const [library, setLibrary] = useState<LibraryEntry[]>(() => SCENARIOS.flatMap((s) => s.cards.map((card) => (
    { card, scenario: s.key, topic: SCEN_THEME[s.key as keyof typeof SCEN_THEME], status: 'live' as const }
  ))));
  const [checkins, setCheckins] = useState<CheckIn[]>(() => SEED_CHECKINS.map((c) => ({ ...c })));
  const [actions, setActions] = useState<SupportAction[]>(() => SEED_ACTIONS.map((x) => ({ ...x })));
  const [openRoom, setOpenRoom] = useState<{ id: string; viewer: Mode } | null>(null);
  const roomsRef = useRef(rooms); roomsRef.current = rooms;
  const ticketSeq = useRef(0);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  useEffect(() => {
    const updateWaitTimes = () => {
      const now = Date.now();
      setQueue((current) => {
        let changed = false;
        const next = current.map((ticket) => {
          if (ticket.createdAt === undefined) return ticket;
          const elapsed = Math.max(0, Math.floor((now - ticket.createdAt) / 60000));
          const wait = Math.max(ticket.wait, elapsed);
          if (wait === ticket.wait) return ticket;
          changed = true;
          return { ...ticket, wait };
        });
        return changed ? next : current;
      });
    };
    updateWaitTimes();
    const interval = window.setInterval(updateWaitTimes, 1000);
    return () => window.clearInterval(interval);
  }, []);

  function go(next: Mode) {
    setMode(next); setOpenRoom(null);
    try { window.history.replaceState(null, '', '#' + next); } catch { /* sandboxed */ }
    window.scrollTo(0, 0);
  }

  function push(roomId: string, msg: Omit<Message, 'id' | 't'>) {
    setRooms((s) => s[roomId] ? { ...s, [roomId]: { ...s[roomId], typing: false, messages: [...s[roomId].messages, { id: uid('m'), t: clock(), ...msg }] } } : s);
  }
  function setTyping(roomId: string, typing: RoomRecord['typing']) {
    setRooms((s) => s[roomId] ? { ...s, [roomId]: { ...s[roomId], typing } } : s);
  }
  function setFeedback(roomId: string, feedback: RoomRecord['feedback']) {
    setRooms((s) => s[roomId] ? { ...s, [roomId]: { ...s[roomId], feedback } } : s);
  }

  /** Gemini writes the expert's next message from the conversation so far (demo stand-in for a real expert). */
  async function expertTurn(roomId: string, messages: Message[]) {
    const rec = roomsRef.current[roomId]; if (!rec) return;
    setTyping(roomId, 'pic');
    const res = await askRoomReply({ pic: persona(rec.pic), employee: employeeName(rec), ticket: ticketContext(rec.ticket), messages: chatLines(messages) });
    if (!res) {
      setTyping(roomId, false);
      // Say so once the employee is waiting on a reply; the opening line can fail quietly, the sample conversation still plays.
      if (messages.length) push(roomId, { from: 'system', text: `${rec.pic.first}’s reply is delayed. Send your message again, or play the sample conversation.` });
      return;
    }
    push(roomId, { from: 'pic', text: res.reply, ai: true });
    if (res.solved) setFeedback(roomId, 'ask');
  }

  /** Next free ticket id, past every id in the restored session, so a reload can't reuse one and inherit its old expert. */
  function newTicketId() {
    const used = [
      ...queue.map((q) => q.id), ...mine, ...Object.keys(assignments),
      ...Object.values(rooms).flatMap((r) => [r.room.ticket, ...(r.room.tickets ?? [])]),
      ...history.flatMap((h) => (h.ticketId ? [h.ticketId] : [])),
    ];
    const highest = Math.max(1060, ...used.map((id) => Number(/\d+/.exec(id ?? '')?.[0] ?? 0)));
    ticketSeq.current = Math.max(ticketSeq.current, highest) + 1;
    return 'RC-' + ticketSeq.current;
  }

  /** Employee tapped "Need human expert". The ticket waits in Needs you until a manager assigns an expert. */
  function escalate(e: EscalationInput) {
    const theme = e.theme;
    setAssignments((a) => (a[e.id] ? Object.fromEntries(Object.entries(a).filter(([id]) => id !== e.id)) : a));
    const t: QueueTicket = {
      id: e.id, title: e.title, person: ME.person, first: ME.first, initials: ME.initials, role: ME.role,
      theme, wait: 0, createdAt: Date.now(), isNew: true, from: e.noAnswer ? 'no approved answer found' : e.kind + ' card',
      slug: theme + '-' + slugify(ME.first) + '-' + e.id.replace(/\D/g, '').slice(-2),
      q: (e.query ? `“${e.query}” ` : '') + (e.noAnswer ? 'No approved card matched.' : 'Card shown: ' + e.title + '.'), files: e.files,
    };
    setQueue((l) => [t, ...l]);
    setMine((l) => [...l, e.id]);
    if (e.entryId) setHistory((l) => l.map((x) => (x.id === e.entryId ? { ...x, state: 'escalated', ticketId: e.id } : x)));
    later(() => setQueue((l) => l.map((x) => (x.id === e.id ? { ...x, isNew: false } : x))), 6000);
  }

  /** Manager assigned an expert to every waiting ticket in a theme. Opens one room for them. */
  function assignTheme(theme: ThemeKey, pic: Pic) {
    const joined = queue.filter((q) => q.theme === theme && !q.leaving);
    if (!joined.length) return null;
    const t = THEMES_BY_KEY[theme];
    const first = joined[0];
    const room: Room = {
      id: uid('r'), ticket: first.id, tickets: joined.map((x) => x.id), name: '#' + (joined.length > 1 ? slugify(t.name) : first.slug),
      theme, pic: pic.id, people: joined.map((x) => x.initials), status: 'live', elapsed: 0, isNew: true,
      last: `${pic.first} joined. ${joined.length > 1 ? joined.length + ' employees have' : first.first + ' has'} been notified.`,
    };
    const ids = joined.map((x) => x.id);
    // Remove assigned tickets immediately so Needs you and the employee receipt
    // reflect the same state in the same render.
    setQueue((l) => l.filter((x) => !ids.includes(x.id)));
    later(() => setRooms((s) => s[room.id] ? { ...s, [room.id]: { ...s[room.id], room: { ...s[room.id].room, isNew: false } } } : s), 3200);
    setRooms((s) => ({
      ...s,
      [room.id]: {
        room, pic, ticket: first, typing: 'pic',
        employee: { name: first.person, first: first.first, initials: first.initials },
        messages: [{ id: uid('m'), t: clock(), from: 'system', text: `Rachel Goh assigned ${pic.name} (${pic.team})` }],
      },
    }));
    const ours = ids.filter((id) => mine.includes(id));
    if (ours.length) setAssignments((a) => ({ ...a, ...Object.fromEntries(ours.map((id) => [id, { roomId: room.id, roomName: room.name, pic, status: 'live' as const }])) }));
    // Wait a tick so roomsRef sees the new room before Gemini writes the opening message.
    later(() => void expertTurn(room.id, []), 400);
    return room;
  }

  function send(roomId: string, viewer: Mode, text: string) {
    const rec = rooms[roomId]; if (!rec) return;
    const msg: Message = { id: uid('m'), t: clock(), from: viewer === 'manager' ? 'manager' : 'employee', text };
    setRooms((s) => s[roomId] ? { ...s, [roomId]: { ...s[roomId], feedback: null, messages: [...s[roomId].messages, msg] } } : s);
    // Only the employee's messages get an automatic expert reply; the manager's go out as Rachel.
    if (viewer === 'employee') void expertTurn(roomId, [...rec.messages, msg]);
  }

  /** Play the scripted sample conversation for this room's theme, one line at a time with typing, then ask "Did … solve it?". */
  function playDemo(roomId: string) {
    const rec = roomsRef.current[roomId]; if (!rec || rec.demo || rec.room.status === 'resolved') return;
    const lines = dialogueFor(rec.room.theme);
    // The expert has usually already said hello, so start from the employee's first reply.
    const start = rec.messages.some((m) => m.from === 'pic') ? Math.max(0, lines.findIndex((l) => l[0] === 'employee')) : 0;
    const names = { first: employeeName(rec), pic: rec.pic.first, team: rec.pic.team };
    setRooms((s) => s[roomId] ? { ...s, [roomId]: { ...s[roomId], demo: true, feedback: null } } : s);
    const step = (i: number) => {
      const cur = roomsRef.current[roomId];
      if (!cur || !cur.demo || cur.room.status === 'resolved') return;
      if (i >= lines.length) {
        setRooms((s) => s[roomId] ? { ...s, [roomId]: { ...s[roomId], demo: false, typing: false, feedback: 'ask' } } : s);
        return;
      }
      const [who, text] = lines[i];
      setTyping(roomId, who);
      later(() => {
        if (!roomsRef.current[roomId]?.demo) return;
        push(roomId, { from: who, text: fillLine(text, names), scripted: true });
        later(() => step(i + 1), 450);
      }, who === 'pic' ? 1600 : 1100);
    };
    later(() => step(start), 150);
  }

  function stopDemo(roomId: string) {
    setRooms((s) => s[roomId] ? { ...s, [roomId]: { ...s[roomId], demo: false, typing: false } } : s);
  }

  /** Employee's answer to "Did {expert} solve your problem?". */
  function answerFeedback(roomId: string, solved: boolean) {
    const rec = rooms[roomId]; if (!rec) return;
    if (solved) { void resolve(roomId, employeeName(rec)); return; }
    // Not fixed: offer a 1:1 with the expert before carrying on in chat.
    const msg: Message = { id: uid('m'), t: clock(), from: 'employee', text: NOT_YET };
    setRooms((s) => s[roomId] ? { ...s, [roomId]: { ...s[roomId], feedback: 'ask1v1', messages: [...s[roomId].messages, msg] } } : s);
  }

  /** Employee stepped back from the 1:1 offer: drop their "Not yet" and ask "Did … solve it?" again. */
  function back1v1(roomId: string) {
    setRooms((s) => {
      const r = s[roomId]; if (!r || r.feedback !== 'ask1v1') return s;
      const last = r.messages[r.messages.length - 1];
      const messages = last?.from === 'employee' && last.text === NOT_YET ? r.messages.slice(0, -1) : r.messages;
      return { ...s, [roomId]: { ...r, feedback: 'ask', messages } };
    });
  }

  /** Employee's answer to "Would a 1:1 with {expert} help?". */
  function answer1v1(roomId: string, book: boolean) {
    const rec = rooms[roomId]; if (!rec) return;
    if (book) {
      const slot = nextSlot();
      const msg: Message = { id: uid('m'), t: clock(), from: 'employee', text: 'Yes, please book a 1:1.' };
      const booked: Message = { id: uid('m'), t: clock(), from: 'system', kind: 'booked', text: ` with ${rec.pic.name} · Today ${slot} · ${rec.pic.team} desk, or join on Meet` };
      setRooms((s) => s[roomId] ? { ...s, [roomId]: { ...s[roomId], feedback: 'booked', typing: 'pic', messages: [...s[roomId].messages, msg, booked] } } : s);
      later(() => push(roomId, { from: 'pic', text: `Booked for ${slot.split('–')[0]}. I’ll bring your case so we can fix it together. Keep writing here until then if anything changes.` }), 1400);
      return;
    }
    const msg: Message = { id: uid('m'), t: clock(), from: 'employee', text: 'No, let’s keep chatting.' };
    setRooms((s) => s[roomId] ? { ...s, [roomId]: { ...s[roomId], feedback: null, messages: [...s[roomId].messages, msg] } } : s);
    void expertTurn(roomId, [...rec.messages, msg]);
  }

  /** Close the room, then turn the conversation into a knowledge-base draft for manager review.
   *  A played sample conversation uses its ready-made summary (labelled "Sample"); a real chat goes to Gemini. */
  async function resolve(roomId: string, by: string) {
    const rec = rooms[roomId]; if (!rec) return;
    setRooms((s) => ({ ...s, [roomId]: { ...s[roomId], feedback: null, room: { ...s[roomId].room, status: 'resolved' } } }));
    push(roomId, { from: 'system', text: 'Marked solved by ' + by });
    setAssignments((a) => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v.roomId === roomId ? { ...v, status: 'resolved' as const } : v])));
    const sample = rec.messages.some((m) => m.scripted) ? SAMPLE_SUMMARIES[rec.room.theme] : undefined;
    if (!sample) setTyping(roomId, 'ai');
    const sum = sample ?? await askSummary({ roomName: rec.room.name, pic: persona(rec.pic), employee: employeeName(rec), ticket: ticketContext(rec.ticket), messages: chatLines(rec.messages) });
    if (!sum) {
      push(roomId, { from: 'system', text: 'AI summary unavailable, so nothing was added to the knowledge base.' });
      return;
    }
    const kb: KbItem = {
      id: uid('kb'), roomId, roomName: rec.room.name, theme: rec.room.theme, title: sum.title, problem: sum.problem, steps: sum.steps,
      pic: rec.pic, employee: employeeName(rec), status: 'review', at: clock(), sample: !!sample,
    };
    setKnowledge((l) => [kb, ...l]);
    push(roomId, { from: 'system', kind: 'kb', kbId: kb.id, text: (sample ? 'Sample' : 'AI') + ' summary added to the knowledge base' });
  }

  function reopen(roomId: string, by: string) {
    setRooms((s) => ({ ...s, [roomId]: { ...s[roomId], room: { ...s[roomId].room, status: 'live' } } }));
    // The employee's dock and history read the assignment, so it goes back to live too.
    setAssignments((a) => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v.roomId === roomId ? { ...v, status: 'live' as const } : v])));
    push(roomId, { from: 'system', text: 'Reopened by ' + by });
  }

  const kb = {
    approve: (id: string) => setKnowledge((l) => l.map((x) => (x.id === id ? { ...x, status: 'live' } : x))),
    discard: (id: string, reason: string) => setKnowledge((l) => l.map((x) => (x.id === id ? { ...x, status: 'discarded', discardReason: reason } : x))),
    restore: (id: string) => setKnowledge((l) => l.map((x) => (x.id === id ? { ...x, status: 'review', discardReason: '' } : x))),
    edit: (id: string, patch: Pick<KbItem, 'title' | 'problem' | 'steps'>) => setKnowledge((l) => l.map((x) => (x.id === id ? { ...x, ...patch, edited: true } : x))),
    add: (item: KbItem) => setKnowledge((l) => [item, ...l]),
  };

  /** Company-library cards: an edit or a discard changes what ReadyCheck AI can answer from straight away. */
  const lib = {
    edit: (id: string, card: CardSpec) => setLibrary((l) => l.map((x) => (x.card.id === id ? { ...x, card, edited: true } : x))),
    discard: (id: string, reason: string) => setLibrary((l) => l.map((x) => (x.card.id === id ? { ...x, status: 'discarded', discardReason: reason } : x))),
    restore: (id: string) => setLibrary((l) => l.map((x) => (x.card.id === id ? { ...x, status: 'live', discardReason: '' } : x))),
  };

  const history_ = {
    add: (e: HistoryEntry) => setHistory((l) => [e, ...l].slice(0, 40)),
    setState: (id: string, state: HistoryEntry['state']) => setHistory((l) => l.map((x) => (x.id === id && x.state !== 'escalated' ? { ...x, state } : x))),
    clear: () => setHistory([]),
  };

  /** Mira sent her milestone check-in. It replaces any earlier one for the same milestone. */
  function submitCheckIn(input: CheckInInput): boolean {
    const now = Date.now();
    const note = input.note?.trim();
    const followUps = Object.fromEntries(Object.entries(input.followUps ?? {}).map(([key, value]) => [key, value.trim()]).filter(([, value]) => !!value)) as CheckIn['followUps'];
    const existing = checkins.find((c) => c.person === ME.id && c.milestone === demoMilestone);
    if (existing) {
      if (!existing.submittedAt || now - existing.submittedAt >= CHECKIN_EDIT_WINDOW_MS) return false;
      const updated: CheckIn = { ...existing, at: 'Today ' + clock(), answers: input.answers, followUps, note: note || undefined, named: input.named, isNew: true };
      setCheckins((l) => l.map((c) => (c.id === updated.id ? updated : c)));
      later(() => setCheckins((l) => l.map((c) => (c.id === updated.id ? { ...c, isNew: false } : c))), 8000);
      return true;
    }

    const ci: CheckIn = { id: uid('ci'), person: ME.id, milestone: demoMilestone, at: 'Today ' + clock(), submittedAt: now, answers: input.answers, followUps, note: note || undefined, named: input.named, isNew: true };
    setCheckins((l) => [ci, ...l]);
    later(() => setCheckins((l) => l.map((c) => (c.id === ci.id ? { ...c, isNew: false } : c))), 8000);
    return true;
  }

  /** A manager chose a follow-up for one person, or for a cohort theme. */
  function planAction({ owner, ...input }: { person?: string; theme?: string; label: string; milestone: CheckIn['milestone']; owner?: string }) {
    const x: SupportAction = { ...input, id: uid('act'), owner: owner ?? 'Rachel Goh', when: 'Today ' + nextSlot().split('–')[0], status: 'planned' };
    setActions((l) => [...l.filter((a) => !(a.status === 'planned' && ((x.person && a.person === x.person && a.milestone === x.milestone) || (x.theme && a.theme === x.theme)))), x]);
  }
  function completeAction(id: string) {
    setActions((l) => l.map((a) => (a.id === id ? { ...a, status: 'done' } : a)));
  }

  /** Mira's own ticket signals, from questions she chose to ask. Stable wording (no minute counts) so the AI isn't re-asked every tick. */
  const mySignals = useMemo(() => {
    const out: string[] = [];
    queue.filter((q) => q.person === ME.person).forEach((q) => out.push(`Waiting for an expert: “${q.title ?? q.q}”`));
    Object.entries(assignments).forEach(([id, a]) => {
      if (a.status !== 'live') return;
      const rec = rooms[a.roomId];
      out.push(rec?.feedback === 'ask1v1' ? `Told ${a.pic.first} ticket ${id} is not fixed yet`
        : rec?.feedback === 'booked' ? `1:1 booked with ${a.pic.first} for ticket ${id}`
        : `Ticket ${id} still open with ${a.pic.first} (${a.pic.team})`);
    });
    const unanswered = history.filter((h) => h.answer.card.id.startsWith('unknown-')).length;
    if (unanswered) out.push(`${unanswered} question${unanswered === 1 ? '' : 's'} this week had no approved answer`);
    return out.slice(0, 4);
  }, [queue, assignments, rooms, history]);

  const latestCheckins = useMemo(() => latestByPerson(checkins), [checkins]);
  const reachOut = useMemo(
    () => reachOutList(COHORT, latestCheckins, (id) => (id === ME.id ? mySignals : COHORT.find((h) => h.id === id)?.signals ?? []), actions),
    [latestCheckins, mySignals, actions],
  );

  const roomList = useMemo(() => Object.values(rooms).map((r) => withLatest(r)), [rooms]);
  const load = useMemo(() => {
    const m: Record<string, number> = {};
    roomList.forEach((r) => { if (r.status !== 'resolved') m[r.pic] = (m[r.pic] ?? 0) + 1; });
    return m;
  }, [roomList]);

  return {
    mode, go, queue, mine, assignments, rooms, roomList, load, history: history_, historyItems: history, knowledge, kb, library, lib,
    experts, setExperts, openRoom, setOpenRoom, newTicketId, escalate, assignTheme, send, answerFeedback, answer1v1, back1v1, playDemo, stopDemo, resolve, reopen,
    checkins, latestCheckins, actions, reachOut, demoMilestone, setDemoMilestone, demoMilestones: CHECKIN_MILESTONES, submitCheckIn, planAction, completeAction,
  };
}

/** The next half-hour slot at least 30 minutes away, e.g. "13:30–14:00". */
function nextSlot(): string {
  const s = new Date(Date.now() + 30 * 60000);
  s.setMinutes(s.getMinutes() < 30 ? 30 : 60, 0, 0);
  const e = new Date(s.getTime() + 30 * 60000);
  const f = (d: Date) => d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  return f(s) + '–' + f(e);
}

function persona(p: Pic): PicPersona { return { name: p.name, first: p.first, team: p.team, skills: p.skills }; }
function employeeName(r: RoomRecord): string { return r.employee.first === 'there' ? r.employee.name : r.employee.first; }
function ticketContext(t: QueueTicket | null): TicketContext | null { return t ? { q: t.q, from: t.from } : null; }
function chatLines(ms: Message[]): ChatLine[] {
  return ms.flatMap((m) => (m.from === 'system' ? [] : [{ from: m.from, text: m.text }]));
}

function seedRecord(r: Room): RoomRecord {
  const pic = PICS.find((p) => p.id === r.pic)!;
  const i = r.last.indexOf(': ');
  return {
    room: { ...r }, pic, ticket: null, typing: false,
    employee: r.who
      ? { name: r.who, first: r.who.split(' ')[0], initials: r.people[0] ?? '?' }
      : { name: r.people[0] ?? 'Employee', first: 'there', initials: r.people[0] ?? '?' },
    messages: [
      { id: uid('m'), t: clock(), from: 'system', text: pic.name + ' opened this room' },
      { id: uid('m'), t: clock(), from: 'pic', text: i > 0 && i < 20 ? r.last.slice(i + 2) : r.last },
    ],
  };
}

/** The room as the tables show it: status plus the latest message line. */
function withLatest(r: RoomRecord): Room {
  const last = r.messages.filter((m) => m.from !== 'system').slice(-1)[0];
  if (!last) return r.room;
  const who = last.from === 'pic' ? r.pic.first : last.from === 'manager' ? 'Rachel' : r.employee.first === 'there' ? r.employee.name : r.employee.first;
  return { ...r.room, last: who + ': ' + last.text };
}

type AppState = ReturnType<typeof useAppStateValue>;
const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const value = useAppStateValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppStateProvider>');
  return v;
}
