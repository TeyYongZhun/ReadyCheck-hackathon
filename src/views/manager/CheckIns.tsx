// Manager view: onboarding milestone check-ins, read alongside the questions employees asked.
// "Reach out this week" lists only people who shared their name; everyone else is in cohort totals of 3 or more.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CheckinInsightsResponse } from '../../api-types';
import type { MilestoneKey, PulseAnswer } from '../../types';
import { useApp } from '../../state/AppState';
import { CHECKIN_MILESTONES, COHORT, COHORT_LABEL, CORE_PULSE, MIN_GROUP, PULSE_ANSWERS, PULSE_ACTION, STAGE_PULSE, questionsForMilestone } from '../../data/checkins';
import { fallbackThemes, fallbackWhy, followUpResults, insightsRequest, latestByPersonAtMilestone, totalsOf, type ReachOut } from '../../lib/checkins';
import { askCheckinInsights } from '../../lib/api';
import { cx, plural } from '../../lib/util';
import { AiLabel, Footnote, Icon, PageHead, Person } from '../../components/primitives';

const LABEL = Object.fromEntries(PULSE_ANSWERS.map((a) => [a.key, a.label])) as Record<PulseAnswer, string>;
const milestoneRange = (key: MilestoneKey) => {
  const current = CHECKIN_MILESTONES.find((milestone) => milestone.key === key)!;
  const next = CHECKIN_MILESTONES.find((milestone) => milestone.order === current.order + 1);
  return `${current.label} → ${next?.label ?? 'next milestone'}`;
};

/** Gemini reads the cohort's check-ins. Mounted with the manager view, so a check-in sent from the employee
 *  side is already summarised by the time the manager opens the tab. Re-asked only when the inputs change. */
export function useCheckinInsights() {
  const app = useApp();
  const req = insightsRequest(app.checkins, COHORT.length, app.reachOut);
  const sig = JSON.stringify(req);
  const [res, setRes] = useState<{ sig: string; data: CheckinInsightsResponse | null } | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    // Inputs went back to what was already summarised (or there is nothing yet): stop any "reading" indicator.
    if (res?.sig === sig || !req.responses) { setLoading(false); return; }
    let live = true;
    setLoading(true);
    const t = window.setTimeout(() => {
      void askCheckinInsights(req).then((data) => { if (!live) return; setRes((cur) => ({ sig, data: data ?? (cur?.data ?? null) })); setLoading(false); });
    }, 600);
    return () => { live = false; window.clearTimeout(t); };
  }, [sig]);
  return { ai: res?.data ?? null, fresh: res?.sig === sig, loading };
}

export type CheckinInsights = ReturnType<typeof useCheckinInsights>;

function PlanControl({ suggestion, options, onPlan }: { suggestion: string; options: string[]; onPlan: (label: string) => void }) {
  const wrap = useRef<HTMLDivElement>(null), btn = useRef<HTMLButtonElement>(null), list = useRef<HTMLUListElement>(null);
  const [menu, setMenu] = useState(false);
  const [up, setUp] = useState(false);
  useEffect(() => {
    if (!menu) return;
    const off = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setMenu(false); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(false); btn.current?.focus(); } };
    document.addEventListener('pointerdown', off); window.addEventListener('keydown', k);
    return () => { document.removeEventListener('pointerdown', off); window.removeEventListener('keydown', k); };
  }, [menu]);
  useLayoutEffect(() => {
    const r = list.current?.getBoundingClientRect(); if (!r) return;
    setUp(r.bottom > window.innerHeight - 12 && r.top - 120 > window.innerHeight - r.top);
  }, [menu]);
  const others = [...new Set(options)].filter((o) => o !== suggestion);
  const go = (label: string) => { setMenu(false); onPlan(label); };
  return (
    <div className="rc-assign-row rc-ci-plan" ref={wrap}>
      <button ref={btn} type="button" className="rc-btn-primary is-sm" onClick={() => go(suggestion)}><Icon name="calendar" size={16} />Plan: {suggestion}</button>
      <button type="button" className="rc-btn-ghost is-sm" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>Other step<Icon name="chevron" size={14} className="rc-chev-down" /></button>
      {menu ? (
        <ul ref={list} className={cx('rc-menu rc-glass rc-glass-3', up && 'is-up')} role="menu" aria-label="Choose a follow-up">
          {others.map((o) => <li key={o} role="none"><button type="button" role="menuitem" className="rc-menu-i is-text" onClick={() => go(o)}><span className="rc-menu-n">{o}</span></button></li>)}
        </ul>
      ) : null}
    </div>
  );
}

