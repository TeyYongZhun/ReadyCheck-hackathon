// Onboarding milestone check-in sample data: one cohort, illustrative only.
// Mira (the demo employee) has not checked in yet, so her check-in is the one the demo sends.
import type { CheckIn, MilestoneKey, NewHire, PulseAnswer, PulseKey, SupportAction } from '../types';

export const CHECKIN_MILESTONES: { key: MilestoneKey; label: string; title: string; order: number }[] = [
  { key: 'week1', label: 'Week 1', title: 'Getting Started', order: 1 },
  { key: 'week2', label: 'Week 2', title: 'Early Adjustment', order: 2 },
  { key: 'day30', label: 'Day 30', title: 'Building Competence', order: 3 },
  { key: 'day60', label: 'Day 60', title: 'Growing Independence', order: 4 },
  { key: 'day90', label: 'Day 90', title: 'Successful Integration', order: 5 },
];
export const milestoneOrder = (milestone: MilestoneKey) => CHECKIN_MILESTONES.find((m) => m.key === milestone)!.order;

export const CORE_PULSE: { key: Exclude<PulseKey, 'stage'>; dimension: string; text: string; short: string; followUp: string }[] = [
  { key: 'clarity', dimension: 'Role clarity', text: 'I understand what is expected of me at this stage.', short: 'Role clarity', followUp: 'What would help make expectations clearer?' },
  { key: 'support', dimension: 'Support', text: 'I know who to ask when I need help.', short: 'Support', followUp: 'What makes it difficult to get help?' },
  { key: 'workload', dimension: 'Workload', text: 'My current workload feels manageable.', short: 'Workload', followUp: 'What would make your workload more manageable?' },
];

export const STAGE_PULSE: Record<MilestoneKey, { dimension: string; text: string; short: string; followUp: string }> = {
  week1: { dimension: 'Getting started', text: 'I have the tools and access I need to get started.', short: 'Tools & access', followUp: 'Which tool or access would help you get started?' },
  week2: { dimension: 'Early adjustment', text: 'I have received enough guidance to complete my initial tasks.', short: 'Initial guidance', followUp: 'What guidance would help you complete your initial tasks?' },
  day30: { dimension: 'Building competence', text: 'I can complete my core tasks with increasing confidence.', short: 'Core tasks', followUp: 'Which core task would you like more support with?' },
  day60: { dimension: 'Growing independence', text: 'I can manage most of my responsibilities with less day-to-day guidance.', short: 'Independence', followUp: 'Which responsibility would benefit from more guidance?' },
  day90: { dimension: 'Successful integration', text: 'I understand how my performance is evaluated and what I should focus on improving.', short: 'Feedback & growth', followUp: 'What would help clarify how your work is evaluated or what to improve?' },
};

