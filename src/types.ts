// Shared domain types. Mirrors design/component-types.d.ts from the Claude Design export.

export type Mode = 'employee' | 'manager';
export type CardKind = 'video' | 'doc' | 'steps' | 'answer';
export type CardState = 'idle' | 'solved' | 'escalating' | 'routing' | 'escalated';

export interface Attachment { id: string; name: string; size?: number; kind: 'image' | 'file'; url?: string }

export interface Chapter { t: number; label: string }
export interface DocPoint { text: string; page?: number }
export interface Step { label: string; detail?: string }

export interface VideoCardData { title: string; source?: string; kindLabel?: string; duration: number; chapters?: Chapter[] }
export interface DocCardData { title: string; source?: string; kindLabel?: string; file: string; pages: number; updated?: string; points: DocPoint[] }
export interface StepsCardData { title: string; source?: string; kindLabel?: string; steps: Step[]; done?: number[] }

export type CardSpec =
  | { id: string; type: 'video'; props: VideoCardData }
  | { id: string; type: 'doc'; props: DocCardData }
  | { id: string; type: 'steps'; props: StepsCardData };

export interface Expert { name: string; initials: string; eta: string }

export interface Scenario {
  key: string;
  match: RegExp;
  heading: string;
  queue: string;
  expert: Expert;
  cards: CardSpec[];
}

export interface DashboardItem { id: string; title: string; status?: string; assigned?: boolean }

export type ThemeKey = 'db' | 'vpn' | 'onb' | 'exp' | 'pay' | 'mfa' | 'leave' | 'hw' | 'ben';

export interface Theme {
  key: ThemeKey;
  name: string;
  short: string;
  /** Employees who asked. */
  count: number;
  /** How many of them a card solved. */
  cards: number;
  trend: number;
  /** Questions per day, Mon to Sun. */
  days: number[];
  people: string[];
  summary: string;
  asked: string[];
}

export interface Pic { id: string; name: string; first: string; initials: string; team: string; skills: string; covers: string[]; custom?: boolean }

export interface QueueTicket {
  id: string; person: string; first: string; initials: string; role: string; theme: ThemeKey;
  /** Minutes waiting. */
  wait: number;
  from: string; slug: string; q: string;
  title?: string;
  files?: Pick<Attachment, 'name' | 'kind'>[];
  isNew?: boolean; leaving?: boolean;
}

export type RoomStatus = 'live' | 'waiting' | 'resolved';
export interface Room {
  id: string; ticket?: string; tickets?: string[]; name: string; theme: ThemeKey; pic: string; people: string[];
  status: RoomStatus;
  /** Minutes since opened. */
  elapsed: number;
  last: string; isNew?: boolean;
}

export type MessageFrom = 'pic' | 'employee' | 'system';
export interface Message { id: string; from: MessageFrom; t: string; text: string; kind?: 'kb' | 'booked'; kbId?: string }

export type KbStatus = 'review' | 'live' | 'discarded';
export interface KbItem {
  id: string; roomId: string | null; roomName: string; theme: ThemeKey; title: string; problem?: string; steps: string[];
  pic: Pick<Pic, 'id' | 'name' | 'first' | 'initials' | 'team'>; employee: string;
  status: KbStatus; at?: string; edited?: boolean; discardReason?: string; manual?: boolean;
  files?: Pick<Attachment, 'name' | 'kind' | 'size'>[];
}

export interface HistoryEntry {
  id: string; query: string; scen: string; cardType: CardKind; title: string; heading: string; at: string;
  state: 'viewed' | 'solved' | 'escalated'; ticketId?: string; files?: Pick<Attachment, 'name' | 'kind'>[];
}

export type ManagerTab = 'home' | 'needs' | 'rooms' | 'trends' | 'knowledge' | 'team';
