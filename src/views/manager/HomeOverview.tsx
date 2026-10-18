import { useEffect, useRef, useState } from 'react';
import type { Pic } from '../../types';
import { DEFAULT_WEEK, addDays, isoDate, rangeLabel, weekData, weekStart } from '../../data/homeWeeks';
import { cx } from '../../lib/util';
import { AiLabel, Footnote, Icon, PicAvatar } from '../../components/primitives';

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

/** Manager Home: the weekly overview. All figures are sample data (labelled). TODO: compute from real tickets. */
export function HomeOverview({ pics, waiting, onOpenNeeds }: { pics: Pic[]; waiting: number; onOpenNeeds: () => void }) {
  const [span, setSpan] = useState<'daily' | 'weekly'>('daily');
  const [week, setWeek] = useState<Date>(DEFAULT_WEEK);
  const W = weekData(week);
  const byId = Object.fromEntries(pics.map((x) => [x.id, x]));
  const catMax = Math.max(10, ...W.cats.map((c) => c[1]));
  const STATS: [string, string, string, string, string][] = [
    ['Open tickets', String(W.stats.open), 'Unresolved', 'doc', ''],
    ['Overdue', String(W.stats.overdue), 'Past agreed date', 'clock', 'is-hot'],
    ['Employee-confirmed resolved', W.stats.resolvedPct + '%', `${W.stats.resolved} of ${W.stats.cohort} cohort tickets`, 'check', ''],
    ['Awaiting confirmation', String(W.stats.awaiting), 'Not counted as resolved', 'users', ''],
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
            {W.cats.map(([label, n]) => (
              <li key={label}><span className="rc-bars-l">{label}</span><span className="rc-bars-t" aria-hidden><i style={{ width: (n / catMax) * 100 + '%' }} /></span><span className="rc-bars-n">{n}</span></li>
            ))}
          </ul>
        </section>
        <section className="rc-home-card rc-glass rc-glass-2" aria-labelledby="rc-pic-h">
          <h2 className="rc-panel-h" id="rc-pic-h">Open tickets by expert</h2>
          <p className="rc-panel-s">Who is carrying the load</p>
          <ul className="rc-bypic">
            {W.byPic.map(([id, n]) => (
              <li key={id}><PicAvatar pic={byId[id]} size={32} /><span className="rc-bypic-n">{byId[id]?.name}</span><span className="rc-bypic-t">{byId[id]?.team}</span><b>{n}</b></li>
            ))}
          </ul>
        </section>
      </div>
      <Footnote>A ticket counts as resolved only after the employee confirms it.</Footnote>
    </div>
  );
}
