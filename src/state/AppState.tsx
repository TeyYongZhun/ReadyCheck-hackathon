// Shared state for both views: escalations flow employee → manager, rooms flow back.
// Everything is in-memory for now. TODO: persist to localStorage key `readycheck.session.v1`
// (history, incoming, assignments, rooms, knowledge, team) like the design export does, or move to a backend.
import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Attachment, CardKind, HistoryEntry, KbItem, Message, Mode, Pic, QueueTicket, Room, ThemeKey } from '../types';
import { PICS, QUEUE, ROOMS, SEED_KB, THEMES_BY_KEY } from '../data/command';
import { askRoomReply, askSummary } from '../lib/api';
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
  /** "ask": the expert thinks it's fixed, so the employee is asked to confirm. */
  feedback?: 'ask' | null;
}

export interface EscalationInput {
  id: string; title: string; query: string; kind: CardKind; theme: ThemeKey; entryId: string | null;
  files: Pick<Attachment, 'name' | 'kind'>[];
}

const ME = { person: 'Mira Tan', first: 'Mira', initials: 'MT', role: 'Product Designer · Day 3' };

function useAppStateValue() {
  const [mode, setMode] = useState<Mode>(location.hash === '#manager' ? 'manager' : 'employee');
  const [queue, setQueue] = useState<QueueTicket[]>(() => QUEUE.map((q) => ({ ...q })));
  const [mine, setMine] = useState<string[]>([]); // ticket ids raised from this employee canvas
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [rooms, setRooms] = useState<Record<string, RoomRecord>>(() => Object.fromEntries(ROOMS.map((r) => [r.id, seedRecord(r)])));
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [knowledge, setKnowledge] = useState<KbItem[]>(() => SEED_KB.map((k) => ({ ...k })));
  const [experts, setExperts] = useState<Pic[]>(PICS);
  const [openRoom, setOpenRoom] = useState<{ id: string; viewer: Mode } | null>(null);
  const roomsRef = useRef(rooms); roomsRef.current = rooms;
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

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
      push(roomId, { from: 'system', text: 'AI expert unavailable right now. Try sending again in a moment.' });
      return;
    }
    push(roomId, { from: 'pic', text: res.reply, ai: true });
    if (res.solved) setFeedback(roomId, 'ask');
  }

  /** Employee tapped "Need human expert". */
  function escalate(e: EscalationInput) {
    const theme = e.theme;
    const t: QueueTicket = {
      id: e.id, title: e.title, ...ME, theme, wait: 0, isNew: true, from: e.kind + ' card',
      slug: theme + '-' + slugify(ME.first) + '-' + e.id.replace(/\D/g, '').slice(-2),
      q: (e.query ? `“${e.query}” ` : '') + 'Card shown: ' + e.title + '.', files: e.files,
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
    setQueue((l) => l.map((x) => (ids.includes(x.id) ? { ...x, leaving: true } : x)));
    later(() => setQueue((l) => l.filter((x) => !ids.includes(x.id))), 420);
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
    const msg: Message = { id: uid('m'), t: clock(), from: viewer === 'manager' ? 'pic' : 'employee', text };
    setRooms((s) => s[roomId] ? { ...s, [roomId]: { ...s[roomId], feedback: null, messages: [...s[roomId].messages, msg] } } : s);
    // Only the employee gets an automatic expert reply; when the manager types, they are the expert.
    if (viewer === 'employee') void expertTurn(roomId, [...rec.messages, msg]);
  }

  /** Employee's answer to "Did {expert} solve your problem?". */
  function answerFeedback(roomId: string, solved: boolean) {
    const rec = rooms[roomId]; if (!rec) return;
    if (solved) { void resolve(roomId, employeeName(rec)); return; }
    send(roomId, 'employee', 'Not yet, it’s still not working.');
  }

  /** Close the room, then have Gemini turn the conversation into a knowledge-base draft for manager review. */
  async function resolve(roomId: string, by: string) {
    const rec = rooms[roomId]; if (!rec) return;
    setRooms((s) => ({ ...s, [roomId]: { ...s[roomId], feedback: null, room: { ...s[roomId].room, status: 'resolved' } } }));
    push(roomId, { from: 'system', text: 'Marked solved by ' + by });
    setAssignments((a) => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v.roomId === roomId ? { ...v, status: 'resolved' as const } : v])));
    setTyping(roomId, 'ai');
    const sum = await askSummary({ roomName: rec.room.name, pic: persona(rec.pic), employee: employeeName(rec), ticket: ticketContext(rec.ticket), messages: chatLines(rec.messages) });
    if (!sum) {
      push(roomId, { from: 'system', text: 'AI summary unavailable, so nothing was added to the knowledge base.' });
      return;
    }
    const kb: KbItem = {
      id: uid('kb'), roomId, roomName: rec.room.name, theme: rec.room.theme, title: sum.title, problem: sum.problem, steps: sum.steps,
      pic: rec.pic, employee: employeeName(rec), status: 'review', at: clock(),
    };
    setKnowledge((l) => [kb, ...l]);
    push(roomId, { from: 'system', kind: 'kb', kbId: kb.id, text: 'AI summary added to the knowledge base' });
  }

  function reopen(roomId: string, by: string) {
    setRooms((s) => ({ ...s, [roomId]: { ...s[roomId], room: { ...s[roomId].room, status: 'live' } } }));
    push(roomId, { from: 'system', text: 'Reopened by ' + by });
  }

  const kb = {
    approve: (id: string) => setKnowledge((l) => l.map((x) => (x.id === id ? { ...x, status: 'live' } : x))),
    discard: (id: string, reason: string) => setKnowledge((l) => l.map((x) => (x.id === id ? { ...x, status: 'discarded', discardReason: reason } : x))),
    restore: (id: string) => setKnowledge((l) => l.map((x) => (x.id === id ? { ...x, status: 'review', discardReason: '' } : x))),
    edit: (id: string, patch: Pick<KbItem, 'title' | 'problem' | 'steps'>) => setKnowledge((l) => l.map((x) => (x.id === id ? { ...x, ...patch, edited: true } : x))),
    add: (item: KbItem) => setKnowledge((l) => [item, ...l]),
  };

  const history_ = {
    add: (e: HistoryEntry) => setHistory((l) => [e, ...l].slice(0, 40)),
    setState: (id: string, state: HistoryEntry['state']) => setHistory((l) => l.map((x) => (x.id === id && x.state !== 'escalated' ? { ...x, state } : x))),
    clear: () => setHistory([]),
  };

  const roomList = useMemo(() => Object.values(rooms).map((r) => withLatest(r)), [rooms]);
  const load = useMemo(() => {
    const m: Record<string, number> = {};
    roomList.forEach((r) => { if (r.status !== 'resolved') m[r.pic] = (m[r.pic] ?? 0) + 1; });
    return m;
  }, [roomList]);

  return {
    mode, go, queue, mine, assignments, rooms, roomList, load, history: history_, historyItems: history, knowledge, kb,
    experts, setExperts, openRoom, setOpenRoom, escalate, assignTheme, send, answerFeedback, resolve, reopen,
  };
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
    employee: { name: r.people[0] ?? 'Employee', first: 'there', initials: r.people[0] ?? '?' },
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
  const who = last.from === 'pic' ? r.pic.first : r.employee.first === 'there' ? r.employee.name : r.employee.first;
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
