import { useState } from 'react';
import type { Pic, Room } from '../../types';
import { THEMES_BY_KEY } from '../../data/command';
import { cx, plural } from '../../lib/util';
import { Footnote, Icon, PicAvatar } from '../../components/primitives';

type Filter = 'all' | 'ongoing' | 'resolved';

/** Every ticket that reached a person, as a filterable table. Click a row to open its room. */
export function TicketRooms({ rooms, pics, onOpen }: { rooms: Room[]; pics: Pic[]; onOpen: (r: Room) => void }) {
  const [q, setQ] = useState('');
  const [st, setSt] = useState<Filter>('all');
  const [who, setWho] = useState('all');
  const byId = Object.fromEntries(pics.map((x) => [x.id, x]));
  const all = rooms.slice().sort((x, y) => (x.status === 'resolved' ? 1 : 0) - (y.status === 'resolved' ? 1 : 0) || (y.isNew ? 1 : 0) - (x.isNew ? 1 : 0) || x.elapsed - y.elapsed);
  const picIds = [...new Set(all.map((r) => r.pic))];
  const base = all.filter((r) => who === 'all' || r.pic === who);
  const nOn = base.filter((r) => r.status !== 'resolved').length;
  const needle = q.trim().toLowerCase();
  const rows = base.filter((r) => {
    if (st === 'ongoing' && r.status === 'resolved') return false;
    if (st === 'resolved' && r.status !== 'resolved') return false;
    if (!needle) return true;
    const t = THEMES_BY_KEY[r.theme], pc = byId[r.pic];
    return [r.ticket, r.name, t?.name, t?.short, pc?.name, pc?.team, r.last].join(' ').toLowerCase().includes(needle);
  });
  const filtered = st !== 'all' || who !== 'all' || !!needle;
  const clear = () => { setQ(''); setSt('all'); setWho('all'); };

  return (
    <div className="rc-home rc-tix" role="tabpanel" id="rc-pane-rooms" aria-labelledby="rc-tab-rooms">
      <header className="rc-home-head">
        <div><h2 className="rc-home-h">Ticket room</h2><p className="rc-home-s">Every ticket that reached a person, with who has it and where it stands. Click a row to open its room.</p></div>
      </header>
      <div className="rc-tix-bar">
        <label className="rc-tix-search"><Icon name="search" size={16} />
          <input type="search" value={q} placeholder="Search tickets, themes, experts" aria-label="Search tickets" onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="rc-seg rc-tix-seg" role="group" aria-label="Progress">
          {([['all', 'All', base.length], ['ongoing', 'Ongoing', nOn], ['resolved', 'Resolved', base.length - nOn]] as [Filter, string, number][]).map(([k, label, n]) => (
            <button key={k} type="button" aria-pressed={st === k} className={cx(st === k && 'is-on')} onClick={() => setSt(k)}>{label}<span className="rc-tix-segn">{n}</span></button>
          ))}
        </div>
      </div>
      <div className="rc-tix-pics" role="group" aria-label="Expert (PIC)">
        <span className="rc-team-covk">PIC</span>
        <button type="button" className={cx('rc-pick', who === 'all' && 'is-on')} aria-pressed={who === 'all'} onClick={() => setWho('all')}>All experts</button>
        {picIds.map((id) => {
          const pc = byId[id], on = who === id;
          return (
            <button key={id} type="button" className={cx('rc-pick rc-tix-pic', on && 'is-on')} aria-pressed={on} onClick={() => setWho(on ? 'all' : id)}>
              <PicAvatar pic={pc} size={22} />{pc?.first}<span className="rc-tix-segn">{all.filter((r) => r.pic === id).length}</span>
            </button>
          );
        })}
      </div>
      <section className="rc-tix-card rc-glass rc-glass-2" aria-label="Tickets">
        <p className="rc-tix-count" role="status">
          {filtered ? `Showing ${rows.length} of ${all.length} tickets` : plural(all.length, 'ticket', 'tickets')}
          {filtered ? <button type="button" className="rc-link-btn" onClick={clear}>Clear filters</button> : null}
        </p>
        {rows.length ? (
          <table className="rc-tix-table">
            <thead><tr>{['Ticket', 'Theme', 'PIC', 'Employees', 'Latest', 'Progress'].map((k) => <th key={k} scope="col">{k}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => {
                const t = THEMES_BY_KEY[r.theme], pc = byId[r.pic], done = r.status === 'resolved';
                const more = r.tickets && r.tickets.length > 1 ? r.tickets.length - 1 : 0;
                return (
                  <tr key={r.id} className={cx('rc-tix-row', done && 'is-done', r.isNew && 'is-new')} onClick={() => onOpen(r)}>
                    <td>
                      <button type="button" className="rc-tix-id" aria-label={`Open room ${r.name}`} onClick={(e) => { e.stopPropagation(); onOpen(r); }}>{r.ticket ?? '—'}{more ? <span className="rc-tix-more">+{more}</span> : null}</button>
                      <span className="rc-tix-room">{r.name}</span>
                    </td>
                    <td><span className="rc-cardchip">{t?.short}</span></td>
                    <td><span className="rc-tix-who"><PicAvatar pic={pc} size={28} /><span><b>{pc?.name}</b><small>{pc?.team}</small></span></span></td>
                    <td><span className="rc-tix-ppl">{plural(r.people.length, 'person', 'people')}</span></td>
                    <td className="rc-tix-last"><span title={r.last}>{r.last || 'Room opened'}</span></td>
                    <td>
                      {done ? <span className="rc-tix-st is-done"><Icon name="check" size={13} strokeWidth={2.4} />Resolved</span>
                        : <span className="rc-tix-st is-on"><i className="rc-state-dot is-room" />Ongoing<small>{r.status === 'waiting' ? 'Employee to reply' : r.elapsed < 1 ? 'just now' : r.elapsed + 'm'}</small></span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="rc-tix-empty"><p>No tickets match these filters.</p><button type="button" className="rc-quiet" onClick={clear}>Clear filters</button></div>
        )}
      </section>
      <Footnote>Ongoing means an expert is in the room. A ticket shows Resolved once it is marked solved.</Footnote>
    </div>
  );
}
