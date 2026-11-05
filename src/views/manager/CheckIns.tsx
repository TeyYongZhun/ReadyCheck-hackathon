import { useState } from 'react';
import type { CheckinInsightsResponse } from '../../api-types';
import type { MilestoneKey, PulseAnswer, PulseKey } from '../../types';
import { useApp } from '../../state/AppState';
import { CHECKIN_MILESTONES, COHORT, MIN_GROUP, PULSE_ANSWERS, questionsForMilestone } from '../../data/checkins';
import { followUpResults, groupFollowUp, milestoneParticipation, namedShareOf, pulseCheckinsForView, totalsOf } from '../../lib/checkins';
import { askCheckinInsights } from '../../lib/api';
import { cx, plural } from '../../lib/util';
import { Footnote, Icon, PageHead, Person } from '../../components/primitives';

const LABEL = Object.fromEntries(PULSE_ANSWERS.map((answer) => [answer.key, answer.label])) as Record<PulseAnswer, string>;

/**
 * `action` is what the manager does (internal). `note` is a draft of the one sentence employees will see.
 * Matched on the question's dimension name, so renaming a milestone's questions can't pair a
 * difficulty with the wrong response (e.g. Social Acceptance getting the workload advice).
 */
type Guidance = { action: string; note: string };
const GUIDANCE: { test: RegExp; value: Guidance }[] = [
  {
    test: /clarity|expect|role/i,
    value: {
      action: 'Share role priorities and invite a short priorities review.',
      note: 'We shared a summary of role priorities and opened a short priorities review for your cohort.',
    },
  },
  {
    test: /tool|resource|access/i,
    value: {
      action: 'Share the access checklist and offer a group troubleshooting slot.',
      note: 'We updated the first-week access checklist and added a group troubleshooting slot.',
    },
  },
  {
    test: /help|support/i,
    value: {
      action: 'Offer an optional team Q&A or buddy check-in.',
      note: 'We added an optional team Q&A and named who to ask for help.',
    },
  },
  {
    test: /social|accept|belong|team/i,
    value: {
      action: 'Pair each new hire with a buddy and plan a short cohort coffee or lunch.',
      note: 'We matched everyone with an onboarding buddy and set up a cohort coffee to meet the wider team.',
    },
  },
  {
    test: /workload|training|manageable/i,
    value: {
      action: 'Review the training load and agree on the next priority.',
      note: 'We reviewed the training schedule and agreed on the next priorities.',
    },
  },
];
const GENERIC_GUIDANCE: Guidance = {
  action: 'Discuss this with the cohort and agree on one concrete next step.',
  note: 'We heard your feedback and are working on a next step for this.',
};
const guidanceFor = (question: { dimension: string }): Guidance =>
  GUIDANCE.find((item) => item.test.test(question.dimension))?.value ?? GENERIC_GUIDANCE;

const progressLabel = (status: 'improved' | 'persisted' | 'worsened') => ({
  improved: 'Improved',
  persisted: 'Unchanged',
  worsened: 'Worsened',
}[status]);

const shortDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');

