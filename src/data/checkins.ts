// Onboarding milestone check-in sample data: one cohort, illustrative only.
// Mira (the demo employee) has not checked in yet, so her check-in is the one the demo sends.
// All dates are relative to "today", so the sample never goes stale and a milestone is always
// derived from the hire's join date instead of being typed by hand.
import type { CheckIn, MilestoneKey, NewHire, PulseAnswer, PulseKey, SupportAction } from '../types';

/** `day` is the last day (counted from the join date) on which the milestone check-in is still open. */
export const CHECKIN_MILESTONES: { key: MilestoneKey; label: string; title: string; focus: string; order: number; day: number }[] = [
  { key: 'week1', label: 'Week 1', title: 'Getting Started', focus: 'Initial Orientation · Role Clarity · Social Acceptance', order: 1, day: 7 },
  { key: 'week2', label: 'Week 2', title: 'Early Adjustment', focus: 'Early Adaptation · Task Confidence · Social Integration', order: 2, day: 14 },
  { key: 'day30', label: 'Day 30', title: 'Building Competence', focus: 'Task Mastery · Organizational Understanding', order: 3, day: 30 },
  { key: 'day60', label: 'Day 60', title: 'Growing Independence', focus: 'Autonomy · Role Development · Team Contribution', order: 4, day: 60 },
  { key: 'day90', label: 'Day 90', title: 'Successful Integration', focus: 'Organizational Integration · Belonging · Future Growth', order: 5, day: 90 },
];

