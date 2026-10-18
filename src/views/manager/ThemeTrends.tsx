import { useState } from 'react';
import { THEMES, TREND_FRAMES } from '../../data/command';
import { cx, plural } from '../../lib/util';
import { AiLabel, Footnote } from '../../components/primitives';

function niceStep(max: number): number {
  const raw = max / 5, pw = Math.pow(10, Math.floor(Math.log10(raw || 1))), n = raw / pw;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pw;
}

/** Questions by theme: one bar per theme, Daily / Monthly / All. Sample data. */
export function ThemeTrends() {
  const [frame, setFrame] = useState<'daily' | 'monthly' | 'all'>('monthly');
  const fr = TREND_FRAMES.find((x) => x.key === frame)!;
  const rows = THEMES.map((t) => ({ t, n: fr.data[t.key] ?? 0 })).sort((a, b) => b.n - a.n);
  const total = rows.reduce((s, r) => s + r.n, 0);
  const max = Math.max(1, ...rows.map((r) => r.n)), step = Math.max(1, niceStep(max)), top = Math.ceil(max / step) * step;
  const ticks: number[] = []; for (let v = 0; v <= top; v += step) ticks.push(v);

  return (
    <div className="rc-trends rc-trends2" role="tabpanel" id="rc-pane-trends" aria-labelledby="rc-tab-trends">
      <section className="rc-home-card rc-glass rc-glass-2 rc-tbars-card" aria-labelledby="rc-tb-h">
        <header className="rc-panel-head">
          <div>
            <h2 className="rc-panel-h" id="rc-tb-h">Questions by theme<AiLabel>AI clustered</AiLabel></h2>
            <p className="rc-panel-s">{fr.caption} · {plural(total, 'question', 'questions')}</p>
          </div>
          <div className="rc-seg" role="group" aria-label="Time frame">
            {TREND_FRAMES.map((x) => <button key={x.key} type="button" aria-pressed={frame === x.key} className={cx(frame === x.key && 'is-on')} onClick={() => setFrame(x.key)}>{x.label}</button>)}
          </div>
        </header>
        {total ? (
          <div className="rc-tbars" style={{ '--rc-cols': rows.length } as React.CSSProperties}>
            <div className="rc-tbars-grid" aria-hidden>{ticks.map((v) => <span key={v} style={{ bottom: (v / top) * 100 + '%' }}><i>{v}</i></span>)}</div>
            <ul key={frame} className="rc-tbars-cols" aria-label={'Questions by theme, ' + fr.caption}>
              {rows.map((r) => {
                const pct = Math.round((r.n / total) * 100);
                return (
                  <li key={r.t.key}>
                    <div className="rc-tbar" tabIndex={0} role="img" aria-label={`${r.t.name}: ${plural(r.n, 'question', 'questions')}, ${pct}% of all`}>
                      <span className="rc-tbar-plot"><span className="rc-tbar-b is-now" style={{ '--v': ((r.n / top) * 100).toFixed(2) } as React.CSSProperties}><em>{r.n}</em></span></span>
                      <span className="rc-tbar-l">{r.t.short}</span>
                      <span className="rc-tbar-tip" role="presentation"><b>{r.t.name}</b><span>{plural(r.n, 'question', 'questions')} · {pct}% of all</span></span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : <p className="rc-sec-empty">No questions in this time frame yet.</p>}
        <p className="rc-home-note">Illustrative sample data — not measured results</p>
      </section>
      <Footnote>Themes are built only from questions employees chose to ask. No monitoring.</Footnote>
    </div>
  );
}
