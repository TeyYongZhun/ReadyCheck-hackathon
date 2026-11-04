import { useEffect, useRef, useState } from 'react';
import { THEMES, TREND_FRAMES, type TrendFrame } from '../../data/command';
import { cx, plural } from '../../lib/util';
import { AiLabel, Footnote } from '../../components/primitives';
import type { ThemeKey } from '../../types';

const TREND_INSIGHTS: Record<ThemeKey, { friction: string; signal: string; action: string }> = {
  db: {
    friction: 'New joiners can reach the database step before their access is ready.',
    signal: 'Access approval and credential setup appear alongside staging connection questions.',
    action: 'Add the database access request and expected approval time to the first-week checklist.',
  },
  vpn: {
    friction: 'Remote access setup can block new joiners from reaching their work tools.',
    signal: 'Certificate setup is a recurring point of confusion in the remote-access journey.',
    action: 'Share the VPN setup guide before day one and clarify which tools require VPN.',
  },
  onb: {
    friction: 'New joiners are unsure what to expect during their first week.',
    signal: 'Questions cluster around the Friday check-in and finding an onboarding buddy.',
    action: 'Send a day-one schedule with the buddy name, check-in time, and key milestones.',
  },
  exp: {
    friction: 'Expense rules are hard to apply when a new joiner is making their first claim.',
    signal: 'Questions focus on receipts, client-dinner limits, and when pre-approval is needed.',
    action: 'Provide a first-claim example with approval thresholds and acceptable receipts.',
  },
  pay: {
    friction: 'Payroll setup can feel uncertain when bank details do not match the form options.',
    signal: 'Bank account acceptance and payroll cut-off timing are common points to clarify.',
    action: 'Explain accepted bank formats and the payroll cut-off in the onboarding checklist.',
  },
  mfa: {
    friction: 'Account access may be interrupted when a new joiner changes or replaces a phone.',
    signal: 'Authenticator setup and transfer steps are the main source of questions.',
    action: 'Include a short MFA setup and recovery guide with the initial account instructions.',
  },
  leave: {
    friction: 'New joiners may not know which leave rules apply to them or where to check.',
    signal: 'Carry-over and holiday entitlement questions point to policy discovery gaps.',
    action: 'Link the leave policy and a plain-language entitlement summary in the welcome pack.',
  },
  hw: {
    friction: 'Equipment issues can prevent new joiners from getting set up and productive.',
    signal: 'Dock and charging questions suggest that hardware readiness is not always obvious.',
    action: 'Confirm laptop, dock, and charging setup before the employee’s first working day.',
  },
  ben: {
    friction: 'Benefits enrollment can be difficult to navigate without a clear life-event guide.',
    signal: 'Questions about adding a spouse point to uncertainty around enrollment steps.',
    action: 'Provide a benefits enrollment checklist with required documents and key deadlines.',
  },
};

function niceStep(max: number): number {
  const raw = max / 5, pw = Math.pow(10, Math.floor(Math.log10(raw || 1))), n = raw / pw;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pw;
}

