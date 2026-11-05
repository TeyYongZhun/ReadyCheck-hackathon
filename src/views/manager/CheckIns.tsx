import { useState } from 'react';
import type { CheckinInsightsResponse } from '../../api-types';
import type { MilestoneKey, PulseKey } from '../../types';
import { useApp } from '../../state/AppState';
import { CHECKIN_MILESTONES, COHORT, MIN_GROUP, PULSE_ANSWERS, questionsForMilestone } from '../../data/checkins';
import { followUpFeed, groupFollowUp, milestoneParticipation, namedShareOf, pulseCheckinsForView, supportNeedsAt, talkRequests, totalsOf } from '../../lib/checkins';
import { cx } from '../../lib/util';
import { Footnote, Icon, PageHead, Person } from '../../components/primitives';

/**
 * `action` is what the manager does (internal). `note` is a draft of the one sentence employees will see.
 * Matched on the question's dimension name, so renaming a milestone's questions can't pair a
 * difficulty with the wrong response (e.g. Social Acceptance getting the workload advice).
 */
type Guidance = { action: string; note: string };
const GUIDANCE: { test: RegExp; value: Guidance }[] = [
  {
    test: /clarity|expect|role/i,
    value: {
      action: 'Share role priorities and invite a short priorities review.',
      note: 'We shared a summary of role priorities and opened a short priorities review for your cohort.',
    },
  },
  {
    test: /tool|resource|access/i,
    value: {
      action: 'Share the access checklist and offer a group troubleshooting slot.',
      note: 'We updated the first-week access checklist and added a group troubleshooting slot.',
    },
  },
  {
    test: /help|support/i,
    value: {
      action: 'Offer an optional team Q&A or buddy check-in.',
      note: 'We added an optional team Q&A and named who to ask for help.',
    },
  },
  {
    test: /social|accept|belong|team/i,
    value: {
      action: 'Pair each new hire with a buddy and plan a short cohort coffee or lunch.',
      note: 'We matched everyone with an onboarding buddy and set up a cohort coffee to meet the wider team.',
    },
  },
  {
    test: /workload|training|manageable/i,
    value: {
      action: 'Review the training load and agree on the next priority.',
      note: 'We reviewed the training schedule and agreed on the next priorities.',
    },
  },
];
const GENERIC_GUIDANCE: Guidance = {
  action: 'Discuss this with the cohort and agree on one concrete next step.',
  note: 'We heard your feedback and are working on a next step for this.',
};
const guidanceFor = (question: { dimension: string }): Guidance =>
  GUIDANCE.find((item) => item.test.test(question.dimension))?.value ?? GENERIC_GUIDANCE;

const PRESET_INSIGHTS: Record<string, string[]> = {
  'Role Clarity': [
    'Responses suggest that clearer role expectations could help new hires settle into their responsibilities.',
    'Some responses indicate that new hires may benefit from a clearer picture of what success looks like in their role.',
    'The response pattern suggests revisiting role expectations and making space for questions about responsibilities.',
  ],
  'Tools & Resources': [
    'Responses point to an opportunity to make first-week tools and resources easier to access.',
    'The pattern suggests checking whether new hires can find the systems, guides, and materials they need.',
    'Some responses indicate that a simple access walkthrough could make it easier to get started.',
  ],
  'Knowing Where to Get Help': [
    'Responses suggest reinforcing where new hires can turn when they need support.',
    'The pattern points to an opportunity to make support contacts and help channels easier to identify.',
    'Some responses suggest that new hires may benefit from a clear introduction to who can help with common questions.',
  ],
  'Social Acceptance': [
    'Responses point to an opportunity to strengthen early connections and inclusion within the team.',
    'The pattern suggests creating more chances for new hires to feel welcomed and included by teammates.',
    'Some responses indicate that intentional introductions could help new hires feel more connected.',
  ],
  'Responsibilities & Priorities': [
    'Responses suggest reinforcing role priorities as responsibilities begin to take shape.',
    'The pattern points to an opportunity to clarify which responsibilities matter most right now.',
    'Some responses suggest a priorities check-in could help align expectations and near-term work.',
  ],
  'Task Confidence': [
    'Responses point to an opportunity for guided practice as new hires build confidence in their tasks.',
    'The pattern suggests identifying tasks where examples or a short walkthrough would be useful.',
    'Some responses indicate that supported practice could help new hires feel more confident doing their work.',
  ],
  'Social Integration': [
    'Responses suggest creating more comfortable opportunities for new hires to connect with teammates.',
    'The pattern points to an opportunity to encourage regular, low-pressure team communication.',
    'Some responses suggest that buddy conversations or team introductions could support connection.',
  ],
  Workload: [
    'Responses suggest checking that current tasks and responsibilities feel manageable.',
    'The pattern points to an opportunity to review workload balance and agree on immediate priorities.',
    'Some responses indicate it may help to discuss capacity and clarify what can wait.',
  ],
  'Team Goals': [
    'Responses point to an opportunity to make the connection between individual work and team goals clearer.',
    'The pattern suggests explaining how current responsibilities contribute to the team’s priorities.',
    'Some responses indicate that linking tasks to team outcomes could make priorities easier to understand.',
  ],
  'Task Mastery': [
    'Responses suggest offering targeted practice to support confidence with regular tasks.',
    'The pattern points to an opportunity to identify routine tasks where more coaching would help.',
    'Some responses suggest pairing clear examples with time to practise common responsibilities.',
  ],
  'Processes & Workflows': [
    'Responses point to an opportunity to clarify the processes and workflows used in this role.',
    'The pattern suggests walking through key workflows and where to find process documentation.',
    'Some responses indicate that a practical process overview could help reduce uncertainty.',
  ],
  'Useful Feedback': [
    'Responses suggest checking that feedback is timely, clear, and useful for continued improvement.',
    'The pattern points to an opportunity to make feedback conversations more specific and actionable.',
    'Some responses suggest agreeing on a regular way to share progress and constructive feedback.',
  ],
  Prioritisation: [
    'Responses suggest supporting new hires as they decide how to prioritise their responsibilities.',
    'The pattern points to an opportunity to discuss trade-offs and how urgent work is identified.',
    'Some responses indicate a shared prioritisation check could help build independent decision-making.',
  ],
  'Handling Challenges': [
    'Responses point to an opportunity to build confidence in resolving common work challenges.',
    'The pattern suggests reviewing where to find guidance when unexpected issues come up.',
    'Some responses indicate that discussing examples of common challenges could support independence.',
  ],
  'Team Contribution': [
    'Responses suggest creating space for new hires to share ideas and contribute to discussions.',
    'The pattern points to an opportunity to invite new perspectives during team conversations.',
    'Some responses suggest checking that new hires have comfortable ways to voice questions and ideas.',
  ],
  Autonomy: [
    'Responses suggest checking whether new hires have the autonomy needed to carry out their responsibilities.',
    'The pattern points to an opportunity to clarify which decisions new hires can make independently.',
    'Some responses indicate a conversation about decision-making boundaries could support ownership.',
  ],
  'Role Confidence': [
    'Responses point to an opportunity to reinforce confidence with regular role responsibilities.',
    'The pattern suggests checking which responsibilities feel settled and where additional support would help.',
    'Some responses indicate that recognising progress and discussing open questions could build confidence.',
  ],
  Belonging: [
    'Responses suggest continuing to support a sense of belonging and connection within the team.',
    'The pattern points to an opportunity to check whether new hires feel included in team routines.',
    'Some responses suggest making time for connection and recognising each person’s contributions.',
  ],
  'Organizational Goals': [
    'Responses point to an opportunity to clarify how individual work connects to organisational goals.',
    'The pattern suggests sharing more context about the organisation’s direction and current priorities.',
    'Some responses indicate that connecting role outcomes to broader goals could provide useful context.',
  ],
  'Future Growth': [
    'Responses suggest discussing development interests and possible future growth opportunities.',
    'The pattern points to an opportunity to make time for conversations about learning and career goals.',
    'Some responses suggest exploring which skills or experiences new hires would like to develop next.',
  ],
};

