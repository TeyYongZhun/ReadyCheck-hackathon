// Weekly check-in sample data: one onboarding cohort, illustrative only.
// Mira (the demo employee) has not checked in yet, so her check-in is the one the demo sends.
import type { CheckIn, NewHire, PulseAnswer, PulseKey, SupportAction } from '../types';

export const PULSE: { key: PulseKey; text: string; short: string }[] = [
  { key: 'clarity', text: 'I know what’s expected of me this week', short: 'Clear priorities' },
  { key: 'support', text: 'I can get help when I’m stuck', short: 'Help when stuck' },
  { key: 'workload', text: 'My workload feels manageable', short: 'Workload' },
  { key: 'feedback', text: 'I’ve had useful feedback from my manager', short: 'Manager feedback' },
];

export const PULSE_ANSWERS: { key: PulseAnswer; label: string }[] = [
  { key: 'yes', label: 'Yes' },
  { key: 'partly', label: 'Partly' },
  { key: 'notyet', label: 'Not yet' },
];

/** Cohort totals are shown only from this many check-ins, so no single answer can be singled out. */
export const MIN_GROUP = 3;

export const COHORT_LABEL = 'October–November cohort';

export const COHORT: NewHire[] = [
  { id: 'mt', name: 'Mira Tan', first: 'Mira', initials: 'MT', role: 'Product Designer', team: 'Product Design', week: 1 },
  { id: 'fn', name: 'Farah Nordin', first: 'Farah', initials: 'FN', role: 'Data Analyst', team: 'Data Platform', week: 2 },
  { id: 'kc', name: 'Kumar Chandran', first: 'Kumar', initials: 'KC', role: 'Test Engineer', team: 'Product Engineering', week: 2 },
  { id: 'jw', name: 'Jun Wei Lim', first: 'Jun Wei', initials: 'JW', role: 'Software Engineer', team: 'Platform', week: 2 },
  { id: 'sa', name: 'Siti Aisyah', first: 'Siti', initials: 'SA', role: 'HR Executive', team: 'People Team', week: 1 },
  { id: 'ah', name: 'Aiman Hakim', first: 'Aiman', initials: 'AH', role: 'Process Engineer', team: 'Manufacturing', week: 1,
    signals: ['Asked 3 questions this week; 1 had no approved answer'] },
  { id: 'yl', name: 'Yee Ling Ong', first: 'Yee Ling', initials: 'YO', role: 'Finance Associate', team: 'Finance Ops', week: 1 },
  { id: 'pn', name: 'Priyanka Nair', first: 'Priyanka', initials: 'PN', role: 'QA Engineer', team: 'Product Engineering', week: 1,
    signals: ['Waiting 2 days for lab access (RC-1052)'] },
  { id: 'dw', name: 'Daniel Wong', first: 'Daniel', initials: 'DW', role: 'Sales Executive', team: 'Commercial', week: 1 },
];

const a = (clarity: PulseAnswer, support: PulseAnswer, workload: PulseAnswer, feedback: PulseAnswer) => ({ clarity, support, workload, feedback });

export const SEED_CHECKINS: CheckIn[] = [
  // Week 1 for the people who started a week earlier. Farah and Kumar were reached out to afterwards.
  { id: 'ci-fn-1', person: 'fn', week: 1, at: 'Fri 30 Oct', named: true, answers: a('notyet', 'partly', 'yes', 'notyet'),
    note: 'Tak pasti apa KPI saya untuk bulan pertama.' },
  { id: 'ci-kc-1', person: 'kc', week: 1, at: 'Fri 30 Oct', named: true, answers: a('partly', 'notyet', 'partly', 'partly'),
    note: 'Waited two days for my VPN certificate, so I couldn’t run any tests.' },
  { id: 'ci-jw-1', person: 'jw', week: 1, at: 'Fri 30 Oct', named: false, answers: a('partly', 'yes', 'notyet', 'partly'),
    note: 'On-call shadowing plus three trainings in week one is a lot.' },
  // This week.
  { id: 'ci-fn-2', person: 'fn', week: 2, at: 'Fri 6 Nov', named: true, answers: a('yes', 'yes', 'yes', 'partly'),
    note: 'Goals are clear now after the chat with my lead.' },
  { id: 'ci-kc-2', person: 'kc', week: 2, at: 'Fri 6 Nov', named: true, answers: a('yes', 'yes', 'yes', 'partly'),
    note: 'Sorted once Ana re-issued the certificate.' },
  { id: 'ci-jw-2', person: 'jw', week: 2, at: 'Fri 6 Nov', named: false, answers: a('yes', 'yes', 'partly', 'partly'),
    note: 'Still a lot of training stacked into the same week.' },
  { id: 'ci-sa-1', person: 'sa', week: 1, at: 'Fri 6 Nov', named: true, answers: a('yes', 'yes', 'yes', 'yes'),
    note: 'My buddy has been great.' },
  { id: 'ci-ah-1', person: 'ah', week: 1, at: 'Thu 5 Nov', named: true, answers: a('notyet', 'partly', 'yes', 'notyet'),
    note: 'Saya belum jumpa manager saya lagi minggu ni.' },
  { id: 'ci-yl-1', person: 'yl', week: 1, at: 'Thu 5 Nov', named: false, answers: a('notyet', 'yes', 'partly', 'notyet'),
    note: '不太清楚第一个月的目标是什么，也还没有收到任何反馈。' },
  { id: 'ci-pn-1', person: 'pn', week: 1, at: 'Fri 6 Nov', named: true, answers: a('yes', 'partly', 'yes', 'yes'),
    note: 'Still waiting on my lab access badge.' },
];

/** Last week's follow-ups. Both people answered better the next week, which the Check-ins tab shows. */
export const SEED_ACTIONS: SupportAction[] = [
  { id: 'act-fn', person: 'fn', label: '15-min priorities chat', owner: 'Rachel Goh', when: 'Mon 2 Nov', status: 'done', week: 1 },
  { id: 'act-kc', person: 'kc', label: 'Ask Ana to follow up on the VPN certificate', owner: 'Ana Okafor', when: 'Mon 2 Nov', status: 'done', week: 1 },
  { id: 'act-jw', theme: 'Heavy first-week schedule', label: 'Spread week-1 trainings over two weeks', owner: 'Sofia Hart', when: 'Next cohort', status: 'planned', week: 1 },
];

/** Plain, supportive next steps, used when the AI suggestion is unavailable. Never a score or a label. */
export const PULSE_ACTION: Record<PulseKey, string> = {
  clarity: '15-min priorities chat',
  feedback: 'Book a first 1:1 with their manager',
  support: 'Pair them with their buddy for a day',
  workload: 'Review their week-1 schedule together',
};

/** Rule-based cohort themes, used before (or without) the AI summary. */
export const PULSE_THEME: Record<PulseKey, { name: string; action: string }> = {
  clarity: { name: 'Unclear priorities', action: 'Ask managers to share written first-month goals' },
  support: { name: 'Hard to get help', action: 'Check every new hire has a buddy and knows where to ask' },
  workload: { name: 'Heavy workload', action: 'Spread week-1 trainings over two weeks' },
  feedback: { name: 'Little manager feedback', action: 'Remind managers to book a 15-min weekly 1:1' },
};