export function questionsForMilestone(milestone: MilestoneKey) {
  const stage = STAGE_PULSE[milestone];
  return [
    ...CORE_PULSE,
    { key: 'stage' as const, dimension: stage.dimension, text: stage.text, short: stage.short, followUp: stage.followUp },
  ];
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

export const COHORT: NewHire[] = [
  { id: 'mt', name: 'Mira Tan', first: 'Mira', initials: 'MT', role: 'Product Designer', team: 'Product Design', milestone: 'week1' },
  { id: 'fn', name: 'Farah Nordin', first: 'Farah', initials: 'FN', role: 'Data Analyst', team: 'Data Platform', milestone: 'week2' },
  { id: 'kc', name: 'Kumar Chandran', first: 'Kumar', initials: 'KC', role: 'Test Engineer', team: 'Product Engineering', milestone: 'week2' },
  { id: 'jw', name: 'Jun Wei Lim', first: 'Jun Wei', initials: 'JW', role: 'Software Engineer', team: 'Platform', milestone: 'week2' },
  { id: 'sa', name: 'Siti Aisyah', first: 'Siti', initials: 'SA', role: 'HR Executive', team: 'People Team', milestone: 'week1' },
  { id: 'ah', name: 'Aiman Hakim', first: 'Aiman', initials: 'AH', role: 'Process Engineer', team: 'Manufacturing',
    signals: ['Asked 3 questions this week; 1 had no approved answer'], milestone: 'week1' },
  { id: 'yl', name: 'Yee Ling Ong', first: 'Yee Ling', initials: 'YO', role: 'Finance Associate', team: 'Finance Ops', milestone: 'week1' },
  { id: 'pn', name: 'Priyanka Nair', first: 'Priyanka', initials: 'PN', role: 'QA Engineer', team: 'Product Engineering',
    signals: ['Waiting 2 days for lab access (RC-1052)'], milestone: 'week1' },
  { id: 'dw', name: 'Daniel Wong', first: 'Daniel', initials: 'DW', role: 'Sales Executive', team: 'Commercial', milestone: 'week1' },
];

const a = (clarity: PulseAnswer, stage: PulseAnswer, support: PulseAnswer, workload: PulseAnswer) => ({ clarity, support, workload, stage });

export const SEED_CHECKINS: CheckIn[] = [
  // Earlier milestone check-ins. Farah and Kumar were reached out to afterwards.
  { id: 'ci-fn-1', person: 'fn', milestone: 'week1', at: 'Fri 30 Oct', named: true, answers: a('notyet', 'partly', 'yes', 'notyet'),
    note: 'Tak pasti apa KPI saya untuk bulan pertama.' },
  { id: 'ci-kc-1', person: 'kc', milestone: 'week1', at: 'Fri 30 Oct', named: true, answers: a('partly', 'notyet', 'partly', 'partly'),
    note: 'Waited two days for my VPN certificate, so I couldn’t run any tests.' },
  { id: 'ci-jw-1', person: 'jw', milestone: 'week1', at: 'Fri 30 Oct', named: false, answers: a('partly', 'yes', 'notyet', 'partly'),
    note: 'On-call shadowing plus three trainings in week one is a lot.' },
  { id: 'ci-fn-2', person: 'fn', milestone: 'week2', at: 'Fri 6 Nov', named: true, answers: a('yes', 'partly', 'yes', 'partly'),
    note: 'Goals are clear now after the chat with my lead.' },
  { id: 'ci-kc-2', person: 'kc', milestone: 'week2', at: 'Fri 6 Nov', named: true, answers: a('yes', 'partly', 'yes', 'partly'),
    note: 'Sorted once Ana re-issued the certificate.' },
  { id: 'ci-jw-2', person: 'jw', milestone: 'week2', at: 'Fri 6 Nov', named: false, answers: a('yes', 'partly', 'partly', 'partly'),
    note: 'Still a lot of training stacked into the same week.' },
  { id: 'ci-sa-1', person: 'sa', milestone: 'week1', at: 'Fri 6 Nov', named: true, answers: a('yes', 'yes', 'yes', 'yes'),
    note: 'My buddy has been great.' },
  { id: 'ci-ah-1', person: 'ah', milestone: 'week1', at: 'Thu 5 Nov', named: true, answers: a('notyet', 'partly', 'yes', 'notyet'),
    note: 'Saya belum jumpa manager saya lagi minggu ni.' },
  { id: 'ci-yl-1', person: 'yl', milestone: 'week1', at: 'Thu 5 Nov', named: false, answers: a('notyet', 'yes', 'partly', 'notyet'),
    note: '不太清楚第一个月的目标是什么，也还没有收到任何反馈。' },
  { id: 'ci-pn-1', person: 'pn', milestone: 'week1', at: 'Fri 6 Nov', named: true, answers: a('yes', 'partly', 'yes', 'yes'),
    note: 'Still waiting on my lab access badge.' },
];

/** Completed Week 1 actions with Week 2 check-ins, so the Check-ins tab can show a milestone comparison. */
export const SEED_ACTIONS: SupportAction[] = [
  { id: 'act-fn', person: 'fn', label: '15-min priorities chat', owner: 'Rachel Goh', when: 'Mon 2 Nov', status: 'done', milestone: 'week1' },
  { id: 'act-kc', person: 'kc', label: 'Ask Ana to follow up on the VPN certificate', owner: 'Ana Okafor', when: 'Mon 2 Nov', status: 'done', milestone: 'week1' },
  { id: 'act-jw', theme: 'Workload concerns', label: 'Spread week-1 trainings over two weeks', owner: 'Sofia Hart', when: 'Next cohort', status: 'planned', milestone: 'week1' },
];

/** Plain, supportive next steps, used when the AI suggestion is unavailable. Never a score or a label. */
export const PULSE_ACTION: Record<PulseKey, string> = {
  clarity: '15-min priorities chat',
  support: 'Pair them with someone they can ask',
  workload: 'Review their workload together',
  stage: 'Ask what would make this stage easier',
};

/** Rule-based cohort themes, used before (or without) the AI summary. */
export const PULSE_THEME: Record<Exclude<PulseKey, 'stage'>, { name: string; action: string }> = {
  clarity: { name: 'Unclear priorities', action: 'Ask managers to share written first-month goals' },
  support: { name: 'Support needed', action: 'Make sure new hires know who to ask for help' },
  workload: { name: 'Workload concerns', action: 'Review workload and priorities with new hires' },
};
