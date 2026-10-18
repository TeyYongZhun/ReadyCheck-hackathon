// Everything that happens after "Need human expert": the ticket chip, the flight, the receipt and the dock.
import { forwardRef, useEffect, useRef, useState } from 'react';
import type { CardKind, DashboardItem, Expert } from '../../types';
import { cx, prefersReducedMotion } from '../../lib/util';
import { Icon } from '../primitives';
import { KIND } from './ActionCard';

export interface Rect { x: number; y: number; w: number; h: number }

export function rectWithin(el: Element, root: Element): Rect {
  const r = el.getBoundingClientRect();
  const o = root.getBoundingClientRect();
  return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
}

export function TicketChip({ id, title, queue }: { id: string; title: string; queue?: string }) {
  return (
    <div className="rc-ticket">
      <span className="rc-ticket-icon"><Icon name="expert" size={17} /></span>
      <span className="rc-ticket-notch" aria-hidden />
      <div className="rc-ticket-body">
        <div className="rc-ticket-id">{id + (queue ? ' · ' + queue : '')}</div>
        <div className="rc-ticket-title">{title}</div>
      </div>
    </div>
  );
}

interface FlightProps {
  from: Rect; to: Rect;
  ticket: { id: string; title: string; queue?: string };
  card: { kind: CardKind; title: string };
  onArrive: () => void; onDone: () => void;
}

