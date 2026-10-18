import { useEffect, useRef, useState } from 'react';
import type { Pic } from '../../types';
import { HOME } from '../../data/command';
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

const STATS: [string, string, string, string, string][] = [
  ['Open tickets', '21', 'Unresolved', 'doc', ''],
  ['Overdue', '4', 'Past agreed date', 'clock', 'is-hot'],
  ['Employee-confirmed resolved', '72%', '18 of 25 cohort tickets', 'check', ''],
  ['Awaiting confirmation', '7', 'Not counted as resolved', 'users', ''],
];

/** Manager Home: the weekly overview. All figures are sample data (labelled). TODO: compute from real tickets. */
export function HomeOverview({ pics, waiting, onOpenNeeds }: { pics: Pic[]; waiting: number; onOpenNeeds: () => void }) {
  const [span, setSpan] = useState<'daily' | 'weekly'>('daily');
  const byId = Object.fromEntries(pics.map((x) => [x.id, x]));
  return (
    <div className="rc-home" role="tabpanel" id="rc-pane-home" aria-labelledby="rc-tab-home">
      <header className="rc-home-head">
        <div><h1 className="rc-home-h">Home</h1><p className="rc-home-s">A clear view of support across your team</p></div>
        <div className="rc-home-meta"><AiLabel>Sample data</AiLabel><span className="rc-home-date"><Icon name="calendar" size={16} />{HOME.range}</span></div>
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
        <OpenIssuesChart id={span} data={span === 'daily' ? HOME.daily : HOME.weekly} labels={span === 'daily' ? HOME.days : HOME.weeks} label={'Open tickets, ' + span} />
        <p className="rc-home-note">Illustrative sample data — not measured results</p>
      </section>

      <div className="rc-home-pair">
        <section className="rc-home-card rc-glass rc-glass-2" aria-labelledby="rc-cic-h">
          <h2 className="rc-panel-h" id="rc-cic-h">Common issue categories</h2>
          <p className="rc-panel-s">Current open tickets</p>
          <ul className="rc-bars">
            {HOME.cats.map(([label, n]) => (
              <li key={label}><span className="rc-bars-l">{label}</span><span className="rc-bars-t" aria-hidden><i style={{ width: (n / 10) * 100 + '%' }} /></span><span className="rc-bars-n">{n}</span></li>
            ))}
          </ul>
        </section>
        <section className="rc-home-card rc-glass rc-glass-2" aria-labelledby="rc-pic-h">
          <h2 className="rc-panel-h" id="rc-pic-h">Open tickets by expert</h2>
          <p className="rc-panel-s">Who is carrying the load</p>
          <ul className="rc-bypic">
            {HOME.byPic.map(([id, n]) => (
              <li key={id}><PicAvatar pic={byId[id]} size={32} /><span className="rc-bypic-n">{byId[id]?.name}</span><span className="rc-bypic-t">{byId[id]?.team}</span><b>{n}</b></li>
            ))}
          </ul>
        </section>
      </div>
      <Footnote>A ticket counts as resolved only after the employee confirms it.</Footnote>
    </div>
  );
}
