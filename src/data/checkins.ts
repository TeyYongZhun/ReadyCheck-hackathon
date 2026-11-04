// Onboarding milestone check-in sample data: one cohort, illustrative only.
// Mira (the demo employee) has not checked in yet, so her check-in is the one the demo sends.
import type { CheckIn, MilestoneKey, NewHire, PulseAnswer, PulseKey, SupportAction } from '../types';

export const CHECKIN_MILESTONES: { key: MilestoneKey; label: string; title: string; order: number; day: number }[] = [
  { key: 'week1', label: 'Week 1', title: 'Getting Started', order: 1, day: 7 },
  { key: 'week2', label: 'Week 2', title: 'Early Adjustment', order: 2, day: 14 },
  { key: 'day30', label: 'Day 30', title: 'Building Competence', order: 3, day: 30 },
  { key: 'day60', label: 'Day 60', title: 'Growing Independence', order: 4, day: 60 },
  { key: 'day90', label: 'Day 90', title: 'Successful Integration', order: 5, day: 90 },
];
const DAY = 86_400_000;
export const daysSince = (iso: string, now = Date.now()) => Math.floor((now - Date.parse(iso)) / DAY);
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
const checkinDateDaysAgo = (n: number) => new Date(`${daysAgo(n)}T12:00:00`).toLocaleDateString('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

export const windowOf = (milestone: (typeof CHECKIN_MILESTONES)[number]) => {
  const index = CHECKIN_MILESTONES.indexOf(milestone);
  return { open: index ? CHECKIN_MILESTONES[index - 1].day + 1 : 0, close: milestone.day };
};

export const currentMilestone = (joinedAt: string, now = Date.now()): MilestoneKey => {
  const age = daysSince(joinedAt, now);
  return (CHECKIN_MILESTONES.find((milestone) => age <= milestone.day) ?? CHECKIN_MILESTONES[CHECKIN_MILESTONES.length - 1]).key;
};

export const milestoneOrder = (milestone: MilestoneKey) => CHECKIN_MILESTONES.find((m) => m.key === milestone)!.order;

export const CORE_PULSE: { key: PulseKey; dimension: string; text: string; short: string; followUp: string }[] = [
  { key: 'clarity', dimension: 'Role clarity', text: 'I understand what is expected of me at this stage.', short: 'Role clarity', followUp: 'What would help make expectations clearer?' },
  { key: 'tools', dimension: 'Tools and resources', text: 'I have the tools and resources I need to do my work.', short: 'Tools and resources', followUp: 'What tool or resource would help you do your work?' },
  { key: 'support', dimension: 'Support', text: "I know where to get help when I'm stuck.", short: 'Support', followUp: 'What makes it difficult to get help?' },
  { key: 'workload', dimension: 'Workload', text: 'My workload feels manageable.', short: 'Workload', followUp: 'What would make your workload more manageable?' },
];

export function questionsForMilestone(_milestone: MilestoneKey) {
  return CORE_PULSE;
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

export const COHORT_LABEL = 'October–November cohort';

const RAW_COHORT: Omit<NewHire, 'milestone'>[] = [
  { id: 'mt', name: 'Mira Tan', first: 'Mira', initials: 'MT', role: 'Product Designer', team: 'Product Design', joinedAt: daysAgo(3) },
  { id: 'sa', name: 'Siti Aisyah', first: 'Siti', initials: 'SA', role: 'HR Executive', team: 'People Team', joinedAt: daysAgo(6) },
  { id: 'ah', name: 'Aiman Hakim', first: 'Aiman', initials: 'AH', role: 'Process Engineer', team: 'Manufacturing',
    joinedAt: daysAgo(7), signals: ['Asked 3 questions this week; 1 had no approved answer'] },
  { id: 'yl', name: 'Yee Ling Ong', first: 'Yee Ling', initials: 'YO', role: 'Finance Associate', team: 'Finance Ops', joinedAt: daysAgo(7) },
  { id: 'pn', name: 'Priyanka Nair', first: 'Priyanka', initials: 'PN', role: 'QA Engineer', team: 'Product Engineering',
    joinedAt: daysAgo(7), signals: ['Waiting 2 days for lab access (RC-1052)'] },
  { id: 'dw', name: 'Daniel Wong', first: 'Daniel', initials: 'DW', role: 'Sales Executive', team: 'Commercial', joinedAt: daysAgo(7) },
  { id: 'fn', name: 'Farah Nordin', first: 'Farah', initials: 'FN', role: 'Data Analyst', team: 'Data Platform', joinedAt: daysAgo(14) },
  { id: 'kc', name: 'Kumar Chandran', first: 'Kumar', initials: 'KC', role: 'Test Engineer', team: 'Product Engineering', joinedAt: daysAgo(14) },
  { id: 'jw', name: 'Jun Wei Lim', first: 'Jun Wei', initials: 'JW', role: 'Software Engineer', team: 'Platform', joinedAt: daysAgo(14) },
];
export const COHORT: NewHire[] = RAW_COHORT.map((hire) => ({ ...hire, milestone: currentMilestone(hire.joinedAt) }));

const a = (clarity: PulseAnswer, tools: PulseAnswer, support: PulseAnswer, workload: PulseAnswer) => ({ clarity, tools, support, workload });

export const SEED_CHECKINS: CheckIn[] = [
  // Earlier milestone check-ins. Farah and Kumar were reached out to afterwards.
  { id: 'ci-fn-1', person: 'fn', milestone: 'week1', at: checkinDateDaysAgo(13), named: true, answers: a('notyet', 'partly', 'yes', 'notyet'),
    note: 'Tak pasti apa KPI saya untuk bulan pertama.' },
  { id: 'ci-kc-1', person: 'kc', milestone: 'week1', at: checkinDateDaysAgo(13), named: true, answers: a('partly', 'notyet', 'partly', 'partly'),
    note: 'Waited two days for my VPN certificate, so I couldn’t run any tests.' },
  { id: 'ci-jw-1', person: 'jw', milestone: 'week1', at: checkinDateDaysAgo(13), named: false, answers: a('partly', 'yes', 'notyet', 'partly'),
    note: 'On-call shadowing plus three trainings in week one is a lot.' },
  { id: 'ci-fn-2', person: 'fn', milestone: 'week2', at: checkinDateDaysAgo(1), named: true, answers: a('yes', 'partly', 'yes', 'partly'),
    note: 'Goals are clear now after the chat with my lead.' },
  { id: 'ci-kc-2', person: 'kc', milestone: 'week2', at: checkinDateDaysAgo(1), named: true, answers: a('yes', 'partly', 'yes', 'partly'),
    note: 'Sorted once Ana re-issued the certificate.' },
  { id: 'ci-jw-2', person: 'jw', milestone: 'week2', at: checkinDateDaysAgo(1), named: false, answers: a('yes', 'partly', 'partly', 'partly'),
    note: 'Still a lot of training stacked into the same week.' },
  { id: 'ci-ah-1', person: 'ah', milestone: 'week1', at: checkinDateDaysAgo(1), named: true, answers: a('notyet', 'partly', 'yes', 'notyet'),
    note: 'Saya belum jumpa manager saya lagi minggu ni.' },
  { id: 'ci-yl-1', person: 'yl', milestone: 'week1', at: checkinDateDaysAgo(1), named: false, answers: a('notyet', 'yes', 'partly', 'notyet'),
    note: '不太清楚第一个月的目标是什么，也还没有收到任何反馈。' },
  { id: 'ci-dw-1', person: 'dw', milestone: 'week1', at: checkinDateDaysAgo(1), named: false, answers: a('yes', 'partly', 'yes', 'yes') },
  { id: 'ci-sa-1', person: 'sa', milestone: 'week1', at: checkinDateDaysAgo(1), named: true, answers: a('yes', 'yes', 'yes', 'partly') },
  { id: 'ci-pn-1', person: 'pn', milestone: 'week1', at: checkinDateDaysAgo(1), named: true, answers: a('yes', 'yes', 'yes', 'yes'),
    note: 'Still waiting on my lab access badge.' },
];

/** Completed Week 1 actions with Week 2 check-ins, so the Check-ins tab can show a milestone comparison. */
export const SEED_ACTIONS: SupportAction[] = [
  { id: 'act-fn', person: 'fn', label: '15-min priorities chat', owner: 'Rachel Goh', when: 'Mon 2 Nov', status: 'done', milestone: 'week1' },
  { id: 'act-kc', person: 'kc', label: 'Ask Ana to follow up on the VPN certificate', owner: 'Ana Okafor', when: 'Mon 2 Nov', status: 'done', milestone: 'week1' },
  { id: 'act-jw', theme: 'Workload concerns', label: 'Spread week-1 trainings over two weeks', owner: 'Sofia Hart', when: 'Next cohort', status: 'planned', milestone: 'week1' },
];
