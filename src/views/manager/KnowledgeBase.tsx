import { useRef, useState } from 'react';
import type { Attachment, KbItem, ThemeKey } from '../../types';
import { useApp } from '../../state/AppState';
import { AddFilesButton, AiLabel, AttachChips, Footnote, Icon, toAttachment } from '../../components/primitives';
import { KbCard } from '../../components/shell/KbCard';
import { CompanyLibrary } from './CompanyLibrary';
import { extractMaterial } from '../../lib/api';

const TOPICS: { key: ThemeKey; name: string }[] = [
  { key: 'vpn', name: 'VPN & remote access' },
  { key: 'db', name: 'Databases' },
  { key: 'onb', name: 'First-week schedule' },
  { key: 'exp', name: 'Expenses' },
  { key: 'pay', name: 'Payroll & bank details' },
  { key: 'mfa', name: 'MFA & new phones' },
  { key: 'leave', name: 'Leave & holidays' },
  { key: 'hw', name: 'Laptop & hardware' },
  { key: 'ben', name: 'Benefits & insurance' },
];

function NewMaterial({ onSave, onCancel }: { onSave: (item: KbItem) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState<ThemeKey>('vpn');
  const [problem, setProblem] = useState('');
  const [steps, setSteps] = useState('');
  const [files, setFiles] = useState<Attachment[]>([]);
  const [allowEmployeeAccess, setAllowEmployeeAccess] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractMessage, setExtractMessage] = useState('');
  const topicTouchedRef = useRef(false);
  const list = steps.split('\n').map((step) => step.trim()).filter(Boolean);
  const hasEmployeeMaterials = files.some((file) => file.mimeType === 'application/pdf' || file.mimeType?.startsWith('video/'));
  const valid = !!title.trim() && list.length > 0;

  async function analyzePdf(file: File) {
    if (file.type !== 'application/pdf') {
      setExtractMessage('PDF analysis is available for PDF files. Other files were attached without analysis.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setExtractMessage('This PDF is larger than 8 MB, so it was attached without analysis.');
      return;
    }
    setExtracting(true);
    setExtractMessage('Analyzing PDF. Your existing text will be kept.');
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read PDF'));
        reader.onerror = () => reject(reader.error ?? new Error('Could not read PDF'));
        reader.readAsDataURL(file);
      });
      const result = await extractMaterial({ filename: file.name, mimeType: file.type, data });
      if (!result) {
        setExtractMessage('PDF analysis was unavailable. You can complete the fields manually.');
        return;
      }
      setTitle((current) => current.trim() ? current : result.title);
      setProblem((current) => current.trim() ? current : result.problem);
      setSteps((current) => current.trim() ? current : result.steps.join('\n'));
      if (!topicTouchedRef.current) setTopic(result.theme);
      setExtractMessage('AI suggestions added to empty fields only. Please review before publishing.');
    } catch {
      setExtractMessage('PDF analysis failed. The file is attached and the fields can be completed manually.');
    } finally {
      setExtracting(false);
    }
  }

  function addFiles(list: FileList) {
    const selected = Array.from(list);
    setFiles((current) => [...current, ...selected.map(toAttachment)].slice(0, 6));
    selected.filter((file) => file.type === 'application/pdf' || file.type.startsWith('video/')).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') return;
        setFiles((current) => current.map((item) => item.name === file.name ? { ...item, url: reader.result as string, mimeType: file.type } : item));
      };
      reader.readAsDataURL(file);
    });
    const pdf = selected.find((file) => file.type === 'application/pdf');
    if (pdf) void analyzePdf(pdf);
    else if (selected.length) setExtractMessage('Files attached. Upload a PDF to generate field suggestions.');
  }

  function save(status: KbItem['status']) {
    onSave({
      id: 'kb-new-' + Date.now().toString(36),
      roomId: null,
      roomName: 'Added by Rachel',
      theme: topic,
      title: title.trim(),
      problem: problem.trim(),
      steps: list,
      files: files.map(({ name, kind, size, url, mimeType }) => ({ name, kind, size, url, mimeType })),
      allowEmployeeAccess,
      pic: { id: 'rg', name: 'Rachel Goh', first: 'Rachel', initials: 'RG', team: 'Support lead' },
      employee: '',
      manual: true,
      status,
      at: 'Today',
    });
  }

  function removeFile(id: string) {
    setFiles((current) => {
      const next = current.filter((file) => file.id !== id);
      if (!next.some((file) => file.mimeType === 'application/pdf' || file.mimeType?.startsWith('video/'))) {
        setAllowEmployeeAccess(false);
      }
      return next;
    });
  }

  return (
    <form className="rc-kb rc-kb-new is-editing" aria-label="New material" onSubmit={(event) => event.preventDefault()}>
      <div className="rc-kb-top">
        <AiLabel>New material</AiLabel>
        <span className="rc-kb-st is-new"><i />You are writing this</span>
      </div>
      <label className="rc-kb-lab">Title
        <input className="rc-kb-input" value={title} maxLength={90} autoFocus placeholder="e.g. Get access to the staging database" onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="rc-kb-lab">Topic
        <select className="rc-kb-input is-select" value={topic} onChange={(event) => { topicTouchedRef.current = true; setTopic(event.target.value as ThemeKey); }}>
          {TOPICS.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
        </select>
      </label>
      <label className="rc-kb-lab">What it helps with
        <textarea className="rc-kb-area" rows={2} value={problem} placeholder="One or two sentences on the problem this solves." onChange={(event) => setProblem(event.target.value)} />
      </label>
      <label className="rc-kb-lab">Steps
        <span className="rc-kb-hint">One step per line</span>
        <textarea className="rc-kb-area is-steps" rows={5} value={steps} placeholder={'Open the HR portal\nChoose Payroll details\nSave'} onChange={(event) => setSteps(event.target.value)} />
      </label>
      <div className="rc-kb-lab">Photos or documents (optional)
        <div className="rc-kb-files">
          <AddFilesButton text={extracting ? 'Analyzing PDF…' : 'Add files'} onFiles={addFiles} />
          <AttachChips items={files} onRemove={removeFile} />
        </div>
        {extractMessage ? <span className="rc-kb-hint" role="status">{extractMessage}</span> : null}
      </div>
      {hasEmployeeMaterials ? (
        <label className="rc-kb-access">
          <input type="checkbox" checked={allowEmployeeAccess} onChange={(event) => setAllowEmployeeAccess(event.target.checked)} />
          <span><b>Allow new employees to access these materials</b><small>When published, employees can open PDFs or play videos from the answer card.</small></span>
        </label>
      ) : null}
      <div className="rc-kb-act">
        <button type="button" className="rc-btn-primary is-sm" disabled={!valid || extracting} onClick={() => save('live')}><Icon name="check" size={15} strokeWidth={2.2} />Publish</button>
        <button type="button" className="rc-btn-ghost is-sm" disabled={!valid || extracting} onClick={() => save('review')}>Save draft</button>
        <button type="button" className="rc-quiet" onClick={onCancel}>Cancel</button>
      </div>
      <p className="rc-kb-m">Publish shows it to new hires right away, marked “From an expert”. A draft waits under Needs your review.</p>
    </form>
  );
}

