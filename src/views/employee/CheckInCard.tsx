// The employee's milestone check-in: four ratings, conditional follow-ups, an optional note, and a privacy choice.
// Voluntary by design. The sheet says exactly what the manager will see before anything is sent.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PulseAnswer, PulseKey, SupportAction } from '../../types';
import { ME, useApp } from '../../state/AppState';
import { CHECKIN_EDIT_WINDOW_MS, CHECKIN_MILESTONES, MIN_GROUP, PULSE_ANSWERS, milestoneOrder, questionsForMilestone } from '../../data/checkins';
import { cx } from '../../lib/util';
import { Icon } from '../../components/primitives';

const MANAGER = 'Rachel';
const LABEL = Object.fromEntries(PULSE_ANSWERS.map((a) => [a.key, a.label])) as Record<PulseAnswer, string>;

function nextQuestionFor(action: SupportAction) {
  if (!action.pulse) return undefined;
  const next = CHECKIN_MILESTONES
    .filter((milestone) => milestoneOrder(milestone.key) > milestoneOrder(action.milestone))
    .sort((a, b) => a.order - b.order)[0];
  return next ? questionsForMilestone(next.key).find((question) => question.key === action.pulse) : undefined;
}

/** Side-menu card: due, sent, and any follow-up the manager planned for Mira. */
export function CheckInEntry({ onOpen }: { onOpen: () => void }) {
  const app = useApp();
  const sent = app.checkins.find((checkin) => checkin.person === ME.id && checkin.milestone === app.demoMilestone);
  const [collapsed, setCollapsed] = useState(!!sent);
  const [now, setNow] = useState(Date.now());
  const details = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sent?.submittedAt) return;
    const deadline = sent.submittedAt + CHECKIN_EDIT_WINDOW_MS;
    if (Date.now() >= deadline) {
      setNow(Date.now());
      setCollapsed(false);
      return;
    }
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) {
        window.clearInterval(timer);
        setCollapsed(false);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sent?.submittedAt]);
  useLayoutEffect(() => {
    if (!sent?.isNew) return;
    setCollapsed(false);
    const frame = window.requestAnimationFrame(() => setCollapsed(true));
    return () => window.cancelAnimationFrame(frame);
  }, [sent?.id, sent?.at, sent?.isNew]);
  useLayoutEffect(() => {
    if (sent && collapsed) details.current?.setAttribute('inert', '');
    else details.current?.removeAttribute('inert');
  }, [sent, collapsed]);
  const remaining = sent?.submittedAt ? Math.max(0, sent.submittedAt + CHECKIN_EDIT_WINDOW_MS - now) : 0;
  const canEdit = !!sent?.submittedAt && remaining > 0;
  const remainingSeconds = Math.ceil(remaining / 1000);
  const editTime = `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`;
  const followUp = app.actions.filter((a) => a.person === ME.id && a.milestone === app.demoMilestone).slice(-1)[0];
  const cohortFollowUp = app.actions
    .filter((a) => !a.person && !a.pulse && a.status === 'done' && a.theme && milestoneOrder(a.milestone) < milestoneOrder(app.demoMilestone))
    .filter((a) => questionsForMilestone(app.demoMilestone).some((question) => question.key === a.theme))
    .slice(-1)[0];
  const publishedResponses = app.actions.filter((action) => !action.person && action.status === 'done' && action.publicNote && milestoneOrder(action.milestone) <= milestoneOrder(app.demoMilestone));
  const milestone = CHECKIN_MILESTONES.find((m) => m.key === app.demoMilestone)!;
  return (
    <section className={cx('rc-ci-entry rc-glass rc-glass-1', !sent && 'is-due', sent?.isNew && 'is-new', sent && collapsed && 'is-collapsed')} aria-labelledby="rc-ci-entry-h">
      {sent ? (
        <button type="button" className="rc-ci-entry-toggle" id="rc-ci-entry-h" aria-expanded={!collapsed} aria-controls="rc-ci-entry-details" onClick={() => setCollapsed((value) => !value)}>
          <span className="rc-ci-entry-h"><Icon name="check" size={16} className={sent.isNew ? 'is-success' : undefined} />{milestone.label} check-in</span>
          <Icon name="chevron" size={15} className={cx('rc-ci-entry-chevron', !collapsed && 'is-open')} />
        </button>
      ) : <div className="rc-ci-entry-h" id="rc-ci-entry-h"><Icon name="bell" size={16} />{milestone.label} check-in</div>}
      <div
        id={sent ? 'rc-ci-entry-details' : undefined}
        className={cx('rc-ci-entry-details', sent && collapsed && 'is-collapsed')}
        aria-hidden={!!sent && collapsed}
        ref={details}
      >
        <div className="rc-ci-entry-details-inner">
          <p className="rc-ci-entry-s" aria-live="polite">
            {sent
              ? `Sent ${sent.at.replace('Today ', 'today at ')} · ${sent.named ? 'shared with ' + MANAGER : 'anonymous'}${canEdit ? ` · edit for ${editTime}` : ''}`
              : 'Due today · takes 30 seconds'}
          </p>
          {followUp ? (
            <p className="rc-ci-entry-f">
              <Icon name={followUp.status === 'done' ? 'check' : 'users'} size={14} />
              <span>{MANAGER} {followUp.status === 'done' ? 'did' : 'planned'}: <b>{followUp.label}</b>{followUp.status === 'done' ? '' : ' · ' + followUp.when}</span>
            </p>
          ) : null}
          {cohortFollowUp ? (
            <p className="rc-ci-entry-f rc-ci-cohort-response">
              <Icon name="users" size={14} />
              <span><b>Your team responded:</b> {cohortFollowUp.label} <em>· this check-in asks whether it helped</em></span>
            </p>
          ) : null}
          {publishedResponses.length ? (
            <div className="rc-ci-said-did">
              <b>You said, we did</b>
              {publishedResponses.map((action) => {
                const question = nextQuestionFor(action);
                return (
                  <div key={action.id}>
                    <p>Based on feedback from your cohort, we made this update: <strong>{action.publicNote}</strong></p>
                    {question ? <span>At your next check-in we'll ask: {question.text} — did it help?</span> : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {sent
            ? canEdit
              ? <button type="button" className="rc-quiet rc-ci-entry-b" onClick={onOpen}><Icon name="edit" size={14} />Edit answers</button>
              : <p className="rc-ci-entry-locked">Check-in submitted · edit window closed</p>
            : <button type="button" className="rc-btn-primary is-sm rc-ci-entry-b" onClick={onOpen}>Start check-in</button>}
        </div>
      </div>
    </section>
  );
}

export function CheckInSheet({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: (edited: boolean) => void }) {
  const app = useApp();
  const start = app.checkins.find((checkin) => checkin.person === ME.id && checkin.milestone === app.demoMilestone);
  const questions = questionsForMilestone(app.demoMilestone);
  const milestone = CHECKIN_MILESTONES.find((m) => m.key === app.demoMilestone)!;
  const cohortFollowUp = app.actions
    .filter((a) => !a.person && !a.pulse && a.status === 'done' && a.theme && milestoneOrder(a.milestone) < milestoneOrder(app.demoMilestone))
    .filter((a) => questions.some((question) => question.key === a.theme))
    .slice(-1)[0];
  const publishedResponses = app.actions.filter((action) => !action.person && action.status === 'done' && action.publicNote && milestoneOrder(action.milestone) <= milestoneOrder(app.demoMilestone));
  const publishedResponseFor = (pulse: PulseKey) => publishedResponses.find((action) => action.pulse === pulse && milestoneOrder(action.milestone) < milestoneOrder(app.demoMilestone));
  const [answers, setAnswers] = useState<Partial<Record<PulseKey, PulseAnswer>>>(start?.answers ?? {});
  const [followUps, setFollowUps] = useState<Partial<Record<PulseKey, string>>>(start?.followUps ?? {});
  const [note, setNote] = useState(start?.note ?? '');
  const [named, setNamed] = useState<boolean | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [milestoneMenuOpen, setMilestoneMenuOpen] = useState(false);
  const first = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const done = questions.every((p) => answers[p.key]);

  function fillQuickDemo() {
    const sampleAnswers: PulseAnswer[] = ['yes', 'partly', 'yes', 'yes'];
    const toolsQuestion = questions.find((question) => question.key === 'tools');
    setAnswers(Object.fromEntries(questions.slice(0, sampleAnswers.length).map((question, index) => [
      question.key,
      sampleAnswers[index],
    ])));
    setFollowUps(toolsQuestion ? { [toolsQuestion.key]: "I haven't received the login credentials for our user testing platform." } : {});
    setNote('');
    setSubmitError('');
  }

  useEffect(() => {
    setAnswers(start?.answers ?? {});
    setFollowUps(start?.followUps ?? {});
    setNote(start?.note ?? '');
    setNamed(null);
    setSubmitError('');
  }, [app.demoMilestone]);

  useEffect(() => {
    first.current?.focus({ preventScroll: true });
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!done || named === null) return;
    const relevantFollowUps = Object.fromEntries(questions
      .filter((p) => (answers[p.key] === 'partly' || answers[p.key] === 'notyet') && followUps[p.key]?.trim())
      .map((p) => [p.key, followUps[p.key]!.trim()])) as Partial<Record<PulseKey, string>>;
    const submitted = app.submitCheckIn({ answers: answers as Record<PulseKey, PulseAnswer>, followUps: relevantFollowUps, note, named });
    if (!submitted) {
      setSubmitError('The 5-minute edit window has expired. Your check-in was not changed.');
      return;
    }
    onSubmitted(!!start);
    onClose();
  }

  // const notYes = questions.filter((p) => answers[p.key] && answers[p.key] !== 'yes');
  const notYes = questions.filter(
  (p) =>
    answers[p.key] === 'partly' ||
    answers[p.key] === 'notyet'
);

  const followUpPreview = questions.filter((p) => (answers[p.key] === 'partly' || answers[p.key] === 'notyet') && followUps[p.key]?.trim())
    .map((p) => `${p.short} follow-up: ${followUps[p.key]!.trim()}`);
  const preview = `${ME.person} · ${notYes.length ? notYes.map((p) => `${p.short}: ${LABEL[answers[p.key]!]}`).join(' · ') : 'All “yes”'}${followUpPreview.length ? ' · ' + followUpPreview.join(' · ') : ''}${note.trim() ? ' · your note' : ''}`;

  return (
    <div className="rc-roomlayer" role="dialog" aria-modal="true" aria-labelledby="rc-ci-h">
      <div className="rc-roomlayer-scrim" onClick={onClose} />
      <section className="rc-troom rc-ci-sheet rc-glass rc-glass-3">
        <header className="rc-troom-head">
          <div className="rc-troom-row">
            <h2 className="rc-ci-h" id="rc-ci-h">{milestone.label}: {milestone.title}</h2>
            <button type="button" className="rc-toast-x rc-troom-x" aria-label="Close check-in" onClick={onClose}><Icon name="close" size={16} /></button>
          </div>
          <p className="rc-ci-s">About 1–2 minutes · no right or wrong answers.</p>
        </header>
        <form className="rc-ci-form" onSubmit={send}>
          {cohortFollowUp ? (
            <p className="rc-ci-entry-f rc-ci-cohort-response">
              <Icon name="users" size={14} />
              <span><b>Your team responded:</b> {cohortFollowUp.label} <em>We’ll check whether this helped in this check-in.</em></span>
            </p>
          ) : null}
          {questions.map((p, i) => (
            <fieldset key={p.key} className="rc-ci-q">
              <legend className="rc-ci-qt"><span>{p.dimension}</span>{p.text}</legend>
              {publishedResponseFor(p.key) ? <p className="rc-ci-said-did-prompt">Last time, some of you said this was difficult. We made an update. Is it better now?</p> : null}
              <div className="rc-seg rc-ci-seg" role="radiogroup" aria-label={p.text}>
                {PULSE_ANSWERS.map((a, j) => (
                  <button key={a.key} ref={i === 0 && j === 0 ? first : null} type="button" role="radio" aria-checked={answers[p.key] === a.key}
                    className={cx(answers[p.key] === a.key && 'is-on', 'is-' + a.key)}
                    onClick={() => setAnswers((s) => ({ ...s, [p.key]: a.key }))}>{a.label}</button>
                ))}
              </div>
              {answers[p.key] === 'partly' || answers[p.key] === 'notyet' ? (
                <label className="rc-ci-followup">{p.followUp} <span>Optional · any language</span>
                  <textarea className="rc-kb-area" rows={2} maxLength={300} value={followUps[p.key] ?? ''} placeholder="Share only what would be helpful" onChange={(e) => setFollowUps((s) => ({ ...s, [p.key]: e.target.value }))} />
                </label>
              ) : null}
            </fieldset>
          ))}
          <label className="rc-kb-lab">What, if anything, is getting in the way of your progress? <span>Optional · any language</span>
            <textarea className="rc-kb-area" rows={3} maxLength={400} value={note} placeholder="e.g. Not sure what to focus on yet" onChange={(e) => setNote(e.target.value)} />
          </label>
          <fieldset className="rc-ci-q">
            <legend className="rc-ci-qt">Who sees this</legend>
            <div className="rc-ci-who" role="radiogroup" aria-label="Who sees this">
              <button type="button" role="radio" aria-checked={named === true} className={cx('rc-ci-opt', named === true && 'is-on')} onClick={() => setNamed(true)}>
                <b>Share with my name</b><span>{MANAGER} can see your answers and offer direct help.</span>
              </button>
              <button type="button" role="radio" aria-checked={named === false} className={cx('rc-ci-opt', named === false && 'is-on')} onClick={() => setNamed(false)}>
                <b>Share anonymously</b><span>Your name and answers stay out of individual manager views; themes contribute to cohort insights.</span>
              </button>
            </div>
            <p className="rc-ci-privacy-note">Anonymous themes and response counts are only shown when at least {MIN_GROUP} people have checked in.</p>
          </fieldset>
          {named === true ? <p className="rc-ci-preview"><Icon name="ready" size={14} /><span><b>{MANAGER} will see:</b> {preview}</span></p> : null}
          {submitError ? <p className="rc-ci-error" role="alert">{submitError}</p> : null}
          <div className="rc-ci-foot">
            <div className="rc-ci-submit-group">
              <button type="submit" className="rc-btn-primary is-sm" disabled={!done || named === null || !!submitError}><Icon name="check" size={16} strokeWidth={2.2} />{start ? 'Save changes' : 'Submit check-in'}</button>
              <button type="button" className="rc-ci-quick-demo" onClick={fillQuickDemo}>Quick demo · Fill sample answers</button>
            </div>
            <span className="rc-ci-foot-s">{start ? 'Edits are available for 5 minutes after sending.' : `${questions.filter((p) => answers[p.key]).length} of ${questions.length} answered`}</span>
            <div className="rc-ci-demo-switch">
              <button type="button" className="rc-btn-ghost is-sm" aria-expanded={milestoneMenuOpen} aria-controls="rc-ci-demo-milestones" onClick={() => setMilestoneMenuOpen((open) => !open)}>
                Demo: {milestone.label}<Icon name="chevron" size={14} className={cx('rc-chev-down', milestoneMenuOpen && 'is-open')} />
              </button>
              {milestoneMenuOpen ? (
                <div className="rc-ci-demo-options" id="rc-ci-demo-milestones" role="group" aria-label="Choose demo check-in milestone">
                  {app.demoMilestones.map((option) => (
                    <button key={option.key} type="button" className={cx('rc-ci-demo-option', option.key === app.demoMilestone && 'is-current')} aria-pressed={option.key === app.demoMilestone}
                      onClick={() => { app.setDemoMilestone(option.key); setMilestoneMenuOpen(false); }}>
                      <span>{option.label}</span><b>{option.title}</b>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
