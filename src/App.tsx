// ReadyCheckApp: both views in one site, switched by Employee | Manager. #manager opens the manager view.
import { AppStateProvider, useApp } from './state/AppState';
import { ModeSwitch } from './components/shell/ModeSwitch';
import { TicketRoom } from './components/shell/TicketRoom';
import { KnowledgeCanvas } from './views/employee/KnowledgeCanvas';
import { CommandCenter } from './views/manager/CommandCenter';

function Shell() {
  const app = useApp();
  const sw = <ModeSwitch mode={app.mode} onChange={app.go} />;
  const open = app.openRoom, rec = open ? app.rooms[open.id] : null;
  const kbById = Object.fromEntries(app.knowledge.map((k) => [k.id, k]));
  return (
    <>
      {/* Both views stay mounted so canvas state survives a switch. */}
      <div className="rc-mode-view" hidden={app.mode !== 'employee'}><KnowledgeCanvas modeSwitch={sw} /></div>
      <div className="rc-mode-view" hidden={app.mode !== 'manager'}><CommandCenter modeSwitch={sw} /></div>
      {open && rec ? (
        <TicketRoom key={rec.room.id} rec={rec} viewer={open.viewer} knowledge={kbById}
          onClose={() => app.setOpenRoom(null)}
          onSend={(t) => app.send(rec.room.id, open.viewer, t)}
          onResolve={() => void app.resolve(rec.room.id, rec.employee.first)}
          onFeedback={(solved) => app.answerFeedback(rec.room.id, solved)}
          on1v1={(book) => app.answer1v1(rec.room.id, book)}
          onDemo={() => app.playDemo(rec.room.id)}
          onStopDemo={() => app.stopDemo(rec.room.id)}
          onReopen={() => app.reopen(rec.room.id, open.viewer === 'manager' ? 'Rachel' : rec.employee.first)}
          onApproveKb={app.kb.approve} />
      ) : null}
    </>
  );
}

export default function App() {
  return <AppStateProvider><Shell /></AppStateProvider>;
}