/** Fold the card into a ticket (560ms), arc it to the dock (980ms), pulse a ring on landing. */
export function EscalationFlight({ from: f, to: t, ticket, card, onArrive, onDone }: FlightProps) {
  const ghost = useRef<HTMLDivElement>(null), cardL = useRef<HTMLDivElement>(null), ticketL = useRef<HTMLDivElement>(null);
  const maskP = useRef<SVGPathElement>(null), trail = useRef<SVGSVGElement>(null), ring = useRef<HTMLSpanElement>(null);
  const maskId = useRef('rcf' + Math.random().toString(36).slice(2, 7)).current;
  const cb = useRef({ onArrive, onDone }); cb.current = { onArrive, onDone };
  const TW = 264, TH = 60;
  const sx = f.x + f.w / 2, sy = f.y + f.h / 2, ex = t.x + t.w / 2, ey = t.y + t.h / 2;
  const qx = sx + (ex - sx) * 0.2, qy = Math.min(sy, ey) - Math.max(120, Math.abs(ex - sx) * 0.22);
  const d = `M${sx} ${sy} Q${qx} ${qy} ${ex} ${ey}`;

  useEffect(() => {
    const g = ghost.current!, anims: Animation[] = [], timers: number[] = [];
    const run = (el: Element, kf: Keyframe[], o: KeyframeAnimationOptions) => { const a = el.animate(kf, o); anims.push(a); return a; };
    if (prefersReducedMotion() || !g.animate) {
      timers.push(window.setTimeout(() => cb.current.onArrive(), 200));
      timers.push(window.setTimeout(() => cb.current.onDone(), 500));
      return () => timers.forEach(clearTimeout);
    }
    const M = 560, FL = 980, D = M + 60;
    run(g, [
      { left: f.x + 'px', top: f.y + 'px', width: f.w + 'px', height: f.h + 'px', borderRadius: '24px' },
      { offset: 0.6, left: sx - TW / 2 - 10 + 'px', top: sy - TH / 2 - 6 + 'px', width: TW + 20 + 'px', height: TH + 12 + 'px', borderRadius: '22px' },
      { left: sx - TW / 2 + 'px', top: sy - TH / 2 + 'px', width: TW + 'px', height: TH + 'px', borderRadius: '16px' },
    ], { duration: M, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' });
    run(cardL.current!, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.92)' }], { duration: 240, delay: 80, fill: 'forwards', easing: 'ease-in' });
    run(ticketL.current!, [{ opacity: 0, transform: 'scale(.86)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 300, delay: 260, fill: 'forwards', easing: 'cubic-bezier(.2,.9,.3,1.3)' });
    const N = 30, kf: Keyframe[] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, iu = 1 - u;
      const x = iu * iu * sx + 2 * iu * u * qx + u * u * ex, y = iu * iu * sy + 2 * iu * u * qy + u * u * ey;
      const dx = 2 * iu * (qx - sx) + 2 * u * (ex - qx), dy = 2 * iu * (qy - sy) + 2 * u * (ey - qy);
      const tilt = Math.max(-16, Math.min(16, (Math.atan2(dy, Math.abs(dx) + 0.001) * 180) / Math.PI * 0.35)) * (dx < 0 ? -1 : 1);
      const s = 1 - 0.7 * u * u;
      kf.push({ transform: `translate(${(x - sx).toFixed(1)}px,${(y - sy).toFixed(1)}px) rotate(${tilt.toFixed(1)}deg) scale(${s.toFixed(3)})`, opacity: u < 0.82 ? 1 : Math.max(0, 1 - (u - 0.82) / 0.18) });
    }
    const fly = run(g, kf, { duration: FL, delay: D, easing: 'cubic-bezier(.5,0,.25,1)', fill: 'forwards' });
    const mp = maskP.current!, L = mp.getTotalLength ? mp.getTotalLength() : 1000;
    mp.style.strokeDasharray = `${L} ${L}`; mp.style.strokeDashoffset = String(L);
    run(mp, [{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: FL, delay: D, easing: 'cubic-bezier(.5,0,.25,1)', fill: 'forwards' });
    run(trail.current!, [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: FL + 600, delay: D, fill: 'forwards' });
    fly.onfinish = () => {
      cb.current.onArrive();
      run(ring.current!, [{ opacity: 0.9, transform: 'translate(-50%,-50%) scale(.3)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(2.6)' }], { duration: 640, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
      timers.push(window.setTimeout(() => cb.current.onDone(), 700));
    };
    return () => { timers.forEach(clearTimeout); anims.forEach((a) => { try { a.cancel(); } catch { /* already gone */ } }); };
    // Runs once per flight; the parent remounts it with a new key.
  }, []);

  const k = KIND[card.kind];
  return (
    <div className="rc-flight" aria-live="polite">
      <svg className="rc-flight-trail" ref={trail} aria-hidden>
        <defs><mask id={maskId} maskUnits="userSpaceOnUse"><path ref={maskP} d={d} stroke="#fff" strokeWidth={8} fill="none" strokeLinecap="round" /></mask></defs>
        <path d={d} className="rc-flight-path" mask={`url(#${maskId})`} />
      </svg>
      <div ref={ghost} className="rc-flight-ghost" style={{ left: f.x, top: f.y, width: f.w, height: f.h }}>
        <div ref={cardL} className="rc-flight-card">
          <span className="rc-card-kind"><Icon name={k.icon} size={14} />{k.label}</span>
          <div className="rc-card-title">{card.title}</div>
        </div>
        <div ref={ticketL} className="rc-flight-ticket"><TicketChip {...ticket} /></div>
      </div>
      <span ref={ring} className="rc-flight-ring" style={{ left: ex, top: ey }} />
      <span className="rc-sr">Sending {ticket.title} to the support team</span>
    </div>
  );
}

interface ReceiptProps {
  id: string; title: string; queue?: string; expert?: Expert;
  status: 'routing' | 'picked' | 'resolved';
  roomName?: string;
  onAddContext?: () => void; onOpenRoom?: () => void;
}

/** What stays in the card's slot after it flies away. */
export function EscalatedReceipt(p: ReceiptProps) {
  const picked = p.status !== 'routing', done = p.status === 'resolved';
  const ex = picked && p.expert ? p.expert : { name: 'Assigning an expert', initials: '…', eta: '' };
  const sub = done ? 'Solved together in ' + p.roomName
    : p.roomName ? `Joined your room ${p.roomName}. Ask anything there.`
    : picked ? 'Picked up your question · usually replies in ' + ex.eta
    : 'A manager is choosing the right person on shift…';
  return (
    <div className={cx('rc-receipt', p.roomName && !done && 'has-room', done && 'is-done')} role="status">
      <div className="rc-receipt-head">
        <span className="rc-receipt-tag"><Icon name="route" size={15} />Sent to the support team</span>
        <span className="rc-receipt-id">{p.id}</span>
      </div>
      <div className="rc-receipt-title">{p.title}</div>
      <div className="rc-receipt-person">
        <span className="rc-avatar">{ex.initials}</span>
        <div>
          <div className="rc-receipt-name">{ex.name + (picked && p.queue ? ' · ' + p.queue : '')}</div>
          <div className="rc-receipt-sub">{sub}</div>
        </div>
      </div>
      <ol className="rc-receipt-track">
        <li className="is-done">Sent</li>
        <li className={picked ? 'is-done' : 'is-now'}>Picked up</li>
        <li className={done ? 'is-done' : picked ? 'is-now' : ''}>Answered here</li>
      </ol>
      <div className="rc-receipt-actions">
        <button type="button" className="rc-quiet" onClick={p.onAddContext}><Icon name="plus" size={14} />Add context</button>
        {p.onOpenRoom ? (
          <button type="button" className={cx('rc-room-btn', done && 'is-done')} onClick={p.onOpenRoom}>{done ? 'View room' : 'Open room'}<Icon name="chevron" size={14} /></button>
        ) : <span className="rc-receipt-sub">Tracked in My tickets, top right</span>}
      </div>
    </div>
  );
}

interface DockProps { items: DashboardItem[]; open?: boolean; pulse?: number; onOpenRoom?: (roomId: string) => void }

function dockSummary(items: DashboardItem[]): string {
  if (!items.length) return 'None yet · help from a person';
  const waiting = items.filter((i) => i.state === 'waiting').length, live = items.filter((i) => i.state === 'live').length;
  const parts = [waiting ? `${waiting} waiting` : '', live ? `${live} with an expert` : ''].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'All solved';
}

/** "My tickets": the employee's own escalations, top-right of the canvas. Tickets fly here; live ones open their room. */
export const DashboardDock = forwardRef<HTMLElement, DockProps>(function DashboardDock(p, ref) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = p.open || hover || pinned;
  const openCount = p.items.filter((i) => i.state !== 'solved').length;
  const box = useRef<HTMLElement | null>(null);
  // A click-opened drawer (touch screens, keyboard) closes on any tap or click outside it.
  useEffect(() => {
    if (!pinned) return;
    const off = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setPinned(false); };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [pinned]);
  return (
    <aside ref={(el) => { box.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el; }}
      aria-label="My tickets" className={cx('rc-dock rc-glass rc-glass-2', open && 'is-open')}
      // Moving the cursor away always closes it, even if it was opened by a click.
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPinned(false); }}>
      <button type="button" className="rc-dock-head rc-dock-toggle" aria-expanded={open} onClick={() => setPinned(!pinned)}>
        <span className="rc-dock-icon"><Icon name="expert" size={16} /></span>
        <span className="rc-dock-text">
          <span className="rc-dock-title">My tickets</span>
          <span className="rc-dock-sub">{dockSummary(p.items)}</span>
        </span>
        <span key={'c' + openCount} className={cx('rc-dock-count', !openCount && 'is-zero')} aria-label={openCount + ' open'}>{openCount}</span>
      </button>
      <div className="rc-dock-drawer">
        {p.items.length ? (
          <ul className="rc-dock-list">
            {p.items.slice(0, 5).map((it) => {
              const row = (
                <>
                  <span className={cx('rc-dock-dot', 'is-' + it.state)} />
                  <span className="rc-dock-id">{it.id}</span>
                  <span className="rc-dock-it">{it.title}</span>
                  <span className={cx('rc-dock-st', 'is-' + it.state)}>{it.status}</span>
                </>
              );
              return (
                <li key={it.id}>
                  {it.roomId && p.onOpenRoom
                    ? <button type="button" className="rc-dock-item rc-dock-link" onClick={() => p.onOpenRoom!(it.roomId!)} title="Open the room">{row}</button>
                    : <div className="rc-dock-item">{row}</div>}
                </li>
              );
            })}
          </ul>
        ) : <div className="rc-dock-empty">No tickets yet. If a card doesn’t solve it, tap <b>Need human expert</b> and it lands here.</div>}
      </div>
      <span key={'r' + (p.pulse ?? 0)} className={cx('rc-dock-ring', p.pulse && 'is-hit')} aria-hidden />
    </aside>
  );
});
