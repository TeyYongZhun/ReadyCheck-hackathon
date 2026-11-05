import { useState } from 'react';
import type { MilestoneKey, PulseAnswer, PulseKey } from '../../types';
import { useApp } from '../../state/AppState';
import { CHECKIN_MILESTONES, COHORT, MIN_GROUP, PULSE_ANSWERS, daysSince, questionsForMilestone } from '../../data/checkins';
import { followUpResults, milestoneParticipation, namedShareOf, pulseCheckinsForView, totalsOf } from '../../lib/checkins';
import { cx } from '../../lib/util';
import { Footnote, Icon, PageHead, Person } from '../../components/primitives';

const LABEL = Object.fromEntries(PULSE_ANSWERS.map((answer) => [answer.key, answer.label])) as Record<PulseAnswer, string>;
const RELATED_TRENDS: Record<PulseKey, string[]> = {
  tools: ['vpn', 'hw', 'db'],
  clarity: ['onb'],
  support: ['onb'],
  workload: ['onb'],
};

const progressLabel = (status: 'improved' | 'persisted' | 'worsened') => ({
  improved: 'Improved',
  persisted: 'Unchanged',
  worsened: 'Worsened',
}[status]);

export function CheckIns({ onOpenTrends }: { onOpenTrends: () => void }) {
  const app = useApp();
  const [pulseMilestone, setPulseMilestone] = useState<MilestoneKey>('week1');
  const latest = [...app.latestCheckins.values()];
  const pulseCheckins = pulseCheckinsForView(app.checkins, latest, pulseMilestone);
  const pulseTotals = totalsOf(pulseCheckins);
  const nameShare = namedShareOf(pulseCheckins);
  const selectedMilestone = CHECKIN_MILESTONES.find((milestone) => milestone.key === pulseMilestone)!;

  // Headcounts only: how many employees have checked in at the milestone they are currently in.
  const completedCurrent = COHORT.filter((hire) => app.checkins.some((checkin) => checkin.person === hire.id && checkin.milestone === hire.milestone)).length;
  const pending = Math.max(0, COHORT.length - completedCurrent);

  // Rolling windows instead of calendar months, so the numbers don't jump on the 1st of the month.
  const newHiresRecent = COHORT.filter((hire) => daysSince(hire.joinedAt) <= 7).length;
  const newHiresPrevious = COHORT.filter((hire) => {
    const age = daysSince(hire.joinedAt);
    return age >= 8 && age <= 14;
  }).length;

  const results = followUpResults(app.checkins, app.actions, COHORT);
  const milestones = milestoneParticipation(app.checkins, COHORT);
  const selectedMilestoneState = milestones.find(({ milestone }) => milestone.key === selectedMilestone.key)!.state;

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
          <dd>{newHiresRecent}</dd>
          <p>New employees who joined this month</p>
        </div>
        <div className="rc-home-stat">
          <dt>New hires last month<span className="rc-home-ic"><Icon name="users" size={18} /></span></dt>
          <dd>{newHiresPrevious}</dd>
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
        <p className="rc-home-note">Partly and Not yet indicate a reported difficulty, not disengagement or resignation risk.</p>
      </section>

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
      </div>

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
                      <span><b>{result.hire.name}</b><span>{result.action.label} · {from.label} to {to.label}</span></span>
                    </div>
                    <ul className="rc-ci-chips">
                      {result.dimensions.map((dimension) => (
                        <li key={dimension.p.key} className={cx(
                          'rc-ci-chip',
                          dimension.status === 'improved' && 'is-better',
                          dimension.status === 'worsened' && 'is-not',
                        )}>
                          {dimension.p.dimension}: {progressLabel(dimension.status)} ({LABEL[dimension.from]} → {LABEL[dimension.to]})
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