const DAY = 86_400_000;
export const daysSince = (iso: string, now = Date.now()) => Math.floor((now - Date.parse(iso)) / DAY);
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
const checkinDateDaysAgo = (n: number) => new Date(`${daysAgo(n)}T12:00:00`).toLocaleDateString('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** Window of a milestone in days since joining: Week 1 = day 0-7, Week 2 = day 8-14, Day 30 = day 15-30, ... */
export const windowOf = (milestone: (typeof CHECKIN_MILESTONES)[number]) => {
  const index = CHECKIN_MILESTONES.indexOf(milestone);
  return { open: index ? CHECKIN_MILESTONES[index - 1].day + 1 : 0, close: milestone.day };
};

export const currentMilestone = (joinedAt: string, now = Date.now()): MilestoneKey => {
  const age = daysSince(joinedAt, now);
  return (CHECKIN_MILESTONES.find((milestone) => age <= milestone.day) ?? CHECKIN_MILESTONES[CHECKIN_MILESTONES.length - 1]).key;
};

export const milestoneOrder = (milestone: MilestoneKey) => CHECKIN_MILESTONES.find((m) => m.key === milestone)!.order;

type PulseQuestion = { key: PulseKey; dimension: string; text: string; short: string; followUp: string };
const PULSE_QUESTIONS: Record<MilestoneKey, PulseQuestion[]> = {
  week1: [
    { key: 'clarity', dimension: 'Role Clarity', text: 'I understand what is expected of me in my role.', short: 'Role Clarity', followUp: 'Which part of your role or responsibilities is still unclear?' },
    { key: 'tools', dimension: 'Tools & Resources', text: 'I have access to the tools and resources I need to get started.', short: 'Tools & Resources', followUp: "Is there anything you haven't been able to access or find yet?" },
    { key: 'support', dimension: 'Knowing Where to Get Help', text: 'I know who to approach when I need help.', short: 'Getting Help', followUp: 'Have you experienced any difficulty getting help so far?' },
    { key: 'workload', dimension: 'Social Acceptance', text: 'I feel welcomed and included by my team.', short: 'Social Acceptance', followUp: 'How has your experience been interacting with your team so far?' },
  ],
  week2: [
    { key: 'clarity', dimension: 'Responsibilities & Priorities', text: 'I have a clear understanding of my responsibilities and priorities.', short: 'Responsibilities & Priorities', followUp: 'Are there any responsibilities or priorities you’re still unsure about?' },
    { key: 'tools', dimension: 'Task Confidence', text: 'I feel increasingly confident handling my assigned tasks.', short: 'Task Confidence', followUp: 'Which tasks do you currently find most challenging?' },
    { key: 'support', dimension: 'Social Integration', text: 'I feel comfortable communicating with my teammates.', short: 'Social Integration', followUp: 'Is there anything that makes team communication difficult?' },
    { key: 'workload', dimension: 'Workload', text: 'My workload feels manageable at this stage.', short: 'Workload', followUp: 'Are there any tasks or responsibilities that feel overwhelming?' },
  ],
  day30: [
    { key: 'clarity', dimension: 'Team Goals', text: "I understand how my work contributes to my team's goals.", short: 'Team Goals', followUp: 'Is it clear how your current tasks connect to the team’s priorities?' },
    { key: 'tools', dimension: 'Task Mastery', text: 'I can complete most of my regular tasks with confidence.', short: 'Task Mastery', followUp: 'Which tasks do you still need more practice or guidance with?' },
    { key: 'support', dimension: 'Processes & Workflows', text: 'I understand the key processes and workflows relevant to my role.', short: 'Processes & Workflows', followUp: 'Are there any processes you still find confusing?' },
    { key: 'workload', dimension: 'Useful Feedback', text: 'I receive useful feedback that helps me improve.', short: 'Useful Feedback', followUp: 'What has your feedback experience been like so far?' },
  ],
  day60: [
    { key: 'clarity', dimension: 'Prioritisation', text: 'I can prioritise my responsibilities independently.', short: 'Prioritisation', followUp: 'What makes it difficult to decide which tasks to prioritise?' },
    { key: 'tools', dimension: 'Handling Challenges', text: 'I can handle most work challenges without constant guidance.', short: 'Handling Challenges', followUp: 'What types of challenges do you still need help with?' },
    { key: 'support', dimension: 'Team Contribution', text: 'I feel comfortable sharing ideas and contributing to team discussions.', short: 'Team Contribution', followUp: 'Do you feel your ideas and opinions are being heard?' },
    { key: 'workload', dimension: 'Autonomy', text: 'I have enough autonomy to carry out my responsibilities.', short: 'Autonomy', followUp: 'Are there any decisions you still need more freedom to make?' },
  ],
  day90: [
    { key: 'clarity', dimension: 'Role Confidence', text: 'I feel confident managing my regular responsibilities.', short: 'Role Confidence', followUp: 'Which aspects of your role do you feel least confident about?' },
    { key: 'tools', dimension: 'Belonging', text: 'I feel like a valued and integrated member of my team.', short: 'Belonging', followUp: 'What has helped you feel part of the team, or made it difficult?' },
    { key: 'support', dimension: 'Organizational Goals', text: "I understand how my work contributes to the organisation's goals.", short: 'Organizational Goals', followUp: 'Is there anything about the organisation’s direction or goals you’d like to understand better?' },
    { key: 'workload', dimension: 'Future Growth', text: 'I feel positive about my future growth within the organisation.', short: 'Future Growth', followUp: 'What opportunities or areas of development are you interested in?' },
  ],
};

export const CORE_PULSE = PULSE_QUESTIONS.week1;

export function questionsForMilestone(milestone: MilestoneKey) {
  return PULSE_QUESTIONS[milestone];
}

export const PULSE_ANSWERS: { key: PulseAnswer; label: string }[] = [
  { key: 'yes', label: 'Yes' },
  { key: 'partly', label: 'Partly' },
  { key: 'notyet', label: 'Not yet' },
  { key: 'na', label: 'Not applicable' },
];

/** Cohort totals are shown only from this many check-ins, so no single answer can be singled out. */
export const MIN_GROUP = 3;

/** An employee may edit a submitted check-in for five minutes after its first submission. */
export const CHECKIN_EDIT_WINDOW_MS = 5 * 60 * 1000;

// Join dates are deliberately away from window boundaries (day 7 / day 14), so nobody
// silently jumps to the next milestone tomorrow.
// mt: 2 days, sa: 4 days, ah/yl/pn/dw: 5 days (all in Week 1); fn/kc/jw: 12 days (Week 2).
const RAW_COHORT: Omit<NewHire, 'milestone'>[] = [
  { id: 'mt', name: 'Mira Tan', first: 'Mira', initials: 'MT', role: 'Product Designer', team: 'Product Design', joinedAt: daysAgo(2) },
  { id: 'sa', name: 'Siti Aisyah', first: 'Siti', initials: 'SA', role: 'HR Executive', team: 'People Team', joinedAt: daysAgo(4) },
  { id: 'ah', name: 'Aiman Hakim', first: 'Aiman', initials: 'AH', role: 'Process Engineer', team: 'Manufacturing',
    joinedAt: daysAgo(5), signals: ['Asked 3 questions this week; 1 had no approved answer'] },
  { id: 'yl', name: 'Yee Ling Ong', first: 'Yee Ling', initials: 'YO', role: 'Finance Associate', team: 'Finance Ops', joinedAt: daysAgo(5) },
  { id: 'pn', name: 'Priyanka Nair', first: 'Priyanka', initials: 'PN', role: 'QA Engineer', team: 'Product Engineering',
    joinedAt: daysAgo(5), signals: ['Waiting 2 days for lab access (RC-1052)'] },
  { id: 'dw', name: 'Daniel Wong', first: 'Daniel', initials: 'DW', role: 'Sales Executive', team: 'Commercial', joinedAt: daysAgo(5) },
  { id: 'fn', name: 'Farah Nordin', first: 'Farah', initials: 'FN', role: 'Data Analyst', team: 'Data Platform', joinedAt: daysAgo(12) },
  { id: 'kc', name: 'Kumar Chandran', first: 'Kumar', initials: 'KC', role: 'Test Engineer', team: 'Product Engineering', joinedAt: daysAgo(12) },
  { id: 'jw', name: 'Jun Wei Lim', first: 'Jun Wei', initials: 'JW', role: 'Software Engineer', team: 'Platform', joinedAt: daysAgo(12) },
];
export const COHORT: NewHire[] = RAW_COHORT.map((hire) => ({ ...hire, milestone: currentMilestone(hire.joinedAt) }));

/** Built from the join dates, e.g. "October–November cohort". */
const monthName = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { month: 'long' });
const joinedSorted = RAW_COHORT.map((hire) => hire.joinedAt).sort();
const firstMonth = monthName(joinedSorted[0]);
const lastMonth = monthName(joinedSorted[joinedSorted.length - 1]);
export const COHORT_LABEL = firstMonth === lastMonth ? `${firstMonth} cohort` : `${firstMonth}–${lastMonth} cohort`;

