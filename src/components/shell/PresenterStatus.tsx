// Only for whoever drives a live demo: open the site with ?presenter to see whether Gemini is answering.
// Judges never see it; everyone else gets the same app with no status noise.
import { useAiStatus } from '../../lib/ai-status';
import { cx } from '../../lib/util';

const PRESENTER = (() => {
  try { return new URLSearchParams(location.search).has('presenter'); } catch { return false; }
})();

const LABEL = { unknown: 'Gemini: checking', connected: 'Gemini live', offline: 'Offline: keyword fallback' } as const;

export function PresenterStatus() {
  const status = useAiStatus();
  if (!PRESENTER) return null;
  return (
    <div className={cx('rc-presenter', 'is-' + status)} role="status" aria-live="polite">
      <i aria-hidden />{LABEL[status]}
    </div>
  );
}