const PRESET_ACTIONS: Record<string, string[]> = {
  'Role Clarity': [
    'Share role priorities and invite a short priorities review.',
    'Walk through key responsibilities and agree on what success looks like in the first month.',
    'Schedule a brief role-clarity check-in and document open questions.',
  ],
  'Tools & Resources': [
    'Share the access checklist and offer a group troubleshooting slot.',
    'Host a short setup session to help the cohort locate essential tools and resources.',
    'Create a single onboarding resource list and confirm everyone knows where to find it.',
  ],
  'Knowing Where to Get Help': [
    'Offer an optional team Q&A or buddy check-in.',
    'Share a simple contact guide showing who can help with common questions.',
    'Pair new hires with a buddy for a short weekly support check-in.',
  ],
  'Social Acceptance': [
    'Pair each new hire with a buddy and plan a short cohort coffee or lunch.',
    'Arrange informal introductions with teammates and key collaborators.',
    'Invite the cohort to a low-pressure team activity and make space for introductions.',
  ],
  'Responsibilities & Priorities': [
    'Review current responsibilities and agree on the top priorities for this week.',
    'Hold a short alignment meeting to clarify ownership, deadlines, and what can wait.',
    'Share a written priority list and revisit it together at the next check-in.',
  ],
  'Task Confidence': [
    'Offer guided practice on the tasks the cohort finds most challenging.',
    'Share examples of completed work and schedule time for supervised practice.',
    'Set up a peer walkthrough for common tasks, followed by time for questions.',
  ],
  'Social Integration': [
    'Create regular, low-pressure opportunities for new hires to connect with teammates.',
    'Invite the cohort to join a team discussion or collaborative session.',
    'Pair new hires with teammates for informal introductions across the team.',
  ],
  Workload: [
    'Review the training load and agree on the next priority.',
    'Check current capacity with the cohort and adjust near-term deadlines if needed.',
    'Work with each new hire to identify what should be prioritised, deferred, or delegated.',
  ],
  'Team Goals': [
    'Walk through team priorities and show how current tasks contribute to them.',
    'Share a concise team goals overview with examples tied to common role responsibilities.',
    'Use the next team check-in to connect individual work to shared outcomes.',
  ],
  'Task Mastery': [
    'Offer targeted practice on regular tasks where the cohort wants more guidance.',
    'Provide step-by-step examples for common workflows and time to practise them.',
    'Arrange a peer demonstration of core tasks, followed by supported hands-on practice.',
  ],
  'Processes & Workflows': [
    'Walk through the key workflows and point out where the process guides live.',
    'Create a short process map for recurring tasks and review it with the cohort.',
    'Hold a workflow Q&A focused on the processes new hires find least clear.',
  ],
  'Useful Feedback': [
    'Agree on regular feedback check-ins with specific, actionable takeaways.',
    'Ask managers to share timely examples of what is going well and what to improve.',
    'Set a short feedback conversation to align on progress and next development steps.',
  ],
  Prioritisation: [
    'Review how to prioritise competing responsibilities and discuss common trade-offs.',
    'Share a simple prioritisation framework and practise applying it to typical tasks.',
    'Agree on a regular priority-setting check-in while new hires build independence.',
  ],
  'Handling Challenges': [
    'Discuss common work challenges and where to find guidance before escalating.',
    'Walk through a few typical scenarios and practise deciding on next steps.',
    'Share a troubleshooting guide with clear options for when to ask for support.',
  ],
  'Team Contribution': [
    'Invite new hires to share an idea or question at the next team discussion.',
    'Build a short round of input into team meetings so everyone has space to contribute.',
    'Ask each new hire which format helps them feel comfortable sharing suggestions.',
  ],
  Autonomy: [
    'Clarify which decisions new hires can make independently and where to check in.',
    'Agree on decision-making boundaries, then gradually expand ownership of routine work.',
    'Review any approval bottlenecks and identify responsibilities that can be handled autonomously.',
  ],
  'Role Confidence': [
    'Recognise progress and discuss any regular responsibilities that still feel uncertain.',
    'Review recent work together and identify one area for continued practice or support.',
    'Set a short confidence check-in to surface questions and reinforce what is going well.',
  ],
  Belonging: [
    'Create space for new hires to connect and recognise their contributions to the team.',
    'Invite new hires into team routines and ask what would help them feel more included.',
    'Arrange a buddy conversation focused on team connections and ways to get involved.',
  ],
  'Organizational Goals': [
    'Share context on organisational priorities and how this role contributes to them.',
    'Discuss current organisational goals and connect them to examples of day-to-day work.',
    'Provide a concise goals overview and invite questions about the organisation’s direction.',
  ],
  'Future Growth': [
    'Discuss development interests and identify a practical next learning opportunity.',
    'Schedule a growth conversation to explore skills the new hire would like to build.',
    'Map a few relevant learning opportunities to the employee’s stated development goals.',
  ],
};