export function CheckIns() {
  const app = useApp();
  const [pulseMilestone, setPulseMilestone] = useState<MilestoneKey>('week1');
  const [aiInsightsByKey, setAiInsightsByKey] = useState<Record<string, CheckinInsightsResponse['themes'][number]>>({});
  const [aiLoadingKey, setAiLoadingKey] = useState<PulseKey | null>(null);
  const [planningDraft, setPlanningDraft] = useState<{ theme: string; pulse?: PulseKey; label: string; publicNote?: string; milestone: MilestoneKey } | null>(null);
  const [publishingActionId, setPublishingActionId] = useState<string | null>(null);
  const [publicNote, setPublicNote] = useState('');
  const latest = [...app.latestCheckins.values()];
  const pulseCheckins = pulseCheckinsForView(app.checkins, latest, pulseMilestone);
  const pulseTotals = totalsOf(pulseCheckins);
  const nameShare = namedShareOf(pulseCheckins);
  const namedCheckins = app.checkins.filter((checkin) => checkin.named).length;
  const anonymousCheckins = app.checkins.filter((checkin) => !checkin.named).length;
  const newNamedCheckins = app.checkins.filter((checkin) => checkin.isNew && checkin.named).length;
  const newAnonymousCheckins = app.checkins.filter((checkin) => checkin.isNew && !checkin.named).length;
  const selectedMilestone = CHECKIN_MILESTONES.find((milestone) => milestone.key === pulseMilestone)!;

  // Headcounts only: how many employees have checked in at the milestone they are currently in.
  const completedCurrent = COHORT.filter((hire) => app.checkins.some((checkin) => checkin.person === hire.id && checkin.milestone === hire.milestone)).length;
  const pending = Math.max(0, COHORT.length - completedCurrent);

  // Calendar months, matching the card titles.
  const now = new Date();
  const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const newHiresThisMonth = COHORT.filter((hire) => hire.joinedAt.slice(0, 7) === monthKey(now)).length;
  const newHiresLastMonth = COHORT.filter((hire) => hire.joinedAt.slice(0, 7) === monthKey(previousMonth)).length;

  const results = followUpResults(app.checkins, app.actions, COHORT);
  const groupResults = groupFollowUp(app.checkins, app.actions);
  const milestones = milestoneParticipation(app.checkins, COHORT);
  const selectedMilestoneState = milestones.find(({ milestone }) => milestone.key === selectedMilestone.key)!.state;

  // Only group-level actions (no person) belong here, and only difficulties reported by at least MIN_GROUP
  // employees are listed, so a single answer can never be singled out.
  const supportNeeds = pulseCheckins.length >= MIN_GROUP
    ? questionsForMilestone(selectedMilestone.key)
      .map((question) => ({
        question,
        partly: pulseTotals[question.key].partly,
        notyet: pulseTotals[question.key].notyet,
        action: app.actions.find((action) => !action.person && action.milestone === selectedMilestone.key && (action.pulse === question.key || (!action.pulse && action.theme
          && (action.theme === question.key || action.theme === question.dimension || action.theme.toLowerCase().includes(question.dimension.toLowerCase()))))),
      }))
      .filter(({ partly, notyet }) => partly + notyet >= MIN_GROUP)
    : [];

  async function generateSupportPlan(question: { key: PulseKey; dimension: string }) {
    if (pulseCheckins.length < MIN_GROUP || aiLoadingKey) return;
    setAiLoadingKey(question.key);
    const totals = Object.fromEntries(CHECKIN_MILESTONES.map((milestone) => [
      milestone.key,
      totalsOf(app.checkins.filter((checkin) => checkin.milestone === milestone.key)),
    ])) as Record<MilestoneKey, ReturnType<typeof totalsOf>>;
    const anonymousNotes = app.checkins
      .filter((checkin) => !checkin.named)
      .flatMap((checkin) => [checkin.note, ...Object.values(checkin.followUps ?? {})])
      .filter((note): note is string => !!note?.trim());
    const response = await askCheckinInsights({
      cohort: COHORT.length,
      responses: app.checkins.length,
      focusDimension: question.dimension,
      focusMilestone: selectedMilestone.key,
      totals,
      anonymousNotes,
      people: [],
    });
    const theme = response?.themes[0];
    if (theme) setAiInsightsByKey((current) => ({ ...current, [question.key]: theme }));
    setAiLoadingKey(null);
  }

  function confirmPlanning() {
    if (!planningDraft?.label.trim()) return;
    app.planAction(planningDraft);
    setPlanningDraft(null);
  }

  return (
    <div className="rc-home rc-ci rc-ci-dashboard" role="tabpanel" id="rc-pane-checkins" aria-labelledby="rc-tab-checkins">
      <PageHead title="Check-ins" sub="Understand how new hires are experiencing their onboarding journey.">
        <span className="rc-ci-sample">Illustrative sample data</span>
      </PageHead>

      <dl className="rc-home-stats rc-ci-kpis">
        <div className="rc-home-stat">
          <dt>Completed check-ins<span className="rc-home-ic"><Icon name="check" size={18} /></span></dt>
          <dd>{completedCurrent}</dd>
          <p>Employees checked in at their current milestone</p>
        </div>
        <div className="rc-home-stat">
          <dt>Pending check-ins<span className="rc-home-ic"><Icon name="clock" size={18} /></span></dt>
          <dd>{pending}</dd>
          <p>Employees yet to check in</p>
        </div>
        <div className="rc-home-stat">
          <dt>New hires this month<span className="rc-home-ic"><Icon name="users" size={18} /></span></dt>
          <dd>{newHiresThisMonth}</dd>
          <p>New employees who joined this month</p>
        </div>
        <div className="rc-home-stat">
          <dt>New hires last month<span className="rc-home-ic"><Icon name="users" size={18} /></span></dt>
          <dd>{newHiresLastMonth}</dd>
          <p>New employees who joined last month</p>
        </div>
      </dl>

      <div className="rc-ci-journey-grid">
      <section className="rc-home-card rc-glass rc-glass-2 rc-ci-section rc-ci-pulse-section" aria-labelledby="rc-ci-pulse-h">
        <header className="rc-panel-head">
          <div>
            <h2 className="rc-panel-h" id="rc-ci-pulse-h">Onboarding pulse</h2>
            <p className="rc-panel-s">Questions are tailored to each onboarding milestone.</p>
          </div>
          {pulseCheckins.length >= MIN_GROUP ? <span className="rc-ci-response-count"> Total: {pulseCheckins.length} responses</span> : null}
        </header>
        <div className="rc-ci-pulse-controls">
          <div className="rc-seg rc-ci-pulse-seg" role="group" aria-label="Onboarding pulse milestone">
            {CHECKIN_MILESTONES.map((milestone) => (
              <button key={milestone.key} type="button" aria-pressed={pulseMilestone === milestone.key} className={cx(pulseMilestone === milestone.key && 'is-on')} onClick={() => setPulseMilestone(milestone.key)}>
                {milestone.label}
              </button>
            ))}
          </div>
          {pulseCheckins.length >= MIN_GROUP ? (
            <p className="rc-ci-name-share">{nameShare.named} of {nameShare.total} shared their name</p>
          ) : null}
        </div>
        <div className="rc-ci-pulse-group">
          <div className="rc-ci-pulse-title">
            <b>{selectedMilestone.label} · {selectedMilestone.title}</b>
            <span className={cx('rc-kb-st', selectedMilestoneState === 'Upcoming' ? 'is-upcoming' : 'is-released')}>
              <i />{selectedMilestoneState === 'Upcoming' ? 'Upcoming' : 'Released'}
            </span>
          </div>
          <p className="rc-ci-pulse-focus">Focus: {selectedMilestone.focus}</p>
          <ul className="rc-ci-bars">
            {questionsForMilestone(selectedMilestone.key).map((question) => {
              const counts = pulseTotals[question.key];
              return (
                <li className="rc-ci-pulse-row" key={question.key}>
                  <div className="rc-ci-pulse-question">
                    <b>{question.dimension}</b>
                    <span>{question.text}</span>
                  </div>
                  {pulseCheckins.length >= MIN_GROUP ? (
                    <div className="rc-ci-pulse-data">
                      <span className="rc-ci-bars-t" role="img" aria-label={`${question.dimension}: ${counts.yes} Yes, ${counts.partly} Partly, ${counts.notyet} Not yet, ${counts.na} Not applicable`}>
                        {PULSE_ANSWERS.map((answer) => counts[answer.key] ? <i key={answer.key} className={'is-' + answer.key} style={{ flexGrow: counts[answer.key] }} /> : null)}
                      </span>
                      <div className="rc-ci-answer-counts">
                        {PULSE_ANSWERS.map((answer) => (
                          <span key={answer.key}><i className={'is-' + answer.key} />{answer.label} <b>{counts[answer.key]}</b></span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {pulseCheckins.length < MIN_GROUP ? (
            <p className="rc-sec-empty">Response distributions appear once at least {MIN_GROUP} employees have checked in at this milestone.</p>
          ) : null}
        </div>
        <p className="rc-home-note">Note: Partly and Not yet indicate a reported difficulty, not disengagement or resignation risk.</p>
      </section>

      <div className="rc-ci-journey-side">
      <section className="rc-home-card rc-glass rc-glass-2 rc-ci-section" aria-labelledby="rc-ci-timeline-h">
        <header className="rc-panel-head">
          <div>
            <h2 className="rc-panel-h" id="rc-ci-timeline-h">Check-in timeline</h2>
            <p className="rc-panel-s">Participation among employees currently within each milestone window. Open means the window is active.</p>
          </div>
        </header>
        <ol className="rc-ci-timeline">
          {milestones.map(({ milestone, eligible, done, missed, state }) => {
            const isUpcoming = state === 'Upcoming';
            // Tick only when everyone who has reached the milestone has checked in.
            const allIn = eligible > 0 && done === eligible;
            // Small groups only show the state, so a count like 1/2 can't point at one person.
            const showCounts = eligible >= MIN_GROUP;
            const status = isUpcoming
              ? 'Upcoming'
              : !showCounts
                ? state
                : [state, `${done}/${eligible}`, missed ? `${missed} missed` : ''].filter(Boolean).join(' · ');
            return (
              <li key={milestone.key} className={cx('rc-ci-milestone', isUpcoming && 'is-upcoming', allIn && 'is-completed')}>
                <span className="rc-ci-milestone-mark" aria-hidden>{allIn ? <Icon name="check" size={13} /> : null}</span>
                <div className="rc-ci-milestone-copy">
                  <b>{milestone.label}</b>
                  <span>{milestone.title}</span>
                </div>
                <span className="rc-ci-milestone-status">{status}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rc-home-card rc-glass rc-glass-2 rc-ci-section rc-ci-sharing" aria-labelledby="rc-ci-sharing-h">
        <header className="rc-panel-head">
          <div>
            <h2 className="rc-panel-h" id="rc-ci-sharing-h">Sharing overview</h2>
            <p className="rc-panel-s">How are employees choosing to share?</p>
          </div>
        </header>
        <div className="rc-ci-sharing-grid">
          <div className="rc-ci-sharing-card">
            <span className="rc-ci-sharing-icon is-named"><Icon name="users" size={18} /></span>
            <div><span className="rc-ci-sharing-title"><b>Named</b>{newNamedCheckins ? <em>+{newNamedCheckins}</em> : null}</span><strong>{namedCheckins}</strong><span>Can support individual follow-up.</span></div>
          </div>
          <div className="rc-ci-sharing-card">
            <span className="rc-ci-sharing-icon is-anonymous"><Icon name="shield" size={18} /></span>
            <div><span className="rc-ci-sharing-title"><b>Anonymous</b>{newAnonymousCheckins ? <em>+{newAnonymousCheckins}</em> : null}</span><strong>{anonymousCheckins}</strong><span>Used for aggregated insights.</span></div>
          </div>
        </div>
      </section>
      </div>
      </div>

      <section className="rc-home-card rc-glass rc-glass-2 rc-ci-section rc-ci-support" aria-labelledby="rc-ci-support-h">
        <header className="rc-panel-head">
          <div>
            <h2 className="rc-panel-h" id="rc-ci-support-h">Support priorities</h2>
            <p className="rc-panel-s">Group-level difficulties from {selectedMilestone.label} that may need a response.</p>
          </div>
          <div className="rc-ci-support-actions">
            <span className="rc-ci-private-badge"><Icon name="users" size={14} /> Cohort-level</span>
          </div>
        </header>
        <div className="rc-ci-support-controls">
          <span>Check-in stage</span>
          <div className="rc-seg rc-ci-support-seg" role="group" aria-label="Support priorities milestone">
            {CHECKIN_MILESTONES.map((milestone) => (
              <button key={milestone.key} type="button" aria-pressed={pulseMilestone === milestone.key} className={cx(pulseMilestone === milestone.key && 'is-on')} onClick={() => setPulseMilestone(milestone.key)}>
                {milestone.label}
              </button>
            ))}
          </div>
        </div>
        {supportNeeds.length ? (
          <ul className="rc-ci-support-list">
            {supportNeeds.map(({ question, partly, notyet, action }) => {
              const guidance = guidanceFor(question);
              const isDone = action?.status === 'done';
              const groupResult = isDone ? groupResults.find((item) => item.action.id === action!.id) : undefined;
              const aiTheme = aiInsightsByKey[question.key];
              return (
                <li className="rc-ci-support-item" key={question.key}>
                  <div className="rc-ci-support-copy">
                    <b>{question.dimension}</b>
                    <strong>{plural(partly + notyet, 'employee', 'employees')} reporting difficulty</strong>
                    <span>{partly} Partly · {notyet} Not yet</span>
                    {isDone ? (
                      <>
                        <small className="rc-ci-support-label">Published to the cohort</small>
                        <small className="rc-ci-support-guidance">{action!.publicNote ?? action!.label}</small>
                      </>
                    ) : (
                      <>
                        <small className="rc-ci-support-label">{action ? 'Planned response' : 'Suggested response'}</small>
                        <small className="rc-ci-support-guidance">{action?.label ?? guidance.action}</small>
                      </>
                    )}
                    <button type="button" className="rc-ci-suggest-comments" disabled={pulseCheckins.length < MIN_GROUP || (aiLoadingKey !== null && aiLoadingKey !== question.key)} onClick={() => generateSupportPlan(question)}>
                      <Icon name="sparkles" size={13} />{aiLoadingKey === question.key ? 'AI Drafting…' : 'Suggest more comments'}
                    </button>
                    {aiTheme ? (
                      <div className="rc-ci-ai-item">
                        <small className="rc-ci-support-label">AI suggested response</small>
                        <small className="rc-ci-support-guidance">{aiTheme.action}</small>
                        <small className="rc-ci-ai-note">Cohort note: {aiTheme.note}</small>
                        {planningDraft?.theme === question.dimension ? (
                          <div className="rc-ci-publish">
                            <textarea className="rc-kb-area" rows={2} value={planningDraft.label} onChange={(event) => setPlanningDraft({ ...planningDraft, label: event.target.value })} aria-label="AI response draft" />
                            <div className="rc-ci-publish-actions">
                              <button type="button" className="rc-btn-primary is-sm" disabled={!planningDraft.label.trim()} onClick={confirmPlanning}>Save plan</button>
                              <button type="button" className="rc-btn-ghost is-sm" onClick={() => setPlanningDraft(null)}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" className="rc-btn-primary is-sm" onClick={() => setPlanningDraft({ theme: question.dimension, pulse: question.key, label: aiTheme.action, publicNote: aiTheme.note, milestone: selectedMilestone.key })}>Plan response</button>
                        )}
                      </div>
                    ) : null}
                    {groupResult ? (
                      <p className="rc-ci-group-followup">
                        {groupResult.before.difficult} of {groupResult.before.total} <span>→</span> {groupResult.after.difficult} of {groupResult.after.total} reported difficulty
                        <br /><small>Same employees, same question. This doesn't prove the update caused the change.</small>
                      </p>
                    ) : null}
                  </div>
                  {action ? (
                    isDone ? (
                      <div className="rc-ci-published">
                        <span className="rc-kb-st is-released rc-ci-done"><i />Published{action.publishedAt ? ` · ${shortDate(action.publishedAt)}` : ''}</span>
                      </div>
                    ) : publishingActionId === action.id ? (
                      <div className="rc-ci-publish">
                        <textarea className="rc-kb-area" rows={3} value={publicNote} onChange={(event) => setPublicNote(event.target.value)} aria-label="Message employees will see" />
                        <small>This is what employees will see. It goes to everyone in the cohort. Don't mention individuals.</small>
                        <div className="rc-ci-publish-actions">
                          <button type="button" className="rc-btn-primary is-sm" disabled={!publicNote.trim()} onClick={() => {
                            app.completeAction(action.id, { publicNote: publicNote.trim(), publishedAt: new Date().toISOString() });
                            setPublishingActionId(null);
                            setPublicNote('');
                          }}>Confirm publish</button>
                          <button type="button" className="rc-btn-ghost is-sm" onClick={() => { setPublishingActionId(null); setPublicNote(''); }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="rc-ci-published">
                        <span className="rc-kb-st is-upcoming"><i />Planned</span>
                        <button type="button" className="rc-btn-primary is-sm" onClick={() => { setPublishingActionId(action.id); setPublicNote(action.publicNote ?? guidance.note); }}>Review and publish</button>
                      </div>
                    )
                  ) : (
                    planningDraft?.theme === question.dimension ? (
                      <div className="rc-ci-publish">
                        <textarea className="rc-kb-area" rows={2} value={planningDraft.label} onChange={(event) => setPlanningDraft({ ...planningDraft, label: event.target.value })} aria-label="Support response draft" />
                        <small>Edit the response before planning it.</small>
                        <div className="rc-ci-publish-actions">
                          <button type="button" className="rc-btn-primary is-sm" disabled={!planningDraft.label.trim()} onClick={confirmPlanning}>Save plan</button>
                          <button type="button" className="rc-btn-ghost is-sm" onClick={() => setPlanningDraft(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" className="rc-btn-ghost is-sm" onClick={() => setPlanningDraft({
                        theme: question.dimension,
                        pulse: question.key,
                        label: guidance.action,
                      publicNote: guidance.note,
                        milestone: selectedMilestone.key,
                      })}>Plan response</button>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rc-sec-empty">Support priorities will appear once at least {MIN_GROUP} employees report the same difficulty.</p>
        )}
        <p className="rc-home-note">Insights are based on aggregated check-in responses. Individual employee identities are not shown. AI suggests; the manager decides what is published.</p>
      </section>

      <details className="rc-home-card rc-glass rc-glass-2 rc-ci-section rc-ci-outcomes">
        <summary className="rc-ci-disclosure">
          <span>
            <b>Follow-up outcomes</b>
            <span>Changes in reported difficulties at a later comparable check-in.</span>
          </span>
          <Icon name="chevron" size={16} />
        </summary>
        <div className="rc-ci-outcomes-body">
          {results.length ? (
            <ul className="rc-ci-outcome-list">
              {results.map((result) => {
                const from = CHECKIN_MILESTONES.find((milestone) => milestone.key === result.action.milestone)!;
                const to = CHECKIN_MILESTONES.find((milestone) => milestone.key === result.afterMilestone)!;
                return (
                  <li key={result.action.id} className="rc-ci-outcome">
                    <div className="rc-ci-outcome-heading">
                      <Person initials={result.hire.initials} />
                      <div className="rc-ci-outcome-person"><b>{result.hire.name}</b><span>{result.hire.role} · {result.hire.team}</span></div>
                      <span className="rc-ci-outcome-transition">{from.label}<Icon name="chevron" size={13} />{to.label}</span>
                    </div>
                    <p className="rc-ci-outcome-action"><Icon name="check" size={14} />{result.action.label}</p>
                    <ul className="rc-ci-outcome-dimensions">
                      {result.dimensions.map((dimension) => (
                        <li key={dimension.p.key} className="rc-ci-outcome-dimension">
                          <span className="rc-ci-outcome-dimension-name">{dimension.p.dimension}</span>
                          <span className={cx('rc-ci-outcome-status', dimension.status === 'improved' && 'is-better', dimension.status === 'worsened' && 'is-not')}>
                            {progressLabel(dimension.status)}
                          </span>
                          <span className="rc-ci-outcome-values"><b>{LABEL[dimension.from]}</b><span>→</span><b>{LABEL[dimension.to]}</b></span>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rc-sec-empty">Outcomes appear when a named employee has a later comparable check-in after a completed support action.</p>
          )}
          <p className="rc-home-note">Only named check-ins are compared, and only the same employee and pulse dimension with applicable answers. Changes do not prove the support action caused an improvement.</p>
        </div>
      </details>

      <Footnote>Check-ins are voluntary and support onboarding, not performance evaluation. Names are used only when an employee chooses to share by name; answer distributions require at least {MIN_GROUP} check-ins.</Footnote>
    </div>
  );
}
