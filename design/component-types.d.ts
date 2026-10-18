// ReadyCheck — component types (documentation). Global: window.ReadyCheck
import * as React from 'react';

export type CardState = 'idle' | 'solved' | 'escalating';
export interface Rect { x: number; y: number; w: number; h: number; }
export interface Expert { name: string; initials: string; eta: string; }

export interface KnowledgeCanvasProps {
  /** Canvas height in px. Width fills the parent. Default 860. */
  height?: number;
  /** First name used in the greeting and top bar. Default "Mira". */
  userName?: string;
  /** Chips under the omni bar at rest. */
  suggestions?: { label: string; query?: string; icon?: string }[];
  /** Run this query on mount (used by the DesignView1 showcase). */
  autoQuery?: string;
  /** How long skeletons show before cards land, in ms. Default 950. */
  assembleMs?: number;
  /** How many cards an answer shows. Default 1: only the best match. */
  maxCards?: number;
  /** Escalations already on the dashboard. */
  initialEscalations?: DashboardItem[];
}

export interface OmniBarProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onSubmit?: (query: string) => void;
  /** Shows "Assembling cards" and the scan line. */
  busy?: boolean;
  /** 56px height once results are on the canvas. */
  compact?: boolean;
  suggestions?: ({ label: string; query?: string; icon?: string } | string)[];
  /** Bind ⌘K / Ctrl+K to focus. Default true. */
  hotkey?: boolean;
  autoFocus?: boolean;
  /** Files added to the question. With onAttach, an "Add" button replaces the ⌘K hint and chips show under the bar. */
  attachments?: { id: string; name: string; size?: number; kind: 'image' | 'file'; url?: string }[];
  /** Called with the chosen photos or documents (images, PDF, Word, Excel, PowerPoint, text, CSV). */
  onAttach?: (files: FileList) => void;
  onRemoveAttachment?: (id: string) => void;
}

