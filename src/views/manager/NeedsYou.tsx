import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Pic, QueueTicket, Theme } from '../../types';
import { SLA_MINUTES } from '../../data/command';
import { cx, plural } from '../../lib/util';
import { AiLabel, Footnote, Icon, PicAvatar, Person } from '../../components/primitives';

export interface NeedsGroup {
  theme: Theme; tickets: QueueTicket[]; active: number; oldest: number; overdue: boolean; leaving: boolean;
  /** Gemini's summary of the waiting questions; falls back to the theme's sample summary. */
  summary?: string;
}

function ExpertMenu({ pics, load, suggested, onPick }: { pics: Pic[]; load: Record<string, number>; suggested: string; onPick: (p: Pic) => void }) {
  const list = useRef<HTMLUListElement>(null), first = useRef<HTMLButtonElement>(null);
  const [up, setUp] = useState(false);
  useLayoutEffect(() => {
    const r = list.current?.getBoundingClientRect(); if (!r) return;
    if (r.bottom > window.innerHeight - 12 && r.top - 120 > window.innerHeight - r.top) setUp(true);
  }, []);
  useEffect(() => { first.current?.focus({ preventScroll: true }); }, []);
  return (
    <ul ref={list} className={cx('rc-menu rc-glass rc-glass-3', up && 'is-up')} role="menu" aria-label="Choose an expert">
      {pics.map((pic, i) => (
        <li key={pic.id} role="none">
          <button ref={i === 0 ? first : null} type="button" role="menuitem" className="rc-menu-i" onClick={() => onPick(pic)}>
            <PicAvatar pic={pic} size={32} />
            <span className="rc-menu-b">
              <span className="rc-menu-n">{pic.name}{pic.id === suggested ? <AiLabel>Suggested</AiLabel> : null}</span>
              <span className="rc-menu-s">{pic.team} · {pic.skills}</span>
            </span>
            <span className="rc-menu-l">{plural(load[pic.id] ?? 0, 'room', 'rooms')}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** "Assign Marcus" + "Choose another". One click opens a room. */
export function AssignControl({ suggested, pics, load, disabled, onAssign }: { suggested: Pic; pics: Pic[]; load: Record<string, number>; disabled?: boolean; onAssign: (p: Pic) => void }) {
  const wrap = useRef<HTMLDivElement>(null), btn = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (!menu) return;
    const off = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setMenu(false); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(false); btn.current?.focus(); } };
    document.addEventListener('pointerdown', off); window.addEventListener('keydown', k);
    return () => { document.removeEventListener('pointerdown', off); window.removeEventListener('keydown', k); };
  }, [menu]);
  const go = (pic: Pic) => { setMenu(false); onAssign(pic); };
  return (
    <div className="rc-assign">
      <div className="rc-assign-row" ref={wrap}>
        <button ref={btn} type="button" className="rc-btn-primary" disabled={disabled} onClick={() => go(suggested)}><PicAvatar pic={suggested} size={28} />Assign {suggested.first}</button>
        <button type="button" className="rc-btn-ghost" disabled={disabled} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>Choose another<Icon name="chevron" size={14} className="rc-chev-down" /></button>
        {menu ? <ExpertMenu pics={pics} load={load} suggested={suggested.id} onPick={go} /> : null}
      </div>
      <p className="rc-assign-why"><AiLabel>Suggested expert</AiLabel>{suggested.team} · {plural(load[suggested.id] ?? 0, 'active room', 'active rooms')}</p>
    </div>
  );
}

export function NeedsCard({ group: g, suggested, pics, load, onAssign }: { group: NeedsGroup; suggested: Pic; pics: Pic[]; load: Record<string, number>; onAssign: (p: Pic) => void }) {
  const t = g.theme;
  return (
    <article className={cx('rc-need', g.overdue && 'is-overdue', g.leaving && 'is-leaving')} aria-label={t.name + (g.overdue ? ', overdue' : '')}>
      <header className="rc-need-head">
        <span className={cx('rc-need-dot', g.overdue && 'is-pulse')} aria-hidden />
        <div className="rc-need-ht">
          <h3 className="rc-need-title">{t.name}</h3>
          <p className="rc-need-sub">{plural(g.active || g.tickets.length, 'person', 'people')} waiting · oldest {g.oldest}m</p>
        </div>
        {g.overdue ? <span className="rc-need-badge">Overdue</span> : null}
      </header>
      <div className="rc-need-ai">
        <AiLabel>{g.summary ? 'AI summary' : 'Sample summary'}</AiLabel>
        <p className="rc-need-sum" title={g.summary ?? t.summary}>{g.summary ?? t.summary}</p>
      </div>
      <ul className="rc-need-people" aria-label="People waiting">
        {g.tickets.map((q) => (
          <li key={q.id} className={cx('rc-need-p', q.isNew && 'is-new')}>
            <Person initials={q.initials} />
            <div className="rc-need-pb">
              <div className="rc-need-pt">
                <span className="rc-need-pn">{q.person}</span>
                <span className="rc-need-pr">{q.role}</span>
                {q.isNew ? <span className="rc-new">Just in</span> : null}
                <span className={cx('rc-need-w', q.wait >= SLA_MINUTES && 'is-over')}>{q.wait}m</span>
              </div>
              <p className="rc-need-q" title={q.q}>{q.q}</p>
              {q.files?.length ? <p className="rc-need-files"><Icon name="clip" size={13} />{plural(q.files.length, 'attachment', 'attachments')} · {q.files.map((f) => f.name).join(', ')}</p> : null}
            </div>
          </li>
        ))}
      </ul>
      <AssignControl suggested={suggested} pics={pics} load={load} disabled={g.leaving} onAssign={onAssign} />
    </article>
  );
}

interface NeedsYouProps {
  groups: NeedsGroup[];
  handledByCards: Theme[];
  pics: Pic[];
  load: Record<string, number>;
  suggestFor: (theme: Theme) => Pic;
  onAssign: (theme: Theme, pic: Pic) => void;
}

/** "Where new hires are stuck": one card per theme with people waiting, overdue first. */
export function NeedsYou({ groups, handledByCards, pics, load, suggestFor, onAssign }: NeedsYouProps) {
  return (
    <div className="rc-needs" role="tabpanel" id="rc-pane-needs" aria-labelledby="rc-tab-needs">
      <section className="rc-needs-main" aria-labelledby="rc-stuck-h">
        <h2 className="rc-sec-h" id="rc-stuck-h"><i className="rc-state-dot is-waiting" />Where new hires are stuck</h2>
        <p className="rc-sec-s">Overdue first, then longest wait. One click puts an expert in a room with them.</p>
        {groups.length ? (
          <div className="rc-need-list">
            {groups.map((g) => <NeedsCard key={g.theme.key} group={g} suggested={suggestFor(g.theme)} pics={pics} load={load} onAssign={(pic) => onAssign(g.theme, pic)} />)}
          </div>
        ) : (
          <div className="rc-allclear"><span className="rc-fb-tick"><Icon name="check" size={14} strokeWidth={2.4} /></span>All clear — every new hire has an answer or a person.</div>
        )}
      </section>
      <div className="rc-needs-foot">
        <section className="rc-panel2 rc-panel2-quiet" aria-labelledby="rc-cards-h">
          <h2 className="rc-sec-h is-small" id="rc-cards-h"><i className="rc-state-dot is-calm" />Handled by cards</h2>
          {handledByCards.length ? (
            <div className="rc-cardchips">{handledByCards.map((t) => <span key={t.key} className="rc-cardchip">{t.short}<b>{t.count}</b></span>)}</div>
          ) : <p className="rc-sec-empty">Every theme needs a person today.</p>}
        </section>
        <Footnote>Themes are built only from questions employees chose to ask. No monitoring. Rooms with an expert are in Ticket room.</Footnote>
      </div>
    </div>
  );
}