function ReachOutRow({ r, ai }: { r: ReachOut; ai?: { why: string; action: string } }) {
  const app = useApp();
  const read = ai ?? fallbackWhy(r);
  const questions = questionsForMilestone(r.checkin.milestone);
  const concerns = questions.filter((p) => r.checkin.answers[p.key] === 'partly' || r.checkin.answers[p.key] === 'notyet');
  const options = [read.action, ...concerns.map((p) => PULSE_ACTION[p.key]), 'Ask the expert to follow up on their ticket'];
  const x = r.action;
  const milestone = CHECKIN_MILESTONES.find((m) => m.key === r.checkin.milestone)!;
  return (
    <li className={cx('rc-ci-row', r.checkin.isNew && 'is-new')}>
      <Person initials={r.hire.initials} />
      <div className="rc-ci-rowb">
        <div className="rc-need-pt">
          <span className="rc-need-pn">{r.hire.name}</span>
          <span className="rc-need-pr">{r.hire.role} · {r.hire.team} · {milestone.label}: {milestone.title}</span>
          {r.checkin.isNew ? <span className="rc-new">Just in</span> : null}
        </div>
        <ul className="rc-ci-chips" aria-label="What they told us">
          {concerns.map((p) => (
            <li key={p.key} className={cx('rc-ci-chip', r.checkin.answers[p.key] === 'notyet' && 'is-not')}>{p.short}: {LABEL[r.checkin.answers[p.key]]}</li>
          ))}
          {r.signals.map((s) => <li key={s} className="rc-ci-chip is-sig"><Icon name="route" size={12} />{s}</li>)}
        </ul>
        {r.checkin.note ? <p className="rc-ci-note">“{r.checkin.note}”</p> : null}
        {concerns.map((p) => r.checkin.followUps?.[p.key] ? <p key={p.key} className="rc-ci-note"><b>{p.followUp}</b> “{r.checkin.followUps[p.key]}”</p> : null)}
        <p className="rc-ci-why">{ai ? <AiLabel>AI summary</AiLabel> : <span className="rc-ci-src">From their answers</span>}{read.why}</p>
        {x ? (
          <div className={cx('rc-ci-act', x.status === 'done' && 'is-done')}>
            <span className={cx('rc-state-dot', x.status === 'done' ? 'is-calm' : 'is-room')} aria-hidden />
            <span><b>{x.status === 'done' ? 'Done' : 'Planned'}:</b> {x.label} · {x.owner} · {x.when}</span>
            {x.status === 'planned' ? <button type="button" className="rc-link-btn" onClick={() => app.completeAction(x.id)}>Mark done</button> : null}
          </div>
        ) : (
          <PlanControl suggestion={read.action} options={options} onPlan={(label) => app.planAction({ person: r.hire.id, label, milestone: r.checkin.milestone })} />
        )}
      </div>
    </li>
  );
}

