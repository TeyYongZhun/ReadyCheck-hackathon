import type { Mode } from '../../types';
import { cx } from '../../lib/util';
import { Icon } from '../primitives';

const MODES: [Mode, string, string][] = [['employee', 'Employee', 'search'], ['manager', 'Manager', 'grid']];

/** Employee | Manager switch that sits under the logo in both side menus. */
export function ModeSwitch({ mode, onChange, badges }: { mode: Mode; onChange: (m: Mode) => void; badges?: Partial<Record<Mode, number>> }) {
  return (
    <div className="rc-mode" role="tablist" aria-label="Switch view">
      {MODES.map(([key, label, icon]) => {
        const on = mode === key, n = badges?.[key];
        return (
          <button key={key} type="button" role="tab" aria-selected={on} className={cx('rc-mode-b', on && 'is-on')} onClick={() => onChange(key)}>
            <Icon name={icon} size={14} />{label}
            {!on && n ? <span className="rc-mode-badge" aria-label={n + ' new'}>{n}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