export interface ActionCardProps {
  kind?: 'video' | 'doc' | 'steps' | 'answer';
  kindLabel?: string;
  title: string;
  source?: string;
  /** Copyable value top-right: a duration, a page count, progress. */
  meta?: string;
  state?: CardState;
  onSolved?: () => void;
  onEscalate?: () => void;
  onUndo?: () => void;
  /** false hides the feedback bar. */
  feedback?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export interface VideoCardProps extends Omit<ActionCardProps, 'kind' | 'meta'> {
  /** Seconds. */
  duration: number;
  chapters?: { t: number; label: string }[];
  startAt?: number;
  autoPlay?: boolean;
}

export interface DocSummaryCardProps extends Omit<ActionCardProps, 'kind' | 'meta'> {
  file: string;
  pages: number;
  updated?: string;
  points: { text: string; page?: number }[];
  /** Points shown before "Show all". Default 3. */
  collapsedCount?: number;
}

export interface ChecklistCardProps extends Omit<ActionCardProps, 'kind' | 'meta'> {
  steps: { label: string; detail?: string }[];
  /** Indexes already done. */
  done?: number[];
}

export interface FeedbackBarProps {
  state?: CardState;
  prompt?: string;
  solvedText?: string;
  onSolved?: () => void;
  onEscalate?: () => void;
  onUndo?: () => void;
}

export interface EscalationFlightProps {
  /** The card's rect within the overlay's positioned container. */
  from: Rect;
  /** The dock's rect within the same container. */
  to: Rect;
  ticket: { id: string; title: string; queue?: string };
  card?: { kind?: ActionCardProps['kind']; kindLabel?: string; title: string };
  morphMs?: number;
  flightMs?: number;
  onArrive?: () => void;
  onDone?: () => void;
}

export interface TicketChipProps { id: string; title: string; queue?: string; className?: string; }

export interface EscalatedReceiptProps {
  id: string;
  title: string;
  queue?: string;
  expert?: Expert;
  status?: 'routing' | 'picked';
  onAddContext?: () => void;
  onOpenDashboard?: () => void;
}

export interface DashboardItem { id: string; title: string; status?: string; assigned?: boolean; }
export interface DashboardDockProps {
  items?: DashboardItem[];
  team?: string;
  /** Force the drawer open (it also opens on hover). */
  open?: boolean;
  /** Increment on each landing to replay the impact ring. */
  pulse?: number;
}

export interface GlassPanelProps extends React.HTMLAttributes<HTMLElement> { level?: 1 | 2 | 3; as?: string; }
export interface IconProps { name: string; size?: number; strokeWidth?: number; label?: string; className?: string; }

export declare const KnowledgeCanvas: React.FC<KnowledgeCanvasProps>;
export declare const OmniBar: React.FC<OmniBarProps>;
export declare const ActionCard: React.ForwardRefExoticComponent<ActionCardProps & React.RefAttributes<HTMLElement>>;
export declare const VideoCard: React.ForwardRefExoticComponent<VideoCardProps & React.RefAttributes<HTMLElement>>;
export declare const DocSummaryCard: React.ForwardRefExoticComponent<DocSummaryCardProps & React.RefAttributes<HTMLElement>>;
export declare const ChecklistCard: React.ForwardRefExoticComponent<ChecklistCardProps & React.RefAttributes<HTMLElement>>;
export declare const FeedbackBar: React.FC<FeedbackBarProps>;
export declare const EscalationFlight: React.FC<EscalationFlightProps>;
export declare const TicketChip: React.FC<TicketChipProps>;
export declare const EscalatedReceipt: React.FC<EscalatedReceiptProps>;
export declare const DashboardDock: React.ForwardRefExoticComponent<DashboardDockProps & React.RefAttributes<HTMLElement>>;
export declare const GlassPanel: React.FC<GlassPanelProps>;
export declare const Icon: React.FC<IconProps> & { names: string[] };
/** Rect of `el` relative to `root`, for EscalationFlight. */
export declare function rectWithin(el: Element, root: Element): Rect;

// ---------- Design View 2: Theme Command Center ----------
export type ThemeState = 'urgent' | 'waiting' | 'room' | 'calm';
export interface Theme {
  key: string; name: string; short: string;
  /** Employees who asked today. */ count: number;
  /** How many of them a card solved. */ cards: number;
  /** Change against yesterday. */ trend: number;
  /** Questions per day over the last 7 days, Mon to Sun (7 values). The previous 7 days are derived from count - trend. */ days: number[];
  people: string[]; summary: string; asked: string[];
}
export interface Pic { id: string; name: string; first: string; initials: string; team: string; skills: string; }
export interface QueueTicket { id: string; person: string; first: string; initials: string; role: string; theme: string; /** minutes */ wait: number; from: string; slug: string; q: string; leaving?: boolean; }
export interface Room { id: string; /** Ticket number shown in Ticket room, e.g. "RC-1044". */ ticket?: string; /** Every ticket the room covers. */ tickets?: string[]; name: string; theme: string; pic: string; people: string[]; status: 'live' | 'waiting' | 'resolved'; /** minutes */ elapsed: number; last: string; isNew?: boolean; }

export interface CommandCenterProps { height?: number; /** Tab shown first. Default "home". */ tab?: 'home' | 'needs' | 'rooms' | 'trends' | 'knowledge' | 'team'; view?: 'bubbles' | 'heatmap'; /** Theme key selected at start. Default "db". */ selected?: string; /** Teams and experts the manager added earlier (saved by the host). */ initialTeam?: SavedTeams; /** Called with the full saved shape whenever a team or expert is added or removed. */ onTeamChange?: (next: SavedTeams) => void; }
export interface ThemeMapProps { view?: 'bubbles' | 'heatmap'; themes: Theme[]; queue?: QueueTicket[]; rooms?: Room[]; pics?: Pic[]; selected?: string; onSelect?: (key: string) => void; /** An expert is being dragged or picked. */ dragging?: boolean; /** The drop key under the pointer, e.g. "theme:db". */ over?: string | null; }
export interface ThemeDetailProps { theme: Theme; queue?: QueueTicket[]; rooms?: Room[]; pics?: Pic[]; dragging?: boolean; over?: string | null; }
export interface EscalationQueueProps { tickets: QueueTicket[]; themes?: Theme[]; dragging?: boolean; over?: string | null; onSelect?: (t: QueueTicket) => void; solvedByCards?: number; solvedByExperts?: number; }
export interface PICRosterProps { pics: Pic[]; /** Active rooms per expert id. */ load?: Record<string, number>; picked?: string | null; dragId?: string | null; onGrab?: (e: React.PointerEvent, pic: Pic) => void; onPick?: (pic: Pic) => void; }
export interface PicAvatarProps { pic: Pic; size?: number; className?: string; }
export interface RoomGridProps { rooms: Room[]; pics?: Pic[]; themes?: Theme[]; /** Tiles shown. Default 4 (one row). */ max?: number; onViewAll?: () => void; }
export interface RoomTileProps { room: Room; pic?: Pic; theme?: Theme; }

export declare const CommandCenter: React.FC<CommandCenterProps>;
export declare const ThemeMap: React.FC<ThemeMapProps>;
export declare const ThemeDetail: React.FC<ThemeDetailProps>;
export declare const EscalationQueue: React.FC<EscalationQueueProps>;
export declare const PICRoster: React.FC<PICRosterProps>;
export declare const PicAvatar: React.FC<PicAvatarProps>;
export declare const RoomGrid: React.FC<RoomGridProps>;
export declare const RoomTile: React.FC<RoomTileProps>;
export declare const commandData: { themes: Theme[]; pics: Pic[]; queue: QueueTicket[]; rooms: Room[]; sla: number };

// ---------- Knowledge base review ----------
export type KbStatus = 'review' | 'live' | 'discarded';
export interface KbItem {
  id: string; roomId: string; roomName: string; theme: string; title: string; problem?: string;
  /** One string per step. */ steps: string[];
  pic: { id: string; name: string; first: string; initials: string; team: string }; employee: string;
  status: KbStatus; at?: string;
  /** True once a manager has edited the title, problem or steps. */ edited?: boolean;
  /** Why a manager discarded it. Cleared on restore. */ discardReason?: string;
  /** True when a manager wrote it from the New material form. */ manual?: boolean;
  /** Photos or documents attached to the material. */ files?: { name: string; kind: 'image' | 'file'; size?: number }[];
}
export interface KbCardProps {
  kb: KbItem; compact?: boolean;
  /** Shows Approve while status is "review". */ onApprove?: (id: string) => void;
  /** Shows Edit (title, problem, steps). Review cards get Save draft and Approve; live cards get Save changes. */ onEdit?: (id: string, patch: Pick<KbItem, 'title' | 'problem' | 'steps'>) => void;
  /** With onEdit, Discard first asks for a reason. */ onDiscard?: (id: string, reason: string) => void;
  /** Shows Restore on a discarded card; it returns to review. */ onRestore?: (id: string) => void;
}
export declare const KbCard: React.FC<KbCardProps>;

// ---------- Ticket room and Trends ----------
export interface TicketRoomsProps { rooms: Room[]; pics?: Pic[]; /** Called when a row is clicked. */ onOpen?: (room: Room) => void; }
export declare const TicketRooms: React.FC<TicketRoomsProps>;
export interface ThemeTrendsProps { /** Time frame shown first. Default "monthly". */ frame?: 'daily' | 'monthly' | 'all'; }
export declare const ThemeTrends: React.FC<ThemeTrendsProps>;

// ---------- Expert team ----------
export interface ExpertTeamGroup { name: string; /** Theme keys: db, vpn, onb, exp, pay, mfa, leave, hw, ben. */ covers: string[]; experts: Array<Pic & { custom?: boolean }>; /** True for a team the manager added. */ custom?: boolean; }
export interface SavedTeams { teams: Array<{ id: string; name: string; covers: string[] }>; experts: Array<Pic & { custom: true; covers: string[] }>; }
export interface ExpertTeamProps {
  teams: ExpertTeamGroup[];
  /** Active rooms per expert id. */ load?: Record<string, number>;
  /** Leave a handler out to hide its control. */
  onAddTeam?: (form: { name: string; covers: string[]; people: string[] }) => void;
  onAddExpert?: (teamName: string, name: string) => void;
  onRemoveExpert?: (id: string) => void;
  onRemoveTeam?: (name: string) => void;
}
export declare const ExpertTeam: React.FC<ExpertTeamProps>;

// ---------- Home ----------
export interface HomeOverviewProps {
  /** People waiting on the manager. Shows the jump strip to the Needs you tab when above 0. */ waiting?: number;
  onOpenNeeds?: () => void;
  pics?: Pic[];
}
export declare const HomeOverview: React.FC<HomeOverviewProps>;