const a = (clarity: PulseAnswer, tools: PulseAnswer, support: PulseAnswer, workload: PulseAnswer) => ({ clarity, tools, support, workload });

// Every check-in is dated after the person joined and inside its milestone window:
// Week 1 for Farah/Kumar/Jun Wei is on their day 6 (6 days ago); Week 2 is on their day 11 (1 day ago).
export const SEED_CHECKINS: CheckIn[] = [
  // Earlier milestone check-ins. Farah and Kumar were reached out to afterwards.
  { id: 'ci-fn-1', person: 'fn', milestone: 'week1', at: checkinDateDaysAgo(6), named: true, answers: a('notyet', 'partly', 'yes', 'notyet'),
    note: 'Tak pasti apa KPI saya untuk bulan pertama.' },
  { id: 'ci-kc-1', person: 'kc', milestone: 'week1', at: checkinDateDaysAgo(6), named: true, answers: a('partly', 'notyet', 'partly', 'partly'),
    note: 'Waited two days for my VPN certificate, so I couldn’t run any tests.' },
  { id: 'ci-jw-1', person: 'jw', milestone: 'week1', at: checkinDateDaysAgo(6), named: false, answers: a('partly', 'partly', 'notyet', 'partly'),
    note: 'On-call shadowing plus three trainings in week one is a lot.' },
  { id: 'ci-fn-2', person: 'fn', milestone: 'week2', at: checkinDateDaysAgo(1), named: true, answers: a('yes', 'partly', 'yes', 'partly'),
    note: 'Goals are clear now after the chat with my lead.',
    actionFollowUps: [{ actionId: 'act-fn', answer: 'better', comment: 'I know what to focus on this month now.' }, { actionId: 'act-cohort-tools', answer: 'better' }] },
  // Kumar went anonymous at Week 2, so his reply about his own action stays out of the manager's individual view.
  { id: 'ci-kc-2', person: 'kc', milestone: 'week2', at: checkinDateDaysAgo(1), named: false, answers: a('yes', 'partly', 'yes', 'partly'),
    note: 'Sorted once Ana re-issued the certificate.',
    actionFollowUps: [{ actionId: 'act-kc', answer: 'better' }, { actionId: 'act-cohort-tools', answer: 'better', comment: 'The guide made it easier to find what I needed.' }] },
  { id: 'ci-jw-2', person: 'jw', milestone: 'week2', at: checkinDateDaysAgo(1), named: false, answers: a('yes', 'partly', 'partly', 'partly'),
    note: 'Still a lot of training stacked into the same week.',
    actionFollowUps: [{ actionId: 'act-cohort-tools', answer: 'notyet', comment: 'Still not sure which access to request first.' }] },
  { id: 'ci-ah-1', person: 'ah', milestone: 'week1', at: checkinDateDaysAgo(1), named: true, answers: a('notyet', 'partly', 'yes', 'notyet'),
    note: 'Saya belum jumpa manager saya lagi minggu ni.' },
  { id: 'ci-yl-1', person: 'yl', milestone: 'week1', at: checkinDateDaysAgo(1), named: false, answers: a('notyet', 'yes', 'partly', 'notyet'),
    note: '不太清楚第一个月的目标是什么，也还没有收到任何反馈。' },
  { id: 'ci-dw-1', person: 'dw', milestone: 'week1', at: checkinDateDaysAgo(1), named: false, answers: a('yes', 'partly', 'yes', 'yes') },
  { id: 'ci-sa-1', person: 'sa', milestone: 'week1', at: checkinDateDaysAgo(1), named: true, answers: a('yes', 'yes', 'yes', 'partly') },
  { id: 'ci-pn-1', person: 'pn', milestone: 'week1', at: checkinDateDaysAgo(1), named: true, answers: a('yes', 'yes', 'yes', 'yes'),
    note: 'Still waiting on my lab access badge.' },
];

