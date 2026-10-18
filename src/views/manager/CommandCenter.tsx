// Design View 2 — the manager's Theme Command Center. Answers "what needs me right now?".
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { askThemeSummary } from '../../lib/api';
import type { ManagerTab, Pic, Theme } from '../../types';
import { useApp } from '../../state/AppState';
import { SLA_MINUTES, SUGGEST, THEMES } from '../../data/command';
import { cx, initialsOf, plural } from '../../lib/util';
import { Brand, Icon, Toast } from '../../components/primitives';
import { HomeOverview } from './HomeOverview';
import { NeedsYou, type NeedsGroup } from './NeedsYou';
import { TicketRooms } from './TicketRooms';
import { ThemeTrends } from './ThemeTrends';
import { KnowledgeBase } from './KnowledgeBase';
import { ExpertTeam } from './ExpertTeam';

export function CommandCenter({ modeSwitch }: { modeSwitch: ReactNode }) {
  const app = useApp();
  const [tab, setTab] = useState<ManagerTab>('home');
  const [toast, setToast] = useState<ReactNode>(null);

  const queue = app.queue;
  const waiting = queue.filter((q) => !q.leaving);
  const liveRooms = app.roomList.filter((r) => r.status !== 'resolved').length;
  const reviewN = app.knowledge.filter((k) => k.status === 'review').length;
  const asked = THEMES.reduce((s, t) => s + t.count, 0), byCards = THEMES.reduce((s, t) => s + t.cards, 0);

  const groups: NeedsGroup[] = THEMES.flatMap((t) => {
    const tk = queue.filter((q) => q.theme === t.key);
    if (!tk.length) return [];
    const act = tk.filter((q) => !q.leaving), base = act.length ? act : tk;
    const oldest = Math.max(...base.map((q) => q.wait));
    return [{ theme: t, tickets: tk.slice().sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || b.wait - a.wait), active: act.length, oldest, overdue: oldest >= SLA_MINUTES, leaving: !act.length }];
  }).sort((a, b) => (b.overdue ? 1 : 0) - (a.overdue ? 1 : 0) || b.oldest - a.oldest);
  const openGroups = groups.filter((g) => !g.leaving).length;

  // Gemini summarises each stuck theme from its waiting questions; refreshed when that set changes.
  const [aiSummary, setAiSummary] = useState<Record<string, { sig: string; text: string | null }>>({});
  const asking = useRef<Record<string, string>>({});
  const wanted = groups.filter((g) => !g.leaving).map((g) => ({ g, sig: g.tickets.filter((q) => !q.leaving).map((q) => q.id).sort().join(',') }));
  useEffect(() => {
    if (app.mode !== 'manager') return;
    wanted.forEach(({ g, sig }) => {
      const key = g.theme.key;
      if (aiSummary[key]?.sig === sig || asking.current[key] === sig) return;
      asking.current[key] = sig;
      void askThemeSummary({ theme: g.theme.name, questions: g.tickets.map((q) => q.q) }).then((r) => {
        setAiSummary((s) => ({ ...s, [key]: { sig, text: r?.summary ?? null } }));
      });
    });
  }, [app.mode, wanted.map((w) => w.g.theme.key + ':' + w.sig).join('|')]);
  groups.forEach((g) => { const s = aiSummary[g.theme.key]?.text; if (s) g.summary = s; });
  const handledByCards = THEMES.filter((t) => !queue.some((q) => q.theme === t.key) && !app.roomList.some((r) => r.theme === t.key && r.status !== 'resolved')).sort((a, b) => b.count - a.count);

  /** Least-busy expert who covers the topic; falls back to the default owner. */
  function suggestFor(t: Theme): Pic {
    const fit = app.experts.filter((x) => x.covers.includes(t.key)).sort((a, b) => (app.load[a.id] ?? 0) - (app.load[b.id] ?? 0) || (a.id === SUGGEST[t.key] ? -1 : 1));
    return fit[0] ?? app.experts.find((x) => x.id === SUGGEST[t.key]) ?? app.experts[0];
  }

  function assign(t: Theme, pic: Pic) {
    const room = app.assignTheme(t.key, pic);
    if (room) setToast(<>Room <b>{room.name}</b> is open. {pic.first} can work on it there now.</>);
    window.setTimeout(() => setToast(null), 5200);
  }

  const TABS: [ManagerTab, string, string, number | null, boolean?][] = [
    ['home', 'Home', 'home', null],
    ['needs', 'Needs you', 'inbox', openGroups || null],
    ['rooms', 'Ticket room', 'chat', liveRooms || null, true],
    ['trends', 'Trends', 'trends', null],
    ['knowledge', 'Knowledge base', 'book', reviewN || null],
    ['team', 'Expert team', 'users', app.experts.length, true],
  ];

  return (
    <div className="rc-cc2" style={{ minHeight: Math.max(900, window.innerHeight) }}>
      <div className="rc-canvas-orb rc-canvas-orb-a" aria-hidden />
      <aside className="rc-side" aria-label="Manager">
        <Brand />
        <div className="rc-side-mode">{modeSwitch}</div>
        <div className="rc-tabs" role="tablist" aria-orientation="vertical" aria-label="Manager view">
          {TABS.map(([key, label, icon, n, neutral]) => (
            <button key={key} type="button" role="tab" id={'rc-tab-' + key} aria-selected={tab === key} aria-controls={'rc-pane-' + key}
              className={cx('rc-tab', tab === key && 'is-on')} onClick={() => setTab(key)}>
              <Icon name={icon} size={20} /><span className="rc-tab-t">{label}</span>
              {n ? <span className={cx('rc-tab-n', neutral && 'is-neutral')} aria-hidden>{n}</span> : null}
            </button>
          ))}
        </div>
        <div className="rc-user rc-side-user">
          <span className="rc-avatar">RG</span>
          <div><div className="rc-user-n">Rachel Goh</div><div className="rc-user-s">Manager</div></div>
        </div>
      </aside>

      <div className="rc-cc2-main">
        <dl className="rc-kpi3">
          <div className={cx('rc-kpi', waiting.length && 'is-need')}><dt>Need you</dt><dd>{waiting.length}</dd></div>
          <div className="rc-kpi"><dt>Solved by cards</dt><dd>{Math.round((byCards / asked) * 100)}%</dd></div>
          <div className="rc-kpi is-prog"><dt>In progress</dt><dd>{liveRooms}</dd></div>
        </dl>

        {tab === 'home' ? <HomeOverview pics={app.experts} waiting={waiting.length} onOpenNeeds={() => setTab('needs')} />
          : tab === 'needs' ? <NeedsYou groups={groups} handledByCards={handledByCards} pics={app.experts} load={app.load} suggestFor={suggestFor} onAssign={assign} />
          : tab === 'rooms' ? <TicketRooms rooms={app.roomList} pics={app.experts} onOpen={(r) => app.setOpenRoom({ id: r.id, viewer: 'manager' })} />
          : tab === 'trends' ? <ThemeTrends />
          : tab === 'knowledge' ? <KnowledgeBase />
          : <ExpertTeam pics={app.experts} load={app.load} onAddExpert={(team, name) => {
              const x: Pic = { id: 'x' + Date.now().toString(36), name, first: name.split(/\s+/)[0], initials: initialsOf(name), team: team.name, skills: plural(team.covers.length, 'topic', 'topics'), covers: team.covers, custom: true };
              app.setExperts((l) => [...l, x]);
              setToast(<><b>{name}</b> joined {team.name}. They are in every Assign menu now.</>);
            }} />}
      </div>

      {toast ? <Toast tone="ready" onClose={() => setToast(null)}>{toast}</Toast> : null}
    </div>
  );
}
