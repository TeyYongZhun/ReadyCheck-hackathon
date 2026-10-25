import { useEffect, useRef, useState } from 'react';
import type { Pic, QueueTicket, Room } from '../../types';
import { HOME, QUEUE, ROOMS, SLA_MINUTES, THEMES_BY_KEY } from '../../data/command';
import { DEFAULT_WEEK, addDays, isoDate, rangeLabel, weekData, weekStart } from '../../data/homeWeeks';
import { cx } from '../../lib/util';
import { AiLabel, Footnote, Icon, PicAvatar } from '../../components/primitives';
import { askHomeSummary } from '../../lib/api';

function OpenIssuesChart({ id, data, labels, label }: { id: string; data: number[]; labels: string[]; label: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    setW(el.clientWidth || 640);
    const ro = new ResizeObserver((en) => { const w = en[0].contentRect.width; if (w) setW(Math.round(w)); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const n = data.length, narrow = W < 520, H = narrow ? 220 : 260;
  const L = narrow ? 34 : 56, R = 18, T = 30, B = 32, iw = Math.max(40, W - L - R), ih = H - T - B;
  const max = Math.ceil((Math.max(...data) + 5) / 15) * 15;
  const ticks: number[] = []; for (let t = 0; t <= max; t += 15) ticks.push(t);
  const X = (i: number) => L + 16 + (n === 1 ? (iw - 32) / 2 : (i * (iw - 32)) / (n - 1));
  const Y = (v: number) => T + ih - (v / max) * ih;
  const pts = data.map((v, i) => [X(i), Y(v)] as const);
  const line = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
  const area = `${line} L${pts[n - 1][0].toFixed(1)} ${T + ih} L${pts[0][0].toFixed(1)} ${T + ih} Z`;
  const gid = 'rc-area-' + id;
  return (
    <div className="rc-chart" ref={wrap}>
      <svg key={id} className="rc-chart-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label + ': ' + labels.map((l, i) => l + ' ' + data[i]).join(', ')}>
        <defs><linearGradient id={gid} x1={0} y1={0} x2={0} y2={1}><stop offset="0%" className="rc-chart-s1" /><stop offset="100%" className="rc-chart-s2" /></linearGradient></defs>
        {ticks.map((v) => <g key={v}><line className="rc-chart-grid" x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} /><text className="rc-chart-y" x={L - 10} y={Y(v) + 4} textAnchor="end">{v}</text></g>)}
        {narrow ? null : <text className="rc-chart-yt" transform={`translate(14 ${T + ih / 2}) rotate(-90)`} textAnchor="middle">Open tickets</text>}
        {pts.map((q, i) => <line key={'v' + i} className="rc-chart-vg" x1={q[0]} x2={q[0]} y1={T} y2={T + ih} />)}
        <path className="rc-chart-area" d={area} fill={`url(#${gid})`} />
        <path className="rc-chart-line" d={line} pathLength={1} />
        {pts.map((q, i) => (
          <g key={'p' + i} className="rc-chart-pt" tabIndex={0} role="img" aria-label={`${labels[i]}: ${data[i]} open tickets`}>
            <circle className="rc-chart-hit" cx={q[0]} cy={q[1]} r={14} />
            <circle className="rc-chart-dot" cx={q[0]} cy={q[1]} r={4.5} />
            <text className="rc-chart-v" x={q[0]} y={q[1] - 12} textAnchor="middle">{data[i]}</text>
          </g>
        ))}
        {labels.map((l, i) => (narrow && id === 'weekly' && i % 2 ? null : <text key={'x' + i} className="rc-chart-x" x={X(i)} y={H - 8} textAnchor="middle">{narrow && id === 'daily' ? l.split(' ')[0] : l}</text>))}
      </svg>
    </div>
  );
}

/** The date pill: opens a week picker (quick picks, previous/next, or any date). Weeks run Monday to Sunday. */
function WeekPicker({ start, onChange }: { start: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null), btn = useRef<HTMLButtonElement>(null);
  const latest = weekStart(new Date());
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('pointerdown', off); window.addEventListener('keydown', k);
    return () => { document.removeEventListener('pointerdown', off); window.removeEventListener('keydown', k); };
  }, [open]);
  const pick = (d: Date) => { onChange(weekStart(d)); setOpen(false); };
  const step = (n: number) => { const d = addDays(start, n * 7); if (d.getTime() <= latest.getTime()) onChange(d); };
  const quick: [string, Date][] = [['This week', latest], ['Last week', addDays(latest, -7)], ['2 weeks ago', addDays(latest, -14)], ['Sample week', DEFAULT_WEEK]];
  return (
    <div className="rc-week" ref={wrap}>
      <button ref={btn} type="button" className="rc-home-date rc-week-btn" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="calendar" size={16} />{rangeLabel(start)}<Icon name="chevron" size={14} className={open ? 'rc-chev-up' : 'rc-chev-down'} />
      </button>
      {open ? (
        <div className="rc-week-pop rc-menu rc-glass rc-glass-3" role="dialog" aria-label="Choose a week">
          <div className="rc-week-nav">
            <button type="button" className="rc-team-x" aria-label="Previous week" onClick={() => step(-1)}><Icon name="chevron" size={14} className="rc-week-prev" /></button>
            <span className="rc-week-cur">{rangeLabel(start)}</span>
            <button type="button" className="rc-team-x" aria-label="Next week" disabled={start.getTime() >= latest.getTime()} onClick={() => step(1)}><Icon name="chevron" size={14} /></button>
          </div>
          <ul className="rc-week-list">
            {quick.map(([label, d]) => (
              <li key={label}>
                <button type="button" className={cx('rc-menu-i rc-week-opt', d.getTime() === start.getTime() && 'is-on')} onClick={() => pick(d)}>
                  <span className="rc-menu-n">{label}</span><span className="rc-menu-l">{rangeLabel(d)}</span>
                </button>
              </li>
            ))}
          </ul>
          <label className="rc-kb-lab rc-week-date">Or pick any date
            <input type="date" className="rc-kb-input is-plain" value={isoDate(start)} max={isoDate(new Date())}
              onChange={(e) => { if (e.target.value) { const [y, m, d] = e.target.value.split('-').map(Number); pick(new Date(y, m - 1, d)); } }} />
          </label>
        </div>
      ) : null}
    </div>
  );
}

