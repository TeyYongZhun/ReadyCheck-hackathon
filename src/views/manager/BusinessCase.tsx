// Home: what ReadyCheck is worth to this company, with every assumption on screen and editable.
// The formula is printed so anyone can check it; nothing here is a measured result.
import { useState } from 'react';
import { MIN_PER_TICKET } from '../../lib/impact';
import { Icon } from '../../components/primitives';

const DEFAULTS = { hires: 200, salary: 4500, replacePct: 30, questions: 10, expertRate: 50, price: 15, months: 6 };
type Inputs = typeof DEFAULTS;

const FIELDS: { key: keyof Inputs; label: string; prefix?: string; suffix?: string; step: number }[] = [
  { key: 'hires', label: 'New hires a year', step: 10 },
  { key: 'salary', label: 'Average monthly salary', prefix: 'RM', step: 100 },
  { key: 'replacePct', label: 'Cost to replace one leaver', suffix: '% of a year’s salary', step: 5 },
  { key: 'questions', label: 'Questions per new hire', step: 1 },
  { key: 'expertRate', label: 'Expert cost per hour', prefix: 'RM', step: 5 },
  { key: 'price', label: 'ReadyCheck per new hire a month', prefix: 'RM', step: 1 },
];

const rm = (n: number) => 'RM ' + Math.round(n).toLocaleString('en-MY');

export function BusinessCase({ deflection }: { deflection: number }) {
  const [v, setV] = useState<Inputs>(DEFAULTS);
  const [open, setOpen] = useState(false);
  const perLeaver = v.salary * 12 * (v.replacePct / 100);
  const cost = v.hires * v.price * v.months;
  const timeSaved = v.hires * v.questions * deflection * (MIN_PER_TICKET / 60) * v.expertRate;
  const gap = cost - timeSaved;
  const breakEven = gap <= 0 ? 0 : Math.ceil(gap / Math.max(1, perLeaver));
  const headline = breakEven === 0
    ? 'Expert time saved alone covers the cost'
    : `Pays for itself if it prevents ${breakEven} early resignation${breakEven === 1 ? '' : 's'} a year`;

  return (
    <section className="rc-home-card rc-glass rc-glass-2 rc-bc" aria-labelledby="rc-bc-h">
      <header className="rc-panel-head">
        <div>
          <h2 className="rc-panel-h" id="rc-bc-h">Business case</h2>
          <p className="rc-panel-s">Estimate for {v.hires} new hires a year. Change any assumption.</p>
        </div>
        <button type="button" className="rc-btn-ghost is-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name="edit" size={15} />{open ? 'Hide assumptions' : 'Edit assumptions'}
        </button>
      </header>
      <p className="rc-bc-head"><Icon name="ready" size={18} />{headline}</p>
      <dl className="rc-bc-nums">
        <div><dt>One early leaver costs</dt><dd>{rm(perLeaver)}</dd><p>{rm(v.salary)} × 12 × {v.replacePct}%</p></div>
        <div><dt>ReadyCheck a year</dt><dd>{rm(cost)}</dd><p>{v.hires} hires × {rm(v.price)} × first {v.months} months</p></div>
        <div><dt>Expert time saved a year</dt><dd>{rm(timeSaved)}</dd><p>{v.hires} × {v.questions} questions × {Math.round(deflection * 100)}% answered × {MIN_PER_TICKET} min × {rm(v.expertRate)}/h</p></div>
        <div><dt>Each resignation prevented</dt><dd>+{rm(perLeaver)}</dd><p>On top of the time saved</p></div>
      </dl>
      {open ? (
        <div className="rc-bc-form">
          {FIELDS.map((f) => (
            <label key={f.key} className="rc-kb-lab">{f.label}
              <span className="rc-bc-in">
                {f.prefix ? <span>{f.prefix}</span> : null}
                <input className="rc-kb-input is-plain" type="number" min={0} step={f.step} value={v[f.key]}
                  onChange={(e) => setV((s) => ({ ...s, [f.key]: Math.max(0, Number(e.target.value) || 0) }))} />
                {f.suffix ? <span>{f.suffix}</span> : null}
              </span>
            </label>
          ))}
          <button type="button" className="rc-quiet" onClick={() => setV(DEFAULTS)}>Reset to defaults</button>
        </div>
      ) : null}
      <p className="rc-home-note">Estimate, not a measured result. “Answered” is this week’s share of questions a card solved. Replacement cost varies by role; estimates often start around a third of a year’s salary, so set your own. Price is a proposal.</p>
    </section>
  );
}