/** Questions by theme: one bar per theme, Daily / Weekly / Monthly / All. Sample data. */
export function ThemeTrends() {
  const [frame, setFrame] = useState<TrendFrame>('monthly');
  const [selectedKey, setSelectedKey] = useState<ThemeKey | null>(null);
  const [analysisRun, setAnalysisRun] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisTimer = useRef<number | null>(null);
  const fr = TREND_FRAMES.find((x) => x.key === frame)!;
  const rows = THEMES.map((t) => ({ t, n: fr.data[t.key] ?? 0 })).sort((a, b) => b.n - a.n);
  const total = rows.reduce((s, r) => s + r.n, 0);
  const max = Math.max(1, ...rows.map((r) => r.n)), step = Math.max(1, niceStep(max)), top = Math.ceil(max / step) * step;
  const ticks: number[] = []; for (let v = 0; v <= top; v += step) ticks.push(v);
  const selected = rows.find((r) => r.t.key === selectedKey);
  const highestCount = rows[0]?.n ?? 0;
  const mostAskedThemes = highestCount > 0 ? rows.filter((r) => r.n === highestCount) : [];
  const mostAskedNames = mostAskedThemes.length > 1
    ? `${mostAskedThemes.slice(0, -1).map((r) => r.t.name).join(', ')} and ${mostAskedThemes[mostAskedThemes.length - 1].t.name}`
    : mostAskedThemes[0]?.t.name;
  const selectedInsight = selected && selected.n > 0 ? TREND_INSIGHTS[selected.t.key] : null;
  const askedPeriod = frame === 'monthly'
    ? `in ${fr.caption.replace(', so far', '')}`
    : frame === 'daily' ? 'today' : frame === 'weekly' ? 'this week' : 'all time';

  useEffect(() => {
    if (!selectedKey) return;
    setIsAnalyzing(true);
    analysisTimer.current = window.setTimeout(() => {
      setIsAnalyzing(false);
      analysisTimer.current = null;
    }, 1200);
    return () => {
      if (analysisTimer.current !== null) window.clearTimeout(analysisTimer.current);
      analysisTimer.current = null;
    };
  }, [selectedKey, analysisRun]);

  function selectTheme(key: ThemeKey) {
    setSelectedKey(key);
    setAnalysisRun((run) => run + 1);
  }

  function selectFrame(nextFrame: TrendFrame) {
    setFrame(nextFrame);
    setSelectedKey(null);
    setIsAnalyzing(false);
  }

  return (
    <div className="rc-trends rc-trends2" role="tabpanel" id="rc-pane-trends" aria-labelledby="rc-tab-trends">
      <section className="rc-home-card rc-glass rc-glass-2 rc-tbars-card" aria-labelledby="rc-tb-h">
        <header className="rc-panel-head">
          <div>
            <h2 className="rc-panel-h" id="rc-tb-h">Onboarding Issues by Category<AiLabel>AI-Identified Themes</AiLabel></h2>
            <p className="rc-panel-s">{fr.caption} · {plural(total, 'question', 'questions')}</p>
          </div>
          <div className="rc-seg" role="group" aria-label="Time frame">
            {TREND_FRAMES.map((x) => <button key={x.key} type="button" aria-pressed={frame === x.key} className={cx(frame === x.key && 'is-on')} onClick={() => selectFrame(x.key)}>{x.label}</button>)}
          </div>
        </header>
        {total ? (
          <div className="rc-tbars" style={{ '--rc-cols': rows.length } as React.CSSProperties}>
            <div className="rc-tbars-grid" aria-hidden>{ticks.map((v) => <span key={v} style={{ bottom: (v / top) * 100 + '%' }}><i>{v}</i></span>)}</div>
            <ul key={frame} className="rc-tbars-cols" aria-label={'Onboarding issues by theme, ' + fr.caption}>
              {rows.map((r) => {
                const pct = Math.round((r.n / total) * 100);
                return (
                  <li key={r.t.key}>
                    <button className={cx('rc-tbar', selectedKey === r.t.key && 'is-on')} type="button" aria-pressed={selectedKey === r.t.key} aria-label={`Analyze onboarding friction for ${r.t.name}: ${plural(r.n, 'question', 'questions')}, ${pct}% of all`} onClick={() => selectTheme(r.t.key)}>
                      <span className="rc-tbar-plot"><span className="rc-tbar-b is-now" style={{ '--v': ((r.n / top) * 100).toFixed(2) } as React.CSSProperties}><em>{r.n}</em></span></span>
                      <span className="rc-tbar-l">{r.t.short}</span>
                      <span className="rc-tbar-tip" role="presentation"><b>{r.t.name}</b><span>{plural(r.n, 'question', 'questions')} · {pct}% of all</span></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : <p className="rc-sec-empty">No questions in this time frame yet.</p>}
        <p className="rc-trend-hint">Click any bar to get AI insights &amp; analytics on onboarding process challenges by theme.</p>
        {selected ? (
          <section className="rc-trend-analysis rc-glass rc-glass-1" aria-live="polite" aria-labelledby="rc-trend-analysis-h">
            {isAnalyzing ? (
              <div className="rc-trend-analyzing">
                <span className="rc-trend-orbit" aria-hidden="true"><i /><i /><i /></span>
                <div className="rc-trend-analysis-copy">
                  <h3 id="rc-trend-analysis-h">AI is analyzing trend</h3>
                  <p>Reviewing {selected.t.name.toLowerCase()} questions · {fr.label.toLowerCase()} view</p>
                  <span className="rc-trend-progress" aria-hidden="true"><i /></span>
                </div>
                <span className="rc-sr" role="status">AI is analyzing {selected.t.name.toLowerCase()} onboarding process challenges.</span>
              </div>
            ) : (
              <>
                <header className="rc-trend-analysis-head">
                  <div>
                    <AiLabel>AI analytics · sample</AiLabel>
                    <h3 id="rc-trend-analysis-h">{selected.t.name} Trend Analysis</h3>
                    {selected.n > 0 ? <p className="rc-trend-analysis-total">Total asked {askedPeriod}: {selected.n}</p> : null}
                  </div>
                  {selected.n > 0 ? <span className="rc-trend-analysis-count">{Math.round((selected.n / total) * 100)}% of {frame === 'all' ? 'all-time' : fr.label.toLowerCase()} questions</span> : null}
                </header>
                <div className={cx('rc-trend-insights', selected.n === 0 && 'is-single')}>
                  {selected.n === 0 ? (
                    <article>
                      <h4>No bottleneck found</h4>
                      <p>
                        No questions about {selected.t.name.toLowerCase()} {askedPeriod}.
                        {mostAskedNames ? ` The highest feedback volume is currently recorded in ${mostAskedNames} (${plural(highestCount, 'question', 'questions')} ${mostAskedThemes.length > 1 ? 'each' : 'total'}). These categories may warrant further review.` : ''}
                      </p>
                    </article>
                  ) : (
                    <>
                      <article><h4>Onboarding Bottleneck</h4><p>{selectedInsight?.friction}</p></article>
                      <article><h4>Supporting Evidence</h4><p>{selectedInsight?.signal}</p></article>
                      <article><h4>Recommended Management Action</h4><p>{selectedInsight?.action}</p></article>
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        ) : null}
        <p className="rc-home-note">Illustrative sample data — not measured results</p>
      </section>
      <Footnote>Themes are built only from questions employees chose to ask. No monitoring.</Footnote>
    </div>
  );
}
