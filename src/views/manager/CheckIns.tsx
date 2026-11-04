import type { PulseAnswer } from '../../types';
import { useApp } from '../../state/AppState';
import { CHECKIN_MILESTONES, COHORT, CORE_PULSE, MIN_GROUP, PULSE_ANSWERS } from '../../data/checkins';
import { followUpResults, milestoneParticipation, totalsOf } from '../../lib/checkins';
import { cx } from '../../lib/util';
import { Footnote, Icon, PageHead, Person } from '../../components/primitives';

const LABEL = Object.fromEntries(PULSE_ANSWERS.map((answer) => [answer.key, answer.label])) as Record<PulseAnswer, string>;

const progressLabel = (status: 'improved' | 'persisted' | 'worsened') => ({
  improved: 'Improved',
  persisted: 'Unchanged',
  worsened: 'Worsened',
}[status]);

export function CheckIns() {
  const app = useApp();
  const latest = [...app.latestCheckins.values()];
  const completedCurrent = COHORT.filter((hire) => app.checkins.some((checkin) => checkin.person === hire.id && checkin.milestone === hire.milestone)).length;
  const pending = Math.max(0, COHORT.length - completedCurrent);
  const now = new Date();
  const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const newHiresThisMonth = COHORT.filter((hire) => hire.joinedAt.slice(0, 7) === monthKey(now)).length;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const newHiresLastMonth = COHORT.filter((hire) => hire.joinedAt.slice(0, 7) === monthKey(lastMonth)).length;
  const totals = totalsOf(latest);
  const results = followUpResults(app.checkins, app.actions, COHORT);

  const milestones = milestoneParticipation(app.checkins, COHORT);

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
      <section className="rc-home-card rc-glass rc-glass-2 rc-ci-section" aria-labelledby="rc-ci-pulse-h">
        <header className="rc-panel-head">
          <div>
            <h2 className="rc-panel-h" id="rc-ci-pulse-h">Onboarding pulse</h2>
            <p className="rc-panel-s">Latest response from each employee across the same four questions.</p>
          </div>
          {latest.length >= MIN_GROUP ? <span className="rc-ci-response-count">{latest.length} responses</span> : null}
        </header>
        {latest.length >= MIN_GROUP ? (
          <>
            <ul className="rc-ci-bars">
              {CORE_PULSE.map((question) => {
                const counts = totals[question.key];
                return (
                  <li className="rc-ci-pulse-row" key={question.key}>
                    <div className="rc-ci-pulse-question">
                      <b>{question.dimension}</b>
                      <span>{question.text}</span>
                    </div>
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
                  </li>
                );
              })}
            </ul>
            <p className="rc-home-note">Partly and Not yet indicate a reported difficulty, not disengagement or resignation risk.</p>
          </>
        ) : (
          <p className="rc-sec-empty">Cohort responses are shown once at least {MIN_GROUP} employees have checked in.</p>
        )}
      </section>

      <section className="rc-home-card rc-glass rc-glass-2 rc-ci-section" aria-labelledby="rc-ci-timeline-h">
        <header className="rc-panel-head">
          <div>
            <h2 className="rc-panel-h" id="rc-ci-timeline-h">Check-in timeline</h2>
            <p className="rc-panel-s">Participation among employees who have reached each milestone.</p>
          </div>
        </header>
        <ol className="rc-ci-timeline">
          {milestones.map(({ milestone, eligible, done, overdue, status }) => {
            const completed = status === 'Completed';
            const isUpcoming = status === 'Upcoming';
            return (
              <li key={milestone.key} className={cx('rc-ci-milestone', isUpcoming && 'is-upcoming', completed && 'is-completed')}>
                <span className="rc-ci-milestone-mark" aria-hidden>{completed ? <Icon name="check" size={13} /> : null}</span>
                <div className="rc-ci-milestone-copy">
                  <b>{milestone.label}</b>
                  <span>{milestone.title}</span>
                </div>
                <span className="rc-ci-milestone-status">
                  {isUpcoming ? status : `${status} · ${done}/${eligible}${overdue ? ` · ${overdue} overdue` : ''}`}
                </span>
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
          <p className="rc-home-note">Only named check-ins are compared, and only the same employee and question with applicable answers. Changes do not prove the support action caused an improvement.</p>
        </div>
      </details>

      <Footnote>Check-ins are voluntary and support onboarding, not performance evaluation. Names are used only when an employee chooses to share by name; answer distributions require at least {MIN_GROUP} check-ins.</Footnote>
    </div>
  );
}
