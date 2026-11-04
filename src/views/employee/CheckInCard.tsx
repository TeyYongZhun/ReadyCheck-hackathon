// The employee's weekly check-in: four statements, an optional note, and their choice of who sees it.
// Voluntary by design. The sheet says exactly what the manager will see before anything is sent.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PulseAnswer, PulseKey } from '../../types';
import { ME, useApp } from '../../state/AppState';
import { CHECKIN_EDIT_WINDOW_MS, MIN_GROUP, PULSE, PULSE_ANSWERS } from '../../data/checkins';
import { cx } from '../../lib/util';
import { Icon } from '../../components/primitives';

const MANAGER = 'Rachel';
const LABEL = Object.fromEntries(PULSE_ANSWERS.map((a) => [a.key, a.label])) as Record<PulseAnswer, string>;

/** Side-menu card: due, sent, and any follow-up the manager planned for Mira. */
export function CheckInEntry({ onOpen }: { onOpen: () => void }) {
  const app = useApp();
  const mine = app.latestCheckins.get(ME.id);
  const sent = mine?.week === ME.week ? mine : undefined;
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
  const followUp = app.actions.filter((a) => a.person === ME.id && a.week === ME.week).slice(-1)[0];
  return (
    <section className={cx('rc-ci-entry rc-glass rc-glass-1', !sent && 'is-due', sent?.isNew && 'is-new', sent && collapsed && 'is-collapsed')} aria-labelledby="rc-ci-entry-h">
      {sent ? (
        <button type="button" className="rc-ci-entry-toggle" id="rc-ci-entry-h" aria-expanded={!collapsed} aria-controls="rc-ci-entry-details" onClick={() => setCollapsed((value) => !value)}>
          <span className="rc-ci-entry-h"><Icon name="check" size={16} className={sent.isNew ? 'is-success' : undefined} />Week {ME.week} check-in</span>
          <Icon name="chevron" size={15} className={cx('rc-ci-entry-chevron', !collapsed && 'is-open')} />
        </button>
      ) : <div className="rc-ci-entry-h" id="rc-ci-entry-h"><Icon name="bell" size={16} />Week {ME.week} check-in</div>}
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
  const prev = app.latestCheckins.get(ME.id);
  const start = prev?.week === ME.week ? prev : undefined;
  const [answers, setAnswers] = useState<Partial<Record<PulseKey, PulseAnswer>>>(start?.answers ?? {});
  const [note, setNote] = useState(start?.note ?? '');
  const [named, setNamed] = useState<boolean | null>(null);
  const [submitError, setSubmitError] = useState('');
  const first = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const done = PULSE.every((p) => answers[p.key]);

  useEffect(() => {
    first.current?.focus({ preventScroll: true });
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!done || named === null) return;
    const submitted = app.submitCheckIn({ answers: answers as Record<PulseKey, PulseAnswer>, note, named });
    if (!submitted) {
      setSubmitError('The 5-minute edit window has expired. Your check-in was not changed.');
      return;
    }
    onSubmitted(!!start);
    onClose();
  }

  const notYes = PULSE.filter((p) => answers[p.key] && answers[p.key] !== 'yes');
  const preview = `${ME.person} · ${notYes.length ? notYes.map((p) => `${p.short}: ${LABEL[answers[p.key]!]}`).join(' · ') : 'All “yes”'}${note.trim() ? ' · your note' : ''}`;

  return (
    <div className="rc-roomlayer" role="dialog" aria-modal="true" aria-labelledby="rc-ci-h">
      <div className="rc-roomlayer-scrim" onClick={onClose} />
      <section className="rc-troom rc-ci-sheet rc-glass rc-glass-3">
        <header className="rc-troom-head">
          <div className="rc-troom-row">
            <h2 className="rc-ci-h" id="rc-ci-h">Week {ME.week} check-in</h2>
            <button type="button" className="rc-toast-x rc-troom-x" aria-label="Close check-in" onClick={onClose}><Icon name="close" size={16} /></button>
          </div>
          <p className="rc-ci-s">About one minute · no right or wrong answers.</p>
        </header>
        <form className="rc-ci-form" onSubmit={send}>
          {PULSE.map((p, i) => (
            <fieldset key={p.key} className="rc-ci-q">
              <legend className="rc-ci-qt"><span>{p.dimension}</span>{p.text}</legend>
              <div className="rc-seg rc-ci-seg" role="radiogroup" aria-label={p.text}>
                {PULSE_ANSWERS.map((a, j) => (
                  <button key={a.key} ref={i === 0 && j === 0 ? first : null} type="button" role="radio" aria-checked={answers[p.key] === a.key}
                    className={cx(answers[p.key] === a.key && 'is-on', 'is-' + a.key)}
                    onClick={() => setAnswers((s) => ({ ...s, [p.key]: a.key }))}>{a.label}</button>
                ))}
              </div>
            </fieldset>
          ))}
          <label className="rc-kb-lab">What, if anything, is getting in the way of your work? <span>Optional · any language</span>
            <textarea className="rc-kb-area" rows={3} maxLength={400} value={note} placeholder="e.g. Not sure what to focus on yet" onChange={(e) => setNote(e.target.value)} />
          </label>
          <fieldset className="rc-ci-q">
            <legend className="rc-ci-qt">Who sees this</legend>
            <div className="rc-ci-who" role="radiogroup" aria-label="Who sees this">
              <button type="button" role="radio" aria-checked={named === true} className={cx('rc-ci-opt', named === true && 'is-on')} onClick={() => setNamed(true)}>
                <b>Share with my name</b><span>{MANAGER} can see your answers and offer direct help.</span>
              </button>
              <button type="button" role="radio" aria-checked={named === false} className={cx('rc-ci-opt', named === false && 'is-on')} onClick={() => setNamed(false)}>
                <b>Share anonymously</b><span>Your feedback contributes to cohort insights.</span>
              </button>
            </div>
            <p className="rc-ci-privacy-note">Anonymous cohort insights are only shown when at least {MIN_GROUP} people have checked in.</p>
          </fieldset>
          {named === true ? <p className="rc-ci-preview"><Icon name="ready" size={14} /><span><b>{MANAGER} will see:</b> {preview}</span></p> : null}
          {submitError ? <p className="rc-ci-error" role="alert">{submitError}</p> : null}
          <div className="rc-ci-foot">
            <button type="submit" className="rc-btn-primary is-sm" disabled={!done || named === null || !!submitError}><Icon name="check" size={16} strokeWidth={2.2} />{start ? 'Save changes' : 'Submit check-in'}</button>
            <span className="rc-ci-foot-s">{start ? 'Edits are available for 5 minutes after sending.' : `${PULSE.filter((p) => answers[p.key]).length} of ${PULSE.length} answered`}</span>
          </div>
        </form>
      </section>
    </div>
  );
}