export function CheckIns({ insights }: { insights: CheckinInsights }) {
  const app = useApp();
  const latest = [...app.latestCheckins.values()];
  const totals = totalsOf(latest);
  const milestoneResults = CHECKIN_MILESTONES.map((milestone) => ({
    milestone,
    checkins: latestByPersonAtMilestone(app.checkins, milestone.key),
  }));
  const { ai, fresh, loading } = insights;
  const aiPeople = new Map((ai?.people ?? []).map((p) => [p.id, p]));
  const themes = latest.length >= MIN_GROUP ? (ai?.themes.length ? ai.themes : fallbackThemes(latest)) : [];
  const results = followUpResults(app.checkins, app.actions, COHORT);
  const comparableResults = results.filter((r) => r.comparableCount > 0);
  const better = comparableResults.filter((r) => r.better).length;
  const planned = app.actions.filter((a) => a.status === 'planned').length, done = app.actions.filter((a) => a.status === 'done').length;
  const awaitingFollowUp = app.reachOut.filter((r) => !r.action).length;
  const themeAction = (name: string) => app.actions.filter((a) => a.theme === name).slice(-1)[0];

  const STATS: [string, string, string, string, string][] = [
    ['Checked in', `${latest.length} of ${COHORT.length}`, COHORT_LABEL, 'check', ''],
    ['Awaiting follow-up', String(awaitingFollowUp), 'Shared their name, no follow-up yet', 'users', awaitingFollowUp ? 'is-hot' : ''],
    ['Follow-ups planned', String(planned), 'Chosen by a manager', 'calendar', ''],
    ['Follow-ups done', String(done), comparableResults.length ? `${better} of ${comparableResults.length} improved at the next milestone` : 'No comparable answers yet', 'ready', ''],
  ];

  return (
    <div className="rc-home rc-ci" role="tabpanel" id="rc-pane-checkins" aria-labelledby="rc-tab-checkins">
      <PageHead title="Check-ins" sub="Onboarding milestone check-ins employees chose to send, read with the questions they asked. Offer support and see what changes by the next milestone.">
        <div className="rc-home-meta"><AiLabel>Sample cohort</AiLabel></div>
      </PageHead>

      <dl className="rc-home-stats">
        {STATS.map(([k, v, sub, icon, cls]) => (
          <div key={k} className={cx('rc-home-stat', cls)}>
            <dt>{k}<span className="rc-home-ic"><Icon name={icon} size={18} /></span></dt>
            <dd>{v}</dd><p>{sub}</p>
          </div>
        ))}
      </dl>

      <div className="rc-ci-grid">
        <section className="rc-home-card rc-glass rc-glass-2" aria-labelledby="rc-ci-reach-h">
          <header className="rc-panel-head">
            <div><h2 className="rc-panel-h" id="rc-ci-reach-h">Reach out this week</h2><p className="rc-panel-s">People who shared their name and said something isn’t working yet</p></div>
            {loading ? <span className="rc-ci-busy"><span className="rc-ai-pulse">AI reading check-ins</span><span className="rc-ai-dots" aria-hidden>…</span></span> : null}
          </header>
          {app.reachOut.length ? (
            <ul className="rc-ci-list">{app.reachOut.map((r) => <ReachOutRow key={r.hire.id} r={r} ai={fresh || !r.checkin.isNew ? aiPeople.get(r.hire.id) : undefined} />)}</ul>
          ) : (
            <div className="rc-allclear"><span className="rc-fb-tick"><Icon name="check" size={14} strokeWidth={2.4} /></span>Nobody needs a follow-up right now.</div>
          )}
        </section>

        <div className="rc-ci-side">
          <section className="rc-home-card rc-glass rc-glass-2" aria-labelledby="rc-ci-pulse-h">
            <h2 className="rc-panel-h" id="rc-ci-pulse-h">Cohort pulse</h2>
            <p className="rc-panel-s">Latest check-in from each person, named or not</p>
            {latest.length >= MIN_GROUP ? (
              <>
                <ul className="rc-ci-bars">
                  {CORE_PULSE.map((p) => {
                    const t = totals[p.key];
                    return (
                      <li key={p.key}>
                        <span className="rc-ci-bars-l">{p.short}</span>
                        <span className="rc-ci-bars-t" role="img" aria-label={`${p.short}: ${t.yes} yes, ${t.partly} partly, ${t.notyet} not yet, ${t.na} not applicable`}>
                          {PULSE_ANSWERS.map((a) => (t[a.key] ? <i key={a.key} className={'is-' + a.key} style={{ flexGrow: t[a.key] }} /> : null))}
                        </span>
                        <span className="rc-ci-bars-n">{t.partly} partly</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="rc-ci-legend">{PULSE_ANSWERS.map((a) => <span key={a.key}><i className={'is-' + a.key} />{a.label}</span>)}</p>
              </>
            ) : <p className="rc-sec-empty">Shown once {MIN_GROUP} or more people have checked in.</p>}
            <h3 className="rc-panel-h rc-ci-stage-heading">Stage-specific questions</h3>
            <p className="rc-panel-s">Each milestone has a different question; results are kept separate.</p>
            {milestoneResults.some((result) => result.checkins.length >= MIN_GROUP) ? (
              <ul className="rc-ci-stage-list">
                {milestoneResults.filter((result) => result.checkins.length >= MIN_GROUP).map(({ milestone, checkins }) => {
                  const counts = Object.fromEntries(PULSE_ANSWERS.map((answer) => [answer.key, 0])) as Record<PulseAnswer, number>;
                  checkins.forEach((checkin) => { counts[checkin.answers.stage] += 1; });
                  const question = STAGE_PULSE[milestone.key];
                  return (
                    <li key={milestone.key}>
                      <p className="rc-ci-stage-title"><b>{milestone.label} · {milestone.title}:</b> {question.text}</p>
                      <span className="rc-ci-bars-t" role="img" aria-label={`${milestone.label}: ${counts.yes} yes, ${counts.partly} partly, ${counts.notyet} not yet, ${counts.na} not applicable`}>
                        {PULSE_ANSWERS.map((answer) => counts[answer.key] ? <i key={answer.key} className={'is-' + answer.key} style={{ flexGrow: counts[answer.key] }} /> : null)}
                      </span>
                      <span className="rc-ci-bars-n">{checkins.length} checked in</span>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="rc-ci-stage-empty">Stage-specific results appear when at least {MIN_GROUP} people have checked in at the same milestone.</p>}
          </section>

          <section className="rc-home-card rc-glass rc-glass-2" aria-labelledby="rc-ci-themes-h">
            <h2 className="rc-panel-h" id="rc-ci-themes-h">{ai?.themes.length && latest.length >= MIN_GROUP ? <AiLabel>What new hires are telling us</AiLabel> : 'What new hires are telling us'}</h2>
            <p className="rc-panel-s">{ai?.themes.length && latest.length >= MIN_GROUP ? 'Grouped by AI from answers and notes in any language. No names.' : 'From the answers. The AI summary appears when it’s ready.'}</p>
            {latest.length >= MIN_GROUP ? <ul className="rc-ci-themes">
              {themes.map((t) => {
                const x = themeAction(t.name);
                return (
                  <li key={t.name}>
                    <div className="rc-ci-theme-h"><b>{t.name}</b><span className="rc-ci-count">{plural(t.count, 'person', 'people')}</span></div>
                    <p className="rc-ci-theme-s">{t.summary}</p>
                    <div className="rc-ci-theme-a">
                      <span>Suggested: {t.action}</span>
                      {x ? <span className="rc-ci-theme-st"><Icon name={x.status === 'done' ? 'check' : 'calendar'} size={13} />{x.status === 'done' ? 'Done' : 'Planned'} · {x.owner}</span>
                        : <button type="button" className="rc-link-btn" onClick={() => app.planAction({ theme: t.name, label: t.action, milestone: latest[0]?.milestone ?? 'week1', owner: 'Sofia Hart' })}>Plan it</button>}
                    </div>
                  </li>
                );
              })}
            </ul> : <p className="rc-sec-empty">Anonymous cohort insights appear once at least {MIN_GROUP} people have checked in.</p>}
          </section>

          <section className="rc-home-card rc-glass rc-glass-2" aria-labelledby="rc-ci-loop-h">
            <h2 className="rc-panel-h" id="rc-ci-loop-h">Did follow-ups help at the next milestone?</h2>
            <p className="rc-panel-s">Average across the three stable core questions: Yes = 2, Partly = 1, Not yet = 0; Not applicable is excluded.</p>
            <ul className="rc-ci-loop">
              {results.map((r) => (
                <li key={r.action.id}>
                  <div className="rc-ci-loop-h"><Person initials={r.hire.initials} /><span><b>{r.hire.name}</b><span className="rc-ci-loop-a">{r.action.label} · {milestoneRange(r.action.milestone)}</span></span></div>
                  <p className={cx('rc-ci-score', r.scoreChange !== null && r.scoreChange > 0 && 'is-better', r.scoreChange !== null && r.scoreChange < 0 && 'is-lower')}>
                    {r.scoreChange === null
                      ? 'No core questions were applicable at both milestones'
                      : `Average: ${r.beforeScore!.toFixed(1)}/2 → ${r.afterScore!.toFixed(1)}/2 (${r.scoreChange > 0 ? '+' : ''}${r.scoreChange.toFixed(1)}) · ${r.scoreChange > 0 ? 'Improved' : r.scoreChange < 0 ? 'Lower' : 'No change'}`}
                  </p>
                  <ul className="rc-ci-chips">
                    {r.dimensions.map((dimension) => (
                      <li key={dimension.p.key} className={cx('rc-ci-chip',
                        dimension.status === 'improved' && 'is-better',
                        dimension.status === 'worsened' && 'is-not',
                      )}>
                        {dimension.p.short}: {dimension.status === 'new' ? 'New difficulty' : dimension.status === 'not-comparable' ? 'Not comparable' : dimension.status[0].toUpperCase() + dimension.status.slice(1)} ({LABEL[dimension.from]} → {LABEL[dimension.to]})
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <p className="rc-home-note">Compares only stable core questions at consecutive milestones; Not applicable is excluded. Score change does not prove the follow-up caused it. Sample data, not measured results.</p>
          </section>
        </div>
      </div>

      <Footnote>Built only from check-ins people chose to send and questions they chose to ask. No monitoring and no emotion detection. Names appear only when the employee chose to share; cohort totals need {MIN_GROUP} or more check-ins.</Footnote>
    </div>
  );
}