/** Review AI summaries from solved rooms, keep live cards current, restore discarded ones. */
export function KnowledgeBase() {
  const { knowledge, kb } = useApp();
  const [showGone, setShowGone] = useState(false);
  const [adding, setAdding] = useState(false);
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
          {!adding ? <button type="button" className="rc-btn-primary is-sm" onClick={() => setAdding(true)}><Icon name="plus" size={15} strokeWidth={2.2} />New material</button> : null}
        </div>
        <p className="rc-sec-s">ReadyCheck AI drafts a card each time an employee says a room solved their problem. Edit the title or steps if needed, then approve to show it to the next new hire who asks.</p>
        {adding ? <div className="rc-kb-newwrap"><NewMaterial onSave={(item) => { kb.add(item); setAdding(false); }} onCancel={() => setAdding(false)} /></div> : null}
        {review.length ? grid(review, 'review') : !adding ? (
          <div className="rc-allclear"><span className="rc-fb-tick"><Icon name="check" size={14} strokeWidth={2.4} /></span>Nothing to review. New summaries land here when a room is solved.</div>
        ) : null}
      </section>
      <section aria-labelledby="rc-kbl-h">
        <h2 className="rc-sec-h" id="rc-kbl-h"><i className="rc-state-dot is-room" />Live for new hires</h2>
        <p className="rc-sec-s">Approved cards. ReadyCheck shows these first, marked “From an expert”.</p>
        {live.length ? grid(live, 'live') : <p className="rc-sec-empty">No approved cards yet.</p>}
      </section>
      <CompanyLibrary />
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