/** Manager Home: the weekly overview. Trend history remains sample data; live counts come from shared state. */
export function HomeOverview({ pics, waiting, rooms, tickets, solvedByCardsPct, onOpenNeeds }: {
  pics: Pic[];
  waiting: number;
  rooms: Room[];
  tickets: QueueTicket[];
  solvedByCardsPct: number;
  onOpenNeeds: () => void;
}) {
  const [span, setSpan] = useState<'daily' | 'weekly'>('daily');
  const [week, setWeek] = useState<Date>(DEFAULT_WEEK);
  const W = weekData(week);
  const byId = Object.fromEntries(pics.map((x) => [x.id, x]));
  const liveRooms = rooms.filter((r) => r.status !== 'resolved');
  const openTickets = tickets.length + liveRooms.reduce((total, room) => total + (room.tickets?.length ?? 1), 0);
  const overdue = tickets.filter((t) => t.wait >= SLA_MINUTES).length;
  const sampleRoomIds = new Set(ROOMS.map((room) => room.id));
  const demoRoomCounts = new Map<string, number>();
  liveRooms
    .filter((room) => !sampleRoomIds.has(room.id))
    .forEach((room) => demoRoomCounts.set(room.pic, (demoRoomCounts.get(room.pic) ?? 0) + 1));
  const byPic = HOME.byPic.map(([id, n]) => [id, n + (demoRoomCounts.get(id) ?? 0)] as [string, number]);
  const categoryThemes: Record<string, string[]> = {
    'Access & permissions': ['db', 'vpn', 'mfa'],
    'Process guidance': ['onb', 'exp', 'pay', 'leave', 'ben'],
    'Tools & resources': ['hw'],
    'Conflicting instructions': [],
  };
  const sampleTicketIds = new Set(QUEUE.map((ticket) => ticket.id));
  const demoIssues = new Map<string, string>();
  tickets
    .filter((ticket) => !sampleTicketIds.has(ticket.id))
    .forEach((ticket) => demoIssues.set(ticket.id, ticket.theme));
  liveRooms
    .filter((room) => !sampleRoomIds.has(room.id))
    .forEach((room) => (room.tickets ?? [room.ticket]).filter((id): id is string => !!id)
      .forEach((id) => demoIssues.set(id, room.theme)));
  const cats = HOME.cats.map(([label]) => [
    label,
    (HOME.cats.find(([name]) => name === label)?.[1] ?? 0)
      + Array.from(demoIssues.values()).filter((theme) => categoryThemes[label]?.includes(theme)).length,
  ] as [string, number]);
  const catMax = Math.max(10, ...cats.map((c) => c[1]));
  const topThemes = tickets
    .reduce((groups, ticket) => {
      const group = groups.find((item) => item.theme === ticket.theme);
      if (group) { group.waiting += 1; group.oldest = Math.max(group.oldest, ticket.wait); }
      else groups.push({ theme: ticket.theme, waiting: 1, oldest: ticket.wait });
      return groups;
    }, [] as { theme: string; waiting: number; oldest: number }[])
    .sort((a, b) => b.waiting - a.waiting || b.oldest - a.oldest)
    .slice(0, 3)
    .map((group) => ({ name: THEMES_BY_KEY[group.theme as keyof typeof THEMES_BY_KEY]?.name ?? group.theme, waiting: group.waiting, oldest: group.oldest }));
  const topExpertData = byPic
    .slice()
    .sort((a, b) => b[1] - a[1])
    .map(([id, load]) => ({ name: byId[id]?.name ?? id, load }));
  const activeRoomCounts = liveRooms.reduce((counts, room) => {
    counts.set(room.pic, (counts.get(room.pic) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const activeTicketCounts = liveRooms.reduce((counts, room) => {
    counts.set(room.pic, (counts.get(room.pic) ?? 0) + (room.tickets?.length ?? 1));
    return counts;
  }, new Map<string, number>());
  const topThemeKey = topThemes[0] && Object.entries(THEMES_BY_KEY).find(([, theme]) => theme.name === topThemes[0].name)?.[0];
  const matchesTheme = (id: string) => !!byId[id]?.covers.includes(topThemeKey ?? '');
  const availableForAssignment = (id: string) => (activeRoomCounts.get(id) ?? 0) < 3 && (activeTicketCounts.get(id) ?? 0) < 6;
  const recommendedExpert = topThemeKey
    ? byPic
      .filter(([id]) => matchesTheme(id))
      .sort((a, b) => {
        const aAvailable = availableForAssignment(a[0]), bAvailable = availableForAssignment(b[0]);
        return Number(bAvailable) - Number(aAvailable)
          || (activeTicketCounts.get(a[0]) ?? 0) - (activeTicketCounts.get(b[0]) ?? 0)
          || (activeRoomCounts.get(a[0]) ?? 0) - (activeRoomCounts.get(b[0]) ?? 0)
          || b[1] - a[1];
      })[0]
    : undefined;
  const recommendedExpertData = recommendedExpert
    ? {
      name: byId[recommendedExpert[0]]?.name ?? recommendedExpert[0],
      load: recommendedExpert[1],
      activeRooms: activeRoomCounts.get(recommendedExpert[0]) ?? 0,
      activeTickets: activeTicketCounts.get(recommendedExpert[0]) ?? 0,
      displayedLoad: recommendedExpert[1],
    }
    : null;
  const expertCandidates = pics.map((pic) => ({
    name: pic.name,
    covers: pic.covers,
    activeRooms: activeRoomCounts.get(pic.id) ?? 0,
    activeTickets: activeTicketCounts.get(pic.id) ?? 0,
    displayedLoad: byPic.find(([id]) => id === pic.id)?.[1] ?? 0,
    maxRooms: 3,
    maxTickets: 6,
  }));
  const newOverdue = tickets
    .filter((ticket) => ticket.wait >= SLA_MINUTES)
    .map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      theme: THEMES_BY_KEY[ticket.theme]?.name ?? ticket.theme,
      domain: ticket.theme,
    }));
  const summarySignature = JSON.stringify({
    openTickets,
    overdue,
    activeRooms: liveRooms.length,
    waiting,
    topThemes: topThemes.map((theme) => [theme.name, theme.waiting, theme.oldest]),
    topExperts: topExpertData.map((expert) => [expert.name, expert.load]),
    recommendedExpert: recommendedExpertData ? [
      recommendedExpertData.name,
      recommendedExpertData.activeRooms,
      recommendedExpertData.activeTickets,
      recommendedExpertData.displayedLoad,
    ] : null,
    expertCandidates: expertCandidates.map((expert) => [
      expert.name,
      expert.activeRooms,
      expert.activeTickets,
      expert.displayedLoad,
    ]),
    newOverdue: newOverdue.map((ticket) => [ticket.id, ticket.theme, ticket.domain]),
  });
  const [homeSummary, setHomeSummary] = useState<{ signature: string; summary: string; action: string } | null>(null);
  const [summaryRefresh, setSummaryRefresh] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setSummaryLoading(true);
    const fallback = () => {
      const theme = topThemes[0];
      const summary = overdue
        ? `${overdue} waiting ticket${overdue === 1 ? '' : 's'} may need attention${theme ? `, mainly in ${theme.name}` : ''}.`
        : `${openTickets} unresolved ticket${openTickets === 1 ? '' : 's'} are spread across ${liveRooms.length} active room${liveRooms.length === 1 ? '' : 's'}.`;
      const expert = recommendedExpertData;
      const action = theme && expert && expert.displayedLoad >= 8
        ? `Review ${theme.name}; confirm ${expert.name}'s capacity before assigning the ticket.`
        : theme && expert
          ? `Review ${theme.name} and ask ${expert.name} to take the next suitable assignment.`
        : theme
          ? `Review the ${theme.name} queue and assign the next suitable expert.`
          : expert
            ? `Review the waiting queue before assigning more work to ${expert.name}.`
            : 'Monitor the waiting queue and active rooms.';
      return { summary, action };
    };
    setHomeSummary((current) => current?.signature === summarySignature ? current : { signature: summarySignature, ...fallback() });
    const timer = window.setTimeout(() => {
      void askHomeSummary({ openTickets, overdue, activeRooms: liveRooms.length, waiting, topThemes, topExperts: topExpertData, recommendedExpert: recommendedExpertData, experts: expertCandidates, newOverdue })
        .then((result) => {
          if (!active) return;
          if (result) setHomeSummary({ signature: summarySignature, ...result });
          setSummaryLoading(false);
        });
    }, 800);
    return () => { active = false; window.clearTimeout(timer); };
  }, [summarySignature, summaryRefresh]);
  const STATS: [string, string, string, string, string][] = [
    ['Open tickets', String(openTickets), 'Current unresolved tickets', 'doc', ''],
    ['Overdue', String(overdue), `Waiting over ${SLA_MINUTES}m for response or assignment`, 'clock', 'is-hot'],
    ['Employee-confirmed resolved', solvedByCardsPct + '%', 'Solved by answer cards', 'check', ''],
    ['Active rooms', String(liveRooms.length), 'Unresolved ticket rooms', 'users', ''],
  ];
  return (
    <div className="rc-home" role="tabpanel" id="rc-pane-home" aria-labelledby="rc-tab-home">
      <header className="rc-home-head">
        <div><h1 className="rc-home-h">Home</h1><p className="rc-home-s">A clear view of support across your team</p></div>
        <div className="rc-home-meta"><AiLabel>Sample data</AiLabel><WeekPicker start={week} onChange={setWeek} /></div>
      </header>

      {waiting ? (
        <button type="button" className="rc-home-wait" onClick={onOpenNeeds}>
          <i className="rc-state-dot is-waiting" />
          <span><b>{waiting}</b>{waiting === 1 ? ' person is waiting on you' : ' people are waiting on you'}</span>
          <span className="rc-home-wait-go">Open Needs you<Icon name="chevron" size={14} /></span>
        </button>
      ) : null}
      <section className="rc-home-card rc-glass rc-glass-2 rc-home-readout" aria-labelledby="rc-home-readout-h">
        <header className="rc-panel-head">
          <div><h2 className="rc-panel-h" id="rc-home-readout-h"><AiLabel>Smart suggestions</AiLabel></h2><p className="rc-home-s">Based on current tickets and active rooms</p></div>
          <button type="button" className="rc-btn-primary is-sm rc-home-refresh" disabled={summaryLoading} onClick={() => setSummaryRefresh((value) => value + 1)}>
            {summaryLoading ? <><span className="rc-ai-pulse" aria-hidden>AI summarizing</span><span className="rc-ai-dots" aria-hidden>…</span></> : 'Refresh summary'}
          </button>
        </header>
        <p className="rc-home-readout-text">{homeSummary?.summary}</p>
        <p className="rc-home-readout-action"><strong>AI Suggestion:</strong>{homeSummary?.action}</p>
      </section>

      <dl className="rc-home-stats">
        {STATS.map(([k, v, sub, icon, cls]) => (
          <div key={k} className={cx('rc-home-stat', cls)}>
            <dt>{k}<span className="rc-home-ic"><Icon name={icon} size={18} /></span></dt>
            <dd>{v}</dd><p>{sub}</p>
          </div>
        ))}
      </dl>

      <section className="rc-home-card rc-glass rc-glass-2" aria-labelledby="rc-oit-h">
        <header className="rc-panel-head">
          <div>
            <h2 className="rc-panel-h" id="rc-oit-h">Open issues over time</h2>
            <p className="rc-panel-s">Unresolved tickets at the end of each {span === 'daily' ? 'day' : 'week'}</p>
          </div>
          <div className="rc-seg" role="tablist" aria-label="Chart period">
            {(['daily', 'weekly'] as const).map((v) => <button key={v} type="button" role="tab" aria-selected={span === v} className={cx(span === v && 'is-on')} onClick={() => setSpan(v)}>{v === 'daily' ? 'Daily' : 'Weekly'}</button>)}
          </div>
        </header>
        <OpenIssuesChart key={W.range} id={span} data={span === 'daily' ? W.daily : W.weekly} labels={span === 'daily' ? W.days : W.weeks} label={'Open tickets, ' + span} />
        <p className="rc-home-note">Illustrative sample data — not measured results</p>
      </section>

      <div className="rc-home-pair">
        <section className="rc-home-card rc-glass rc-glass-2" aria-labelledby="rc-cic-h">
          <h2 className="rc-panel-h" id="rc-cic-h">Common issue categories</h2>
          <p className="rc-panel-s">Current open tickets</p>
          <ul className="rc-bars">
            {cats.map(([label, n]) => (
              <li key={label}><span className="rc-bars-l">{label}</span><span className="rc-bars-t" aria-hidden><i style={{ width: (n / catMax) * 100 + '%' }} /></span><span className="rc-bars-n">{n}</span></li>
            ))}
          </ul>
        </section>
        <section className="rc-home-card rc-glass rc-glass-2" aria-labelledby="rc-pic-h">
          <h2 className="rc-panel-h" id="rc-pic-h">Open tickets by expert</h2>
          <p className="rc-panel-s">Who is carrying the load</p>
          <ul className="rc-bypic">
            {byPic.length ? byPic.map(([id, n]) => (
              <li key={id}><PicAvatar pic={byId[id]} size={32} /><span className="rc-bypic-n">{byId[id]?.name}</span><span className="rc-bypic-t">{byId[id]?.team}</span><b>{n}</b></li>
            )) : <li className="rc-sec-empty">No active expert rooms.</li>}
          </ul>
        </section>
      </div>
      <Footnote>A ticket counts as resolved only after the employee confirms it.</Footnote>
    </div>
  );
}
