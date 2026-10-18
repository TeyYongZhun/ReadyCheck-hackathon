import { useState } from 'react';
import type { KbItem } from '../../types';
import { useApp } from '../../state/AppState';
import { Footnote, Icon } from '../../components/primitives';
import { KbCard } from '../../components/shell/KbCard';

/** Review AI summaries from solved rooms, keep live cards current, restore discarded ones. */
export function KnowledgeBase() {
  const { knowledge, kb } = useApp();
  const [showGone, setShowGone] = useState(false);
  const review = knowledge.filter((k) => k.status === 'review');
  const live = knowledge.filter((k) => k.status === 'live');
  const gone = knowledge.filter((k) => k.status === 'discarded');

  const grid = (list: KbItem[], mode: 'review' | 'live' | 'gone') => (
    <ul className="rc-kb-grid">
      {list.map((k) => (
        <li key={k.id}>
          <KbCard kb={k} onApprove={mode === 'review' ? kb.approve : undefined} onEdit={mode !== 'gone' ? kb.edit : undefined}
            onDiscard={mode !== 'gone' ? kb.discard : undefined} onRestore={mode === 'gone' ? kb.restore : undefined} />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="rc-kbase" role="tabpanel" id="rc-pane-knowledge" aria-labelledby="rc-tab-knowledge">
      <section aria-labelledby="rc-kbr-h">
        <div className="rc-sec-row">
          <h2 className="rc-sec-h" id="rc-kbr-h"><i className="rc-state-dot is-waiting" />Needs your review</h2>
          {/* TODO: "New material" form (title, topic, description, steps, files) — see KbNew in the design export. */}
        </div>
        <p className="rc-sec-s">ReadyCheck AI drafts a card each time an employee says a room solved their problem. Edit the title or steps if needed, then approve to show it to the next new hire who asks.</p>
        {review.length ? grid(review, 'review') : (
          <div className="rc-allclear"><span className="rc-fb-tick"><Icon name="check" size={14} strokeWidth={2.4} /></span>Nothing to review. New summaries land here when a room is solved.</div>
        )}
      </section>
      <section aria-labelledby="rc-kbl-h">
        <h2 className="rc-sec-h" id="rc-kbl-h"><i className="rc-state-dot is-room" />Live for new hires</h2>
        <p className="rc-sec-s">Approved cards. ReadyCheck shows these first, marked “From an expert”.</p>
        {live.length ? grid(live, 'live') : <p className="rc-sec-empty">No approved cards yet.</p>}
      </section>
      {gone.length ? (
        <section>
          <button type="button" className="rc-link-btn" aria-expanded={showGone} onClick={() => setShowGone(!showGone)}>
            Discarded ({gone.length})<Icon name="chevron" size={14} className={showGone ? 'rc-chev-up' : 'rc-chev-down'} />
          </button>
          {showGone ? grid(gone, 'gone') : null}
        </section>
      ) : null}
      <Footnote>AI-written cards come from a real room and reach employees only after a person approves them. Material you write yourself is yours to publish.</Footnote>
    </div>
  );
}
