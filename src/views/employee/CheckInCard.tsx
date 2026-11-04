// The employee's weekly check-in: four statements, an optional note, and their choice of who sees it.
// Voluntary by design. The sheet says exactly what the manager will see before anything is sent.
import { useEffect, useRef, useState } from 'react';
import type { PulseAnswer, PulseKey } from '../../types';
import { ME, useApp } from '../../state/AppState';
import { MIN_GROUP, PULSE, PULSE_ANSWERS } from '../../data/checkins';
import { cx } from '../../lib/util';
import { Icon } from '../../components/primitives';

const MANAGER = 'Rachel';
const LABEL = Object.fromEntries(PULSE_ANSWERS.map((a) => [a.key, a.label])) as Record<PulseAnswer, string>;

/** Side-menu card: due, sent, and any follow-up the manager planned for Mira. */
export function CheckInEntry({ onOpen }: { onOpen: () => void }) {
  const app = useApp();
  const mine = app.latestCheckins.get(ME.id);
  const sent = mine?.week === ME.week ? mine : undefined;
  const followUp = app.actions.filter((a) => a.person === ME.id && a.week === ME.week).slice(-1)[0];
  return (
    <section className={cx('rc-ci-entry rc-glass rc-glass-1', !sent && 'is-due')} aria-labelledby="rc-ci-entry-h">
      <div className="rc-ci-entry-h" id="rc-ci-entry-h"><Icon name={sent ? 'check' : 'calendar'} size={16} />Week {ME.week} check-in</div>
      <p className="rc-ci-entry-s">
        {sent ? `Sent ${sent.at.replace('Today ', 'today at ')} · ${sent.named ? 'shared with ' + MANAGER : 'anonymous'}` : 'Due today · takes 30 seconds'}
      </p>
      {followUp ? (
        <p className="rc-ci-entry-f">
          <Icon name={followUp.status === 'done' ? 'check' : 'users'} size={14} />
          <span>{MANAGER} {followUp.status === 'done' ? 'did' : 'planned'}: <b>{followUp.label}</b>{followUp.status === 'done' ? '' : ' · ' + followUp.when}</span>
        </p>
      ) : null}
      <button type="button" className={sent ? 'rc-quiet rc-ci-entry-b' : 'rc-btn-primary is-sm rc-ci-entry-b'} onClick={onOpen}>
        {sent ? 'Change answers' : 'Start check-in'}
      </button>
    </section>
  );
}

export function CheckInSheet({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const prev = app.latestCheckins.get(ME.id);
  const start = prev?.week === ME.week ? prev : undefined;
  const [answers, setAnswers] = useState<Partial<Record<PulseKey, PulseAnswer>>>(start?.answers ?? {});
  const [note, setNote] = useState(start?.note ?? '');
  const [named, setNamed] = useState(start?.named ?? true);
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
    if (!done) return;
    app.submitCheckIn({ answers: answers as Record<PulseKey, PulseAnswer>, note, named });
    onClose();
  }

  const notYes = PULSE.filter((p) => answers[p.key] && answers[p.key] !== 'yes');
  const preview = named
    ? `${ME.person} · ${notYes.length ? notYes.map((p) => `${p.short}: ${LABEL[answers[p.key]!]}`).join(' · ') : 'All “yes”'}${note.trim() ? ' · your note' : ''}`
    : `No name. Your answers only count in cohort totals, shown once ${MIN_GROUP} or more people have checked in.`;

  return (
    <div className="rc-roomlayer" role="dialog" aria-modal="true" aria-labelledby="rc-ci-h">
      <div className="rc-roomlayer-scrim" onClick={onClose} />
      <section className="rc-troom rc-ci-sheet rc-glass rc-glass-3">
        <header className="rc-troom-head">
          <div className="rc-troom-row">
            <h2 className="rc-ci-h" id="rc-ci-h">Week {ME.week} check-in</h2>
            <button type="button" className="rc-toast-x rc-troom-x" aria-label="Close check-in" onClick={onClose}><Icon name="close" size={16} /></button>
          </div>
          <p className="rc-ci-s">Four quick questions about your week. Nothing here is graded, and you can skip it.</p>
        </header>
        <form className="rc-ci-form" onSubmit={send}>
          {PULSE.map((p, i) => (
            <fieldset key={p.key} className="rc-ci-q">
              <legend className="rc-ci-qt">{p.text}</legend>
              <div className="rc-seg rc-ci-seg" role="radiogroup" aria-label={p.text}>
                {PULSE_ANSWERS.map((a, j) => (
                  <button key={a.key} ref={i === 0 && j === 0 ? first : null} type="button" role="radio" aria-checked={answers[p.key] === a.key}
                    className={cx(answers[p.key] === a.key && 'is-on', 'is-' + a.key)}
                    onClick={() => setAnswers((s) => ({ ...s, [p.key]: a.key }))}>{a.label}</button>
                ))}
              </div>
            </fieldset>
          ))}
          <label className="rc-kb-lab">Anything making this week harder? Optional, any language
            <textarea className="rc-kb-area" rows={3} maxLength={400} value={note} placeholder="e.g. Not sure what to focus on yet" onChange={(e) => setNote(e.target.value)} />
          </label>
          <fieldset className="rc-ci-q">
            <legend className="rc-ci-qt">Who sees this</legend>
            <div className="rc-ci-who" role="radiogroup" aria-label="Who sees this">
              <button type="button" role="radio" aria-checked={named} className={cx('rc-ci-opt', named && 'is-on')} onClick={() => setNamed(true)}>
                <b>Share with my name</b><span>So {MANAGER} can help you directly</span>
              </button>
              <button type="button" role="radio" aria-checked={!named} className={cx('rc-ci-opt', !named && 'is-on')} onClick={() => setNamed(false)}>
                <b>Count me anonymously</b><span>Only in cohort totals</span>
              </button>
            </div>
          </fieldset>
          <p className="rc-ci-preview"><Icon name="ready" size={14} /><span><b>{named ? MANAGER + ' will see:' : 'What is shared:'}</b> {preview}</span></p>
          <div className="rc-ci-foot">
            <button type="submit" className="rc-btn-primary is-sm" disabled={!done}><Icon name="check" size={16} strokeWidth={2.2} />Send check-in</button>
            <span className="rc-ci-foot-s">{done ? 'No monitoring. Only what you send here.' : `${PULSE.filter((p) => answers[p.key]).length} of ${PULSE.length} answered`}</span>
          </div>
        </form>
      </section>
    </div>
  );
}
