import { useState } from 'react';
import type { Pic, ThemeKey } from '../../types';
import { THEMES, THEMES_BY_KEY } from '../../data/command';
import { cx, plural } from '../../lib/util';
import { Footnote, Icon, PicAvatar } from '../../components/primitives';

export interface TeamGroup { name: string; covers: string[]; experts: Pic[] }
export interface TeamDraft { name: string; covers: ThemeKey[]; people: string[] }

export function groupTeams(pics: Pic[]): TeamGroup[] {
  const map = new Map<string, TeamGroup>();
  pics.forEach((p) => {
    const g = map.get(p.team) ?? { name: p.team, covers: [], experts: [] };
    g.experts.push(p);
    p.covers.forEach((c) => { if (!g.covers.includes(c)) g.covers.push(c); });
    map.set(p.team, g);
  });
  return [...map.values()];
}

function AddExpert({ team, onAdd }: { team: string; onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const close = () => { setOpen(false); setName(''); };
  if (!open) return <button type="button" className="rc-link-btn rc-team-addbtn" onClick={() => setOpen(true)}><Icon name="plus" size={14} strokeWidth={2} />Add expert</button>;
  return (
    <form className="rc-team-prow rc-team-inline" aria-label={'Add an expert to ' + team} onSubmit={(e) => { e.preventDefault(); if (name.trim()) { onAdd(name.trim()); close(); } }}>
      <input className="rc-kb-input is-plain" value={name} maxLength={40} autoFocus placeholder="Full name" aria-label="New expert name"
        onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') close(); }} />
      <button type="submit" className="rc-btn-primary is-sm rc-team-go" disabled={!name.trim()}>Add</button>
      <button type="button" className="rc-quiet" onClick={close}>Cancel</button>
    </form>
  );
}

function TeamForm({ existing, onSave, onCancel }: { existing: string[]; onSave: (draft: TeamDraft) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [covers, setCovers] = useState<ThemeKey[]>([]);
  const [people, setPeople] = useState(['']);
  const names = people.map((person) => person.trim()).filter(Boolean);
  const duplicate = !!name.trim() && existing.some((team) => team.toLowerCase() === name.trim().toLowerCase());
  const valid = !!name.trim() && !duplicate && names.length > 0;

  function toggle(key: ThemeKey) {
    setCovers((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  return (
    <form className="rc-kb rc-kb-new is-editing rc-team-form" aria-label="Add expert team" onSubmit={(event) => {
      event.preventDefault();
      if (valid) onSave({ name: name.trim(), covers, people: names });
    }}>
      <div className="rc-kb-top">
        <span className="rc-ai-label">New team</span>
        <span className="rc-kb-st is-new"><i />You are adding this</span>
      </div>
      <label className="rc-kb-lab">Team name
        <input className="rc-kb-input" value={name} maxLength={40} autoFocus placeholder="e.g. Security & Compliance" aria-invalid={duplicate || undefined} onChange={(event) => setName(event.target.value)} />
      </label>
      {duplicate ? <p className="rc-team-err" role="alert">That team already exists. Open it below and add the expert there.</p> : null}
      <div className="rc-kb-lab" role="group" aria-label="What this team covers">
        What it covers <span className="rc-kb-hint">Optional. A team that covers a topic can be suggested for it on Needs you.</span>
        <div className="rc-picks">
          {THEMES.map((theme) => {
            const selected = covers.includes(theme.key);
            return <button key={theme.key} type="button" className={cx('rc-pick', selected && 'is-on')} aria-pressed={selected} onClick={() => toggle(theme.key)}>
              {selected ? <Icon name="check" size={13} strokeWidth={2.4} /> : null}{theme.short}
            </button>;
          })}
        </div>
      </div>
      <div className="rc-kb-lab" role="group" aria-label="Experts">
        Experts
        <div className="rc-team-people">
          {people.map((person, index) => (
            <div key={index} className="rc-team-prow">
              <input className="rc-kb-input is-plain" value={person} maxLength={40} placeholder={index === 0 ? 'Full name, e.g. Nurul Aina' : 'Another expert'} aria-label={`Expert ${index + 1} name`} onChange={(event) => setPeople((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />
              {people.length > 1 ? <button type="button" className="rc-team-x" aria-label={`Remove expert ${index + 1}`} onClick={() => setPeople((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Icon name="close" size={14} strokeWidth={2} /></button> : null}
            </div>
          ))}
        </div>
        {people.length < 8 ? <button type="button" className="rc-link-btn rc-team-more" onClick={() => setPeople((current) => [...current, ''])}><Icon name="plus" size={14} strokeWidth={2} />Add another expert</button> : null}
      </div>
      <div className="rc-kb-act">
        <button type="submit" className="rc-btn-primary is-sm" disabled={!valid}><Icon name="check" size={15} strokeWidth={2.2} />Add team</button>
        <button type="button" className="rc-quiet" onClick={onCancel}>Cancel</button>
      </div>
      <p className="rc-kb-m">Experts you add show up in every Assign menu straight away.</p>
    </form>
  );
}

/** The people who can join a room with a new hire, grouped by team. */
export function ExpertTeam({ pics, load, onAddExpert, onAddTeam }: { pics: Pic[]; load: Record<string, number>; onAddExpert: (team: TeamGroup, name: string) => void; onAddTeam: (draft: TeamDraft) => void }) {
  const teams = groupTeams(pics);
  const [adding, setAdding] = useState(false);
  return (
    <div className="rc-home rc-team" role="tabpanel" id="rc-pane-team" aria-labelledby="rc-tab-team">
      <header className="rc-home-head">
        <div><h2 className="rc-home-h">Expert team</h2><p className="rc-home-s">The people who can join a room with a new hire. Anyone you add shows up in every Assign menu.</p></div>
        {!adding ? <button type="button" className="rc-btn-primary is-sm" onClick={() => setAdding(true)}><Icon name="plus" size={15} strokeWidth={2.2} />Add expert team</button> : null}
      </header>
      {adding ? <div className="rc-kb-newwrap"><TeamForm existing={teams.map((team) => team.name)} onSave={(draft) => { onAddTeam(draft); setAdding(false); }} onCancel={() => setAdding(false)} /></div> : null}
      <ul className="rc-team-grid" aria-label={`${plural(teams.length, 'team', 'teams')}, ${plural(pics.length, 'expert', 'experts')}`}>
        {teams.map((t) => {
          const rooms = t.experts.reduce((s, x) => s + (load[x.id] ?? 0), 0);
          return (
            <li key={t.name}>
              <article className="rc-team-card rc-glass rc-glass-2" aria-label={t.name}>
                <header className="rc-team-head">
                  <span className="rc-team-mark" aria-hidden><Icon name="users" size={18} /></span>
                  <div className="rc-team-ht"><h3 className="rc-team-name">{t.name}</h3><p className="rc-team-sub">{plural(t.experts.length, 'expert', 'experts')} · {plural(rooms, 'active room', 'active rooms')}</p></div>
                </header>
                <div className="rc-team-cov">
                  <span className="rc-team-covk">Covers</span>
                  {t.covers.length ? t.covers.map((k) => <span key={k} className="rc-cardchip">{THEMES_BY_KEY[k as keyof typeof THEMES_BY_KEY]?.short ?? k}</span>) : <span className="rc-team-none">Nothing picked yet. Assign them by hand.</span>}
                </div>
                <ul className="rc-team-list">
                  {t.experts.map((x) => {
                    const n = load[x.id] ?? 0;
                    return (
                      <li key={x.id} className="rc-team-ex">
                        <PicAvatar pic={x} size={36} />
                        <div className="rc-team-exb"><span className="rc-team-exn">{x.name}{x.custom ? <span className="rc-new">Added</span> : null}</span><span className="rc-team-exs">{x.skills || 'Generalist'}</span></div>
                        <span className={cx('rc-team-load', n === 0 && 'is-free')}>{n === 0 ? 'Free' : plural(n, 'room', 'rooms')}</span>
                      </li>
                    );
                  })}
                </ul>
                <AddExpert team={t.name} onAdd={(name) => onAddExpert(t, name)} />
              </article>
            </li>
          );
        })}
      </ul>
      <Footnote>On Needs you, the suggested expert is the one on a team that covers the topic with the fewest active rooms.</Footnote>
    </div>
  );
}