/** Sample "AI" drafts of the message employees see. Past tense, because it is published after the action is complete. */
const PRESET_UPDATES: Record<string, string[]> = {
  'Role Clarity': [
    'You told us role expectations weren’t always clear, so we shared a summary of role priorities and opened a short review for your cohort.',
    'Thanks for your feedback on role clarity. We walked through key responsibilities and what success looks like in your first month.',
  ],
  'Tools & Resources': [
    'You told us some tools were hard to reach, so we updated the first-week access checklist and added a group troubleshooting slot.',
    'Thanks for flagging access issues. We gathered the key onboarding tools and resources into one list for your cohort.',
  ],
  'Knowing Where to Get Help': [
    'You told us it wasn’t always clear who to ask, so we shared a contact guide for common questions.',
    'Thanks for your feedback. We added an optional team Q&A and named who to ask for help.',
  ],
  'Social Acceptance': [
    'You told us it could be easier to connect with the team, so we matched everyone with a buddy and set up a cohort coffee.',
    'Thanks for your feedback. We arranged informal introductions with teammates and key collaborators.',
  ],
  'Responsibilities & Priorities': [
    'You told us priorities could be clearer, so we reviewed current responsibilities and shared a written priority list.',
    'Thanks for your feedback. We held a short alignment session on ownership, deadlines and what can wait.',
  ],
  'Task Confidence': [
    'You told us some tasks still feel challenging, so we added guided practice on the tasks your cohort finds hardest.',
    'Thanks for your feedback. We shared examples of completed work and set aside time for supported practice.',
  ],
  'Social Integration': [
    'You told us team communication could be easier, so we created more low-pressure ways to connect with teammates.',
    'Thanks for your feedback. We invited your cohort into a team session and arranged informal introductions.',
  ],
  Workload: [
    'You told us the workload felt heavy, so we reviewed the training schedule and agreed on the next priorities.',
    'Thanks for your feedback. We checked capacity with your cohort and adjusted near-term deadlines where needed.',
  ],
  'Team Goals': [
    'You told us the link to team goals could be clearer, so we walked through team priorities and how current tasks contribute.',
    'Thanks for your feedback. We shared a short team goals overview with examples from common responsibilities.',
  ],
  'Task Mastery': [
    'You told us some regular tasks need more guidance, so we added targeted practice for your cohort.',
    'Thanks for your feedback. We shared step-by-step examples and time to practise common workflows.',
  ],
  'Processes & Workflows': [
    'You told us some processes were unclear, so we walked through key workflows and where to find the guides.',
    'Thanks for your feedback. We shared a short process map for recurring tasks and held a workflow Q&A.',
  ],
  'Useful Feedback': [
    'You told us feedback could be more useful, so we agreed on regular check-ins with specific takeaways.',
    'Thanks for your feedback. We asked managers to share more timely examples of what is going well and what to improve.',
  ],
  Prioritisation: [
    'You told us prioritising could be easier, so we shared a simple framework and practised it on typical tasks.',
    'Thanks for your feedback. We reviewed how to handle competing responsibilities and common trade-offs.',
  ],
  'Handling Challenges': [
    'You told us some challenges still need support, so we shared a troubleshooting guide with clear options for when to ask.',
    'Thanks for your feedback. We walked through common scenarios and how to decide on next steps.',
  ],
  'Team Contribution': [
    'You told us sharing ideas could be easier, so we added a short round of input to team meetings.',
    'Thanks for your feedback. We made more space for new perspectives in team discussions.',
  ],
  Autonomy: [
    'You told us you’d like more clarity on decisions, so we confirmed what you can decide independently and when to check in.',
    'Thanks for your feedback. We reviewed approval bottlenecks and which routine work you can own.',
  ],
  'Role Confidence': [
    'You told us some responsibilities still feel uncertain, so we set up short check-ins to work through open questions.',
    'Thanks for your feedback. We reviewed recent progress and agreed on areas for continued support.',
  ],
  Belonging: [
    'You told us feeling part of the team could be easier, so we opened more team routines to your cohort.',
    'Thanks for your feedback. We set up buddy conversations about team connections and ways to get involved.',
  ],
  'Organizational Goals': [
    'You told us the bigger picture could be clearer, so we shared context on organisational priorities and how your role contributes.',
    'Thanks for your feedback. We shared a short goals overview and opened time for questions.',
  ],
  'Future Growth': [
    'You told us you’d like to talk about growth, so we opened time to discuss development interests and next steps.',
    'Thanks for your feedback. We mapped learning opportunities to the development goals you shared.',
  ],
};