/** Completed Week 1 actions with Week 2 check-ins, so the Check-ins tab can show a milestone comparison.
 *  The actions happened between the Week 1 check-in (6 days ago) and the Week 2 check-in (1 day ago). */
export const SEED_ACTIONS: SupportAction[] = [
  { id: 'act-fn', person: 'fn', label: '15-min priorities chat', owner: 'Rachel Goh', when: checkinDateDaysAgo(5), status: 'done', milestone: 'week1' },
  { id: 'act-kc', person: 'kc', label: 'Ask Ana to follow up on the VPN certificate', owner: 'Ana Okafor', when: checkinDateDaysAgo(5), status: 'done', milestone: 'week1' },
  { id: 'act-cohort-tools', theme: 'tools', pulse: 'tools', label: 'Updated the access guide and shared it with the cohort', owner: 'Rachel Goh', when: checkinDateDaysAgo(1), status: 'done',
    publicNote: 'Updated the access guide and shared it with the cohort.', publishedAt: checkinDateDaysAgo(1), resourceId: 'kb-seed-access', milestone: 'week1' },
  { id: 'act-jw', theme: 'Workload concerns', label: 'Spread week-1 trainings over two weeks', owner: 'Sofia Hart', when: 'Next cohort', status: 'planned', milestone: 'week1' },
];