export function CheckIns() {
  const app = useApp();
  const [pulseMilestone, setPulseMilestone] = useState<MilestoneKey>('week1');
  const [aiInsightsByKey, setAiInsightsByKey] = useState<Record<string, CheckinInsightsResponse['themes'][number]>>({});
  const [aiPresetIndexByKey, setAiPresetIndexByKey] = useState<Record<string, number>>({});
  const [actionPresetIndexByKey, setActionPresetIndexByKey] = useState<Record<string, number>>({});
  const [aiLoadingKey, setAiLoadingKey] = useState<string | null>(null);
  const [planningDraft, setPlanningDraft] = useState<{ id?: string; theme: string; pulse?: PulseKey; label: string; milestone: MilestoneKey } | null>(null);
  const [publishingActionId, setPublishingActionId] = useState<string | null>(null);
  const [publicNote, setPublicNote] = useState('');
  const [publicGuideId, setPublicGuideId] = useState('');
  const [updatePresetIndexByKey, setUpdatePresetIndexByKey] = useState<Record<string, number>>({});
  const [draftingUpdate, setDraftingUpdate] = useState(false);
  const latest = [...app.latestCheckins.values()];
  const pulseCheckins = pulseCheckinsForView(app.checkins, latest, pulseMilestone);
  const pulseTotals = totalsOf(pulseCheckins);
  const nameShare = namedShareOf(pulseCheckins);
  // One count per person, from their latest check-in, so the total matches the people in Completed check-ins.
  const sharing = namedShareOf(latest);
  const newNamedCheckins = latest.filter((checkin) => checkin.isNew && checkin.named).length;
  const newAnonymousCheckins = latest.filter((checkin) => checkin.isNew && !checkin.named).length;
  const selectedMilestone = CHECKIN_MILESTONES.find((milestone) => milestone.key === pulseMilestone)!;
  const planningQuestion = planningDraft
    ? questionsForMilestone(planningDraft.milestone).find((question) => question.key === planningDraft.pulse)
    : undefined;
  const planningInsightKey = planningDraft?.pulse ? `${planningDraft.milestone}:${planningDraft.pulse}` : '';
  const planningActionSuggestions = planningQuestion
    ? PRESET_ACTIONS[planningQuestion.dimension] ?? [guidanceFor(planningQuestion).action]
    : [];
  const planningActionSuggestion = planningActionSuggestions[actionPresetIndexByKey[planningInsightKey] ?? 0];

  // Headcounts only: how many employees have checked in at the milestone they are currently in.
  const completedCurrent = COHORT.filter((hire) => app.checkins.some((checkin) => checkin.person === hire.id && checkin.milestone === hire.milestone)).length;
  const pending = Math.max(0, COHORT.length - completedCurrent);

  const feed = followUpFeed(app.checkins, app.actions, COHORT);
  const groupResults = groupFollowUp(app.checkins, app.actions);
  const talks = talkRequests(app.checkins, app.actions, COHORT);
  const milestones = milestoneParticipation(app.checkins, COHORT);
  const selectedMilestoneState = milestones.find(({ milestone }) => milestone.key === selectedMilestone.key)!.state;

  const supportNeeds = supportNeedsAt(app.checkins, app.actions, selectedMilestone.key);
  // The two cards follow the loop across every milestone: what was detected, and whether the response helped.
  const needsResponse = CHECKIN_MILESTONES.flatMap((milestone) => supportNeedsAt(app.checkins, app.actions, milestone.key)).filter(({ action }) => !action).length;
  const improvedReplies = groupResults.reduce((sum, result) => sum + result.improved, 0);
  const followUpReplies = groupResults.reduce((sum, result) => sum + result.responded, 0);

  async function generateSupportPlan(question: { key: PulseKey; dimension: string }) {
    if (pulseCheckins.length < MIN_GROUP || aiLoadingKey) return;
    const insightKey = `${selectedMilestone.key}:${question.key}`;
    setAiLoadingKey(insightKey);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 600));
    const guidance = guidanceFor(question);
    const presets = PRESET_INSIGHTS[question.dimension] ?? [
      'Responses suggest discussing this area with the cohort and agreeing on a practical next step.',
      'The pattern points to an opportunity to check what support would be most useful in this area.',
      'Some responses suggest a short cohort discussion could help clarify priorities and next steps.',
    ];
    const presetIndex = ((aiPresetIndexByKey[insightKey] ?? -1) + 1) % presets.length;
    setAiPresetIndexByKey((current) => ({ ...current, [insightKey]: presetIndex }));
    setAiInsightsByKey((current) => ({
      ...current,
      [insightKey]: {
        name: question.dimension,
        count: pulseTotals[question.key].partly + pulseTotals[question.key].notyet,
        summary: presets[presetIndex],
        action: guidance.action,
        note: guidance.note,
      },
    }));
    setAiLoadingKey(null);
  }

  /** Fills the message with the next sample draft for this question. */
  async function draftUpdate(question: { key: PulseKey; dimension: string }) {
    if (draftingUpdate) return;
    const insightKey = `${selectedMilestone.key}:${question.key}`;
    const presets = PRESET_UPDATES[question.dimension] ?? [guidanceFor(question).note];
    const presetIndex = ((updatePresetIndexByKey[insightKey] ?? -1) + 1) % presets.length;
    setDraftingUpdate(true);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 600));
    setUpdatePresetIndexByKey((current) => ({ ...current, [insightKey]: presetIndex }));
    setPublicNote(presets[presetIndex]);
    setDraftingUpdate(false);
  }

  function confirmPlanning() {
    if (!planningDraft?.label.trim()) return;
    app.planAction(planningDraft);
    setPlanningDraft(null);
  }

  return (
    <div className="rc-home rc-ci rc-ci-dashboard" role="tabpanel" id="rc-pane-checkins" aria-labelledby="rc-tab-checkins">
      <PageHead title="Check-ins" sub="Understand how new hires are experiencing their onboarding journey.">
        <span className="rc-ci-sample">Illustrative sample data</span>
      </PageHead>

      <dl className="rc-home-stats rc-ci-kpis">
        <div className="rc-home-stat">
          <dt>Completed check-ins<span className="rc-home-ic"><Icon name="check" size={18} /></span></dt>
          <dd>{completedCurrent}</dd>
          <p>Employees checked in at their current milestone</p>
        </div>
        <div className="rc-home-stat">
          <dt>Pending check-ins<span className="rc-home-ic"><Icon name="clock" size={18} /></span></dt>
          <dd>{pending}</dd>
          <p>Employees yet to check in</p>
        </div>
        <div className="rc-home-stat">
          <dt>Needs a response<span className="rc-home-ic"><Icon name="bell" size={18} /></span></dt>
          <dd>{needsResponse}</dd>
          <p>Group difficulties with no action planned</p>
        </div>
        <div className="rc-home-stat">
          <dt>Reported improvement<span className="rc-home-ic"><Icon name="ready" size={18} /></span></dt>
          <dd>{followUpReplies ? `${improvedReplies} of ${followUpReplies}` : '—'}</dd>
          <p>Follow-up replies saying things are better</p>
        </div>
      </dl>

      <div className="rc-ci-journey-grid">
      <section className="rc-home-card rc-glass rc-glass-2 rc-ci-section rc-ci-pulse-section" aria-labelledby="rc-ci-pulse-h">
        <header className="rc-panel-head">
          <div>
            <h2 className="rc-panel-h" id="rc-ci-pulse-h">Onboarding pulse</h2>
            <p className="rc-panel-s">Questions are tailored to each onboarding milestone.</p>
          </div>
          {pulseCheckins.length >= MIN_GROUP ? <span className="rc-ci-response-count"> Total: {pulseCheckins.length} responses</span> : null}
        </header>
        <div className="rc-ci-pulse-controls">
          <div className="rc-seg rc-ci-pulse-seg" role="group" aria-label="Onboarding pulse milestone">
            {CHECKIN_MILESTONES.map((milestone) => (
              <button key={milestone.key} type="button" aria-pressed={pulseMilestone === milestone.key} className={cx(pulseMilestone === milestone.key && 'is-on')} onClick={() => setPulseMilestone(milestone.key)}>
                {milestone.label}
              </button>
            ))}
          </div>
          {pulseCheckins.length >= MIN_GROUP ? (
            <p className="rc-ci-name-share">{nameShare.named} of {nameShare.total} shared their name</p>
          ) : null}
        </div>
        <div className="rc-ci-pulse-group">
          <div className="rc-ci-pulse-title">
            <b>{selectedMilestone.label} · {selectedMilestone.title}</b>
            <span className={cx('rc-kb-st', selectedMilestoneState === 'Upcoming' ? 'is-upcoming' : 'is-released')}>
              <i />{selectedMilestoneState === 'Upcoming' ? 'Upcoming' : 'Released'}
            </span>
          </div>
          <p className="rc-ci-pulse-focus">Focus: {selectedMilestone.focus}</p>
          <ul className="rc-ci-bars">
            {questionsForMilestone(selectedMilestone.key).map((question) => {
              const counts = pulseTotals[question.key];
              return (
                <li className="rc-ci-pulse-row" key={question.key}>
                  <div className="rc-ci-pulse-question">
                    <b>{question.dimension}</b>
                    <span>{question.text}</span>
                  </div>
                  {pulseCheckins.length >= MIN_GROUP ? (
                    <div className="rc-ci-pulse-data">
                      <span className="rc-ci-bars-t" role="img" aria-label={`${question.dimension}: ${counts.yes} Yes, ${counts.partly} Partly, ${counts.notyet} Not yet, ${counts.na} Not applicable`}>
                        {PULSE_ANSWERS.map((answer) => counts[answer.key] ? <i key={answer.key} className={'is-' + answer.key} style={{ flexGrow: counts[answer.key] }} /> : null)}
                      </span>
                      <div className="rc-ci-answer-counts">
                        {PULSE_ANSWERS.map((answer) => (
                          <span key={answer.key}><i className={'is-' + answer.key} />{answer.label} <b>{counts[answer.key]}</b></span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {pulseCheckins.length < MIN_GROUP ? (
            <p className="rc-sec-empty">Response distributions appear once at least {MIN_GROUP} employees have checked in at this milestone.</p>
          ) : null}
        </div>
        <p className="rc-home-note">Note: Partly and Not yet indicate a reported difficulty, not disengagement or resignation risk.</p>
      </section>

      <div className="rc-ci-journey-side">
      <section className="rc-home-card rc-glass rc-glass-2 rc-ci-section" aria-labelledby="rc-ci-timeline-h">
        <header className="rc-panel-head">
          <div>
            <h2 className="rc-panel-h" id="rc-ci-timeline-h">Check-in timeline</h2>
            <p className="rc-panel-s">Participation among employees currently within each milestone window. Open means the window is active.</p>
          </div>
        </header>
        <ol className="rc-ci-timeline">
          {milestones.map(({ milestone, eligible, done, missed, state }) => {
            const isUpcoming = state === 'Upcoming';
            // Tick only when everyone who has reached the milestone has checked in.
            const allIn = eligible > 0 && done === eligible;
            // Small groups only show the state, so a count like 1/2 can't point at one person.
            const showCounts = eligible >= MIN_GROUP;
            const status = isUpcoming
              ? 'Upcoming'
              : !showCounts
                ? state
                : [state, `${done}/${eligible}`, missed ? `${missed} missed` : ''].filter(Boolean).join(' · ');
            return (
              <li key={milestone.key} className={cx('rc-ci-milestone', isUpcoming && 'is-upcoming', allIn && 'is-completed')}>
                <span className="rc-ci-milestone-mark" aria-hidden>{allIn ? <Icon name="check" size={13} /> : null}</span>
                <div className="rc-ci-milestone-copy">
                  <b>{milestone.label}</b>
                  <span>{milestone.title}</span>
                </div>
                <span className="rc-ci-milestone-status">{status}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rc-home-card rc-glass rc-glass-2 rc-ci-section rc-ci-sharing" aria-labelledby="rc-ci-sharing-h">
        <header className="rc-panel-head">
          <div>
            <h2 className="rc-panel-h" id="rc-ci-sharing-h">Sharing overview</h2>
            <p className="rc-panel-s">How employees chose to share in their latest check-in.</p>
          </div>
        </header>
        {sharing.total >= MIN_GROUP ? (
          <div className="rc-ci-sharing-grid">
            <div className="rc-ci-sharing-card">
              <span className="rc-ci-sharing-icon is-named"><Icon name="users" size={18} /></span>
              <div><span className="rc-ci-sharing-title"><b>Named</b>{newNamedCheckins ? <em>+{newNamedCheckins}</em> : null}</span><strong>{sharing.named}</strong><span>Can support individual follow-up.</span></div>
            </div>
            <div className="rc-ci-sharing-card">
              <span className="rc-ci-sharing-icon is-anonymous"><Icon name="shield" size={18} /></span>
              <div><span className="rc-ci-sharing-title"><b>Anonymous</b>{newAnonymousCheckins ? <em>+{newAnonymousCheckins}</em> : null}</span><strong>{sharing.total - sharing.named}</strong><span>Used for aggregated insights.</span></div>
            </div>
          </div>
        ) : <p className="rc-sec-empty">Appears once at least {MIN_GROUP} employees have checked in.</p>}
      </section>
      </div>
      </div>

      <section className="rc-home-card rc-glass rc-glass-2 rc-ci-section rc-ci-support" aria-labelledby="rc-ci-support-h">
        <header className="rc-panel-head">
          <div>
            <h2 className="rc-panel-h" id="rc-ci-support-h">Support priorities</h2>
            <p className="rc-panel-s">Group-level difficulties from {selectedMilestone.label} that may need a response.</p>
          </div>
          <div className="rc-ci-support-actions">
            <span className="rc-ci-private-badge"><Icon name="users" size={14} /> Cohort-level</span>
          </div>
        </header>
        <div className="rc-ci-support-controls">
          <span>Check-in stage</span>
          <div className="rc-seg rc-ci-support-seg" role="group" aria-label="Support priorities milestone">
            {CHECKIN_MILESTONES.map((milestone) => (
              <button key={milestone.key} type="button" aria-pressed={pulseMilestone === milestone.key} className={cx(pulseMilestone === milestone.key && 'is-on')} onClick={() => setPulseMilestone(milestone.key)}>
                {milestone.label}
              </button>
            ))}
          </div>
        </div>
        {supportNeeds.length ? (
          <ul className="rc-ci-support-list">
            {supportNeeds.map(({ question, partly, notyet, action }) => {
              const guidance = guidanceFor(question);
              const insightKey = `${selectedMilestone.key}:${question.key}`;
              const aiTheme = aiInsightsByKey[insightKey];
              const groupResult = action ? groupResults.find((item) => item.action.id === action.id) : undefined;
              const responseCounts = pulseTotals[question.key];
              const actionStatus = action?.status === 'done' ? 'Completed' : action ? 'Planned' : 'Not planned';
              const updateStatus = action?.publishedAt ? 'Published' : 'Not published';
              const updateHint = action?.publishedAt ? 'Your cohort can see this message'
                : action?.status === 'done' ? 'Ready to review and publish'
                : action ? 'Complete the action first' : 'Plan an action first';
              const hasAiDraft = updatePresetIndexByKey[insightKey] !== undefined;
              const outcomeStatus = groupResult ? 'Evaluated' : 'Awaiting follow-up';
              return (
                <li className="rc-ci-support-item" key={question.key}>
                  <div className="rc-ci-support-heading">
                    <div className="rc-ci-support-title">
                      <b>{question.dimension}</b>
                      <span className={cx('rc-ci-priority-status', notyet > 0 && 'is-high')}>{partly + notyet} reporting difficulty</span>
                    </div>
                    <span>{partly} Partly · {notyet} Not yet</span>
                  </div>
                  <ol className="rc-ci-workflow">
                    <li>
                      <details className="rc-ci-workflow-stage">
                        <summary>
                          <span className="rc-ci-stage-number">1</span>
                          <span className="rc-ci-stage-heading"><b>AI insight</b><small>{aiTheme ? 'Insight ready' : `${partly + notyet} of ${pulseCheckins.length} report difficulty`}</small></span>
                          <span className={cx('rc-ci-stage-status', aiTheme && 'is-ready')}>{aiTheme ? 'Ready' : 'Needs insight'}</span>
                          <Icon name="chevron" size={15} />
                        </summary>
                        <div className="rc-ci-stage-content">
                          <div className="rc-ci-response-breakdown" aria-label="Response breakdown">
                            {PULSE_ANSWERS.map((answer) => (
                              <span key={answer.key}><i className={'is-' + answer.key} />{answer.label}<b>{responseCounts[answer.key]}</b></span>
                            ))}
                          </div>
                          {aiTheme ? <><p className="rc-ci-insight-summary">{aiTheme.summary}</p><p className="rc-ci-stage-muted">Demo preset · response counts are live</p></> : <p className="rc-ci-stage-muted">Generate a demo insight for this cohort-level difficulty.</p>}
                          <button type="button" className="rc-btn-ghost is-sm" disabled={pulseCheckins.length < MIN_GROUP || aiLoadingKey !== null} onClick={() => void generateSupportPlan(question)}>
                            <Icon name="bot" size={13} />{aiLoadingKey === insightKey ? (aiTheme ? 'Regenerating...' : 'Generating AI insight...') : aiTheme ? 'Regenerate AI insight' : 'Generate AI insight'}
                          </button>
                        </div>
                      </details>
                    </li>
                    <li>
                      <details className="rc-ci-workflow-stage">
                        <summary>
                          <span className="rc-ci-stage-number">2</span>
                          <span className="rc-ci-stage-heading"><b>Manager action</b><small>{action?.label ?? aiTheme?.action ?? guidance.action}</small></span>
                          <span className={cx('rc-ci-stage-status', action?.status === 'done' && 'is-ready', action && action.status !== 'done' && 'is-planned')}>{actionStatus}</span>
                          <Icon name="chevron" size={15} />
                        </summary>
                        <div className="rc-ci-stage-content">
                          <p className="rc-ci-stage-muted">Internal plan · not shared with employees</p>
                          <p className="rc-ci-stage-action">{action?.label ?? aiTheme?.action ?? guidance.action}</p>
                          <div className="rc-ci-stage-actions">
                            {action && action.status !== 'done' ? (
                              <button type="button" className="rc-btn-ghost is-sm" onClick={() => app.completeAction(action.id)}>Mark action complete</button>
                            ) : null}
                            {action?.status !== 'done' ? <button type="button" className="rc-btn-primary is-sm" onClick={() => setPlanningDraft({
                              id: action?.id,
                              theme: question.dimension,
                              pulse: question.key,
                              label: action?.label ?? aiTheme?.action ?? guidance.action,
                              milestone: selectedMilestone.key,
                            })}>{action ? 'Edit action plan' : 'Plan action'}</button> : null}
                          </div>
                        </div>
                      </details>
                    </li>
                    <li>
                      <details className="rc-ci-workflow-stage">
                        <summary>
                          <span className="rc-ci-stage-number">3</span>
                          <span className="rc-ci-stage-heading"><b>Tell your cohort</b><small>{updateHint}</small></span>
                          <span className={cx('rc-ci-stage-status', action?.publishedAt && 'is-ready')}>{updateStatus}</span>
                          <Icon name="chevron" size={15} />
                        </summary>
                        <div className="rc-ci-stage-content">
                          <p className="rc-ci-stage-muted">Tell everyone in the cohort what changed. Internal notes and individual responses are never included.</p>
                          {action ? (
                            publishingActionId === action.id ? (
                              <div className="rc-ci-publish">
                                <textarea className="rc-kb-area" rows={3} value={publicNote} onChange={(event) => setPublicNote(event.target.value)} aria-label="Message to your cohort" />
                                <div className="rc-ci-stage-actions">
                                  <button type="button" className="rc-btn-ghost is-sm" disabled={draftingUpdate} onClick={() => void draftUpdate(question)}>
                                    <Icon name="bot" size={13} />{draftingUpdate ? 'Drafting...' : hasAiDraft ? 'Another AI draft' : 'Draft with AI'}
                                  </button>
                                </div>
                                {hasAiDraft ? <p className="rc-ci-stage-muted">AI draft · demo preset. Review it before publishing.</p> : null}
                                <label className="rc-kb-lab">Guide for employees <span>Optional · they can open it from the message</span>
                                  <select className="rc-kb-input is-select" value={publicGuideId} onChange={(event) => setPublicGuideId(event.target.value)}>
                                    <option value="">No guide</option>
                                    {app.knowledge.filter((item) => item.status === 'live').map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                                  </select>
                                </label>
                                <div className="rc-ci-stage-actions">
                                  <button type="button" className="rc-btn-primary is-sm" disabled={!publicNote.trim() || draftingUpdate} onClick={() => {
                                    app.publishAction(action.id, publicNote.trim(), new Date().toISOString(), publicGuideId || undefined);
                                    setPublishingActionId(null);
                                    setPublicNote('');
                                  }}>{action.publishedAt ? 'Publish updated message' : 'Publish to cohort'}</button>
                                  <button type="button" className="rc-btn-ghost is-sm" onClick={() => { setPublishingActionId(null); setPublicNote(''); }}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {action.publicNote ? <p className="rc-ci-employee-message">{action.publicNote}</p> : (
                                  <>
                                    <p className="rc-ci-stage-muted">Draft · employees can’t see this yet</p>
                                    <p className="rc-ci-employee-message">{aiTheme?.note ?? guidance.note}</p>
                                  </>
                                )}
                                {action.resourceId ? <p className="rc-ci-stage-muted">Guide: {app.knowledge.find((item) => item.id === action.resourceId)?.title ?? 'No longer available'}</p> : null}
                                {action.status === 'done' ? (
                                  <button type="button" className="rc-btn-ghost is-sm" onClick={() => {
                                    setPublishingActionId(action.id);
                                    setPublicNote(action.publicNote ?? aiTheme?.note ?? guidance.note);
                                    setPublicGuideId(action.resourceId ?? '');
                                  }}>{action.publishedAt ? 'Edit message' : 'Review and publish'}</button>
                                ) : <p className="rc-ci-stage-muted">Complete the action in step 2 before telling your cohort.</p>}
                              </>
                            )
                          ) : <p className="rc-ci-stage-muted">Save a manager action plan before drafting a cohort update.</p>}
                        </div>
                      </details>
                    </li>
                    <li>
                      <details className="rc-ci-workflow-stage">
                        <summary>
                          <span className="rc-ci-stage-number">4</span>
                          <span className="rc-ci-stage-heading"><b>Follow-up outcome</b><small>{groupResult ? `${groupResult.improved} of ${groupResult.responded} report improvement` : 'Waiting for follow-up replies'}</small></span>
                          <span className={cx('rc-ci-stage-status', groupResult && 'is-ready')}>{outcomeStatus}</span>
                          <Icon name="chevron" size={15} />
                        </summary>
                        <div className="rc-ci-stage-content">
                          {groupResult ? (
                            <>
                              <p className="rc-ci-outcome-counts"><b>{groupResult.improved}</b> of <b>{groupResult.responded}</b> people who replied say this is better</p>
                              <p className="rc-ci-stage-muted">Only people who reported this difficulty were asked, and who was asked stays private. Read the replies under Follow-up responses. This result alone does not show that the action caused the change.</p>
                            </>
                          ) : <p className="rc-ci-stage-muted">After an action is completed and published, people who reported this difficulty are asked at their next check-in. Results appear once enough replies arrive to protect anonymity, with at least {MIN_GROUP} replies.</p>}
                        </div>
                      </details>
                    </li>
                  </ol>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rc-sec-empty">Support priorities will appear once at least {MIN_GROUP} employees report the same difficulty.</p>
        )}
        <p className="rc-home-note">Insights are based on aggregated check-in responses. Individual employee identities are not shown. AI suggests; the manager decides what happens next.</p>
      </section>

      {talks.length ? (
        <section className="rc-home-card rc-glass rc-glass-2 rc-ci-section" aria-labelledby="rc-ci-talk-h">
          <header className="rc-panel-head">
            <div>
              <h2 className="rc-panel-h" id="rc-ci-talk-h">Requests to talk</h2>
              <p className="rc-panel-s">These employees chose to share their name for this topic. Their check-in answers are not included.</p>
            </div>
          </header>
          <ul className="rc-ci-outcome-list">
            {talks.map(({ id, hire, topic }) => (
              <li key={id} className="rc-ci-outcome">
                <div className="rc-ci-outcome-heading">
                  <Person initials={hire.initials} />
                  <div className="rc-ci-outcome-person"><b>{hire.name}</b><span>{hire.role} · {hire.team}</span></div>
                  <span className="rc-ci-outcome-transition">{topic}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {planningDraft ? (
        <div className="rc-roomlayer rc-ci-plan-layer" role="dialog" aria-modal="true" aria-labelledby="rc-ci-plan-title">
          <div className="rc-roomlayer-scrim" onClick={() => setPlanningDraft(null)} />
          <section className="rc-troom rc-ci-plan-modal rc-glass rc-glass-3">
            <header className="rc-troom-head">
              <div className="rc-troom-row">
                <div>
                  <h2 className="rc-ci-h" id="rc-ci-plan-title">Plan cohort response</h2>
                  <p className="rc-ci-s">This internal action plan is not shared with employees.</p>
                </div>
                <button type="button" className="rc-toast-x rc-troom-x" aria-label="Close plan response" onClick={() => setPlanningDraft(null)}><Icon name="close" size={16} /></button>
              </div>
            </header>
            <div className="rc-ci-plan-body">
              <label className="rc-kb-lab">Manager action
                <textarea className="rc-kb-area" rows={3} value={planningDraft.label} onChange={(event) => setPlanningDraft({ ...planningDraft, label: event.target.value })} />
              </label>
              {planningQuestion ? (
                <div className="rc-ci-action-suggestion">
                  <small className="rc-ci-support-label">Suggested manager action · demo preset</small>
                  <p>{planningActionSuggestion}</p>
                  <div className="rc-ci-action-suggestion-actions">
                    <button type="button" className="rc-btn-ghost is-sm" onClick={() => setPlanningDraft({
                      ...planningDraft,
                      label: planningActionSuggestion,
                    })}>Use this suggestion</button>
                    <button type="button" className="rc-btn-ghost is-sm" onClick={() => setActionPresetIndexByKey((current) => ({
                      ...current,
                      [planningInsightKey]: ((current[planningInsightKey] ?? 0) + 1) % planningActionSuggestions.length,
                    }))}>Another AI Suggestion</button>
                  </div>
                </div>
              ) : null}
              <div className="rc-ci-publish-actions">
                <button type="button" className="rc-btn-primary is-sm" disabled={!planningDraft.label.trim()} onClick={confirmPlanning}>Save plan</button>
                <button type="button" className="rc-btn-ghost is-sm" onClick={() => setPlanningDraft(null)}>Cancel</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <details className="rc-home-card rc-glass rc-glass-2 rc-ci-section rc-ci-outcomes">
        <summary className="rc-ci-disclosure">
          <span>
            <b>Follow-up responses</b>
            <span>What employees said when asked if things improved. Names appear only if they chose to share them.</span>
          </span>
          <Icon name="chevron" size={16} />
        </summary>
        <div className="rc-ci-outcomes-body">
          {feed.length ? (
            <ul className="rc-ci-outcome-list">
              {feed.map(({ id, topic, label, milestone: stage, replies }) => (
                <li key={id} className="rc-ci-outcome">
                  <div className="rc-ci-outcome-heading">
                    <div className="rc-ci-outcome-person"><b>{topic}</b><span>{CHECKIN_MILESTONES.find((milestone) => milestone.key === stage)!.label}</span></div>
                  </div>
                  {label && topic !== label ? <p className="rc-ci-outcome-action"><Icon name="check" size={14} />{label}</p> : null}
                  <ul className="rc-ci-replies">
                    {replies.map((reply, index) => (
                      <li key={index} className="rc-ci-outcome-dimension">
                        <span className="rc-ci-outcome-dimension-name">
                          <b>{reply.hire?.name ?? 'Anonymous'}</b>
                          {reply.comment ? <small>{reply.comment}</small> : null}
                        </span>
                        <span className={cx('rc-ci-outcome-status', reply.answer === 'better' ? 'is-better' : 'is-not')}>
                          {reply.answer === 'better' ? 'Better' : 'Not Yet'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rc-sec-empty">Replies appear once enough people have responded to protect anonymity.</p>
          )}
          <p className="rc-home-note">Replies on a shared topic appear once at least {MIN_GROUP} people respond. A reply does not prove a support action caused an improvement.</p>
        </div>
      </details>

      <Footnote>Check-ins are voluntary and support onboarding, not performance evaluation. Names are used only when an employee chooses to share by name; answer distributions require at least {MIN_GROUP} check-ins.</Footnote>
    </div>
  );
}
