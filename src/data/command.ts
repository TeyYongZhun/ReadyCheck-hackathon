// Manager (Theme Command Center) sample data. All numbers are illustrative.
import type { KbItem, Pic, QueueTicket, Room, Theme, ThemeKey } from '../types';

export const SLA_MINUTES = 15;

export const THEMES: Theme[] = [
  { key: 'db', name: 'Databases', short: 'Databases', count: 5, cards: 2, trend: 4, days: [0, 0, 2, 1, 2, 0, 0], people: ['JW', 'LK', 'RA', 'TS', 'MN'],
    summary: 'Most are permission errors on staging-db-02 since Tuesday’s credential rotation. Two people are blocked.',
    asked: ['Staging Postgres rejects my password since this morning', 'Who approves read access to the analytics warehouse?', 'Is staging-db-02 down for everyone?'] },
  { key: 'vpn', name: 'VPN & remote access', short: 'VPN', count: 9, cards: 8, trend: -3, days: [3, 2, 1, 0, 2, 1, 0], people: ['MT', 'FN', 'KC', 'AB', 'YS', 'DP', 'EL', 'GO', 'HR'],
    summary: '“Certificate expired” on GlobalConnect step 2. The setup video solved the rest.',
    asked: ['GlobalConnect says certificate expired on step 2', 'Do I need VPN for Slack?', 'VPN drops every 12 hours'] },
  { key: 'onb', name: 'First-week schedule', short: 'First week', count: 8, cards: 8, trend: 2, days: [3, 2, 1, 0, 1, 1, 0], people: ['MT', 'IC', 'RW', 'SP', 'NB', 'QA', 'UV', 'ZK'],
    summary: 'Friday check-in and buddy pairing. Cards handled every one.',
    asked: ['When is the Friday check-in?', 'Who is my onboarding buddy?'] },
  { key: 'exp', name: 'Expenses', short: 'Expenses', count: 7, cards: 5, trend: 1, days: [0, 1, 1, 2, 1, 2, 0], people: ['GH', 'SK', 'BW', 'LM', 'PT', 'CF', 'JR'],
    summary: 'Client-dinner limits and late pre-approval. One claim is over RM 1,000.',
    asked: ['Client dinner was RM 1,180, do I need pre-approval after the fact?', 'Is a Grab receipt enough?'] },
  { key: 'pay', name: 'Payroll & bank details', short: 'Payroll', count: 6, cards: 4, trend: 3, days: [1, 0, 1, 2, 1, 1, 0], people: ['AR', 'HY', 'RT', 'WL', 'OM', 'XE'],
    summary: 'Digital banks (GXBank, Boost) are rejected by the payroll form.',
    asked: ['Payroll form rejects my GXBank account', 'When is the payroll cut-off?'] },
  { key: 'mfa', name: 'MFA & new phones', short: 'MFA', count: 4, cards: 4, trend: 0, days: [0, 1, 0, 1, 1, 1, 0], people: ['OD', 'TT', 'VB', 'KL'],
    summary: 'Moving the authenticator to a new phone. All solved by the steps card.',
    asked: ['How do I move MFA to my new phone?'] },
  { key: 'leave', name: 'Leave & holidays', short: 'Leave', count: 4, cards: 4, trend: -1, days: [0, 0, 1, 0, 1, 2, 0], people: ['NN', 'SJ', 'AP', 'MC'],
    summary: 'Carry-over rules and the birthday day off.',
    asked: ['Can I carry leave into next year?'] },
  { key: 'hw', name: 'Laptop & hardware', short: 'Hardware', count: 3, cards: 1, trend: 2, days: [0, 0, 1, 0, 1, 1, 0], people: ['TS', 'BG', 'EF'],
    summary: 'USB-C docks on Level 3 are not charging laptops.',
    asked: ['Laptop won’t charge on the Level 3 dock'] },
  { key: 'ben', name: 'Benefits & insurance', short: 'Benefits', count: 2, cards: 2, trend: 0, days: [0, 0, 0, 1, 0, 1, 0], people: ['DQ', 'RS'],
    summary: 'Adding a spouse to medical cover.',
    asked: ['How do I add my spouse to the medical plan?'] },
];

export const THEMES_BY_KEY = Object.fromEntries(THEMES.map((t) => [t.key, t])) as Record<ThemeKey, Theme>;

export const PICS: Pic[] = [
  { id: 'mc', name: 'Marcus Chen', first: 'Marcus', initials: 'MC', team: 'Data Platform', skills: 'Databases', covers: ['db'] },
  { id: 'ao', name: 'Ana Okafor', first: 'Ana', initials: 'AO', team: 'IT Enablement', skills: 'VPN, hardware', covers: ['vpn', 'hw'] },
  { id: 'dl', name: 'Daniel Lim', first: 'Daniel', initials: 'DL', team: 'Finance Ops', skills: 'Expenses, payroll', covers: ['exp', 'pay'] },
  { id: 'pr', name: 'Priya Raman', first: 'Priya', initials: 'PR', team: 'Identity & Access', skills: 'MFA, accounts', covers: ['mfa'] },
  { id: 'sh', name: 'Sofia Hart', first: 'Sofia', initials: 'SH', team: 'People Team', skills: 'Onboarding, leave', covers: ['onb', 'leave', 'ben'] },
];

/** Default suggested expert per theme (used when no team covers it). */
export const SUGGEST: Record<ThemeKey, string> = { db: 'mc', vpn: 'ao', hw: 'ao', exp: 'dl', pay: 'dl', mfa: 'pr', onb: 'sh', leave: 'sh', ben: 'sh' };

export const QUEUE: QueueTicket[] = [
  { id: 'RC-1047', person: 'Jun Wei', first: 'Jun', initials: 'JW', role: 'Data Analyst · Day 2', theme: 'db', wait: 26, from: 'Video card', slug: 'staging-db-password', q: 'Staging Postgres rejects my password since this morning. The setup video doesn’t cover database access.' },
  { id: 'RC-1049', person: 'Lina Kaur', first: 'Lina', initials: 'LK', role: 'BI Engineer · Week 2', theme: 'db', wait: 18, from: 'PDF summary card', slug: 'warehouse-read-access', q: 'Who approves read access to the analytics warehouse? The policy says “data owner” but doesn’t name one.' },
  { id: 'RC-1051', person: 'Tomas Silva', first: 'Tomas', initials: 'TS', role: 'Designer · Day 4', theme: 'hw', wait: 12, from: 'Steps card', slug: 'dock-not-charging', q: 'My laptop won’t charge on the USB-C dock on Level 3. Tried two docks.' },
  { id: 'RC-1052', person: 'Mira Tan', first: 'Mira', initials: 'MT', role: 'Product Designer · Day 3', theme: 'vpn', wait: 6, from: 'Steps card', slug: 'vpn-cert-expired', q: 'GlobalConnect says “certificate expired” on step 2 of the setup.' },
  { id: 'RC-1053', person: 'Ahmad Rizal', first: 'Ahmad', initials: 'AR', role: 'Account Exec · Day 1', theme: 'pay', wait: 4, from: 'PDF summary card', slug: 'payroll-gxbank', q: 'The payroll form rejects my GXBank account. Is it supported?' },
  { id: 'RC-1054', person: 'Grace Ho', first: 'Grace', initials: 'GH', role: 'Consultant · Week 3', theme: 'exp', wait: 2, from: 'PDF summary card', slug: 'late-preapproval', q: 'Client dinner came to RM 1,180. Can I get pre-approval after the fact?' },
];

export const ROOMS: Room[] = [
  { id: 'r1', ticket: 'RC-1044', name: '#expenses-client-dinner', theme: 'exp', pic: 'dl', people: ['SK', 'BW'], status: 'live', elapsed: 14, last: 'Daniel: Retroactive approval is fine under RM 1,500. Sending the form now.' },
  { id: 'r2', ticket: 'RC-1045', name: '#mfa-lost-phone', theme: 'mfa', pic: 'pr', people: ['OD'], status: 'live', elapsed: 6, last: 'Priya: Video call link sent. I’ll verify you in two minutes.' },
  { id: 'r3', ticket: 'RC-1046', name: '#vpn-split-tunnel', theme: 'vpn', pic: 'ao', people: ['FN'], status: 'waiting', elapsed: 22, last: 'Ana: Can you reconnect and tell me what the status bar says?' },
  { id: 'r4', ticket: 'RC-1039', name: '#payroll-bank-codes', theme: 'pay', pic: 'dl', people: ['HY', 'RT'], status: 'resolved', elapsed: 41, last: 'Resolved: Boost added to the supported banks list.' },
  { id: 'r5', ticket: 'RC-1036', name: '#buddy-pairing', theme: 'onb', pic: 'sh', people: ['IC'], status: 'resolved', elapsed: 18, last: 'Resolved: Buddy assigned and invite sent for Friday.' },
  { id: 'r6', ticket: 'RC-1034', name: '#vpn-cert-reset', theme: 'vpn', pic: 'ao', people: ['KC', 'AB'], status: 'resolved', elapsed: 27, last: 'Resolved: Certificates re-issued for both laptops.' },
  { id: 'r7', ticket: 'RC-1031', name: '#warehouse-read-role', theme: 'db', pic: 'mc', people: ['RA'], status: 'resolved', elapsed: 35, last: 'Resolved: Read role granted by the data owner.' },
];

export const SEED_KB: KbItem[] = [
  { id: 'kb-seed-pay', roomId: 'r4', roomName: '#payroll-bank-codes', theme: 'pay', title: 'Add a digital bank account for payroll', problem: 'The payroll form rejected digital banks (GXBank, Boost) because their codes were missing from the supported list.',
    steps: ['Open Payroll details in the HR portal', 'Choose your bank from the updated list (GXBank and Boost now included)', 'Enter your account number and save', 'Check for the confirmation email before the 20th'],
    pic: { id: 'dl', name: 'Daniel Lim', first: 'Daniel', initials: 'DL', team: 'Finance Ops' }, employee: 'Hui Yi', status: 'review', at: '15:44' },
  { id: 'kb-seed-leave', roomId: 'r-old', roomName: '#leave-carry-over', theme: 'leave', title: 'Carry annual leave into next year', problem: 'New joiners asked whether unused leave from a partial first year can be carried over.',
    steps: ['Up to 5 unused days carry over automatically', 'Anything above 5 days needs your manager’s approval in the HR portal', 'Carried days expire on 31 March 2027'],
    pic: { id: 'sh', name: 'Sofia Hart', first: 'Sofia', initials: 'SH', team: 'People Team' }, employee: 'Nadia', status: 'live', at: 'Thu' },
];

/** Home tab, sample data. */
export const HOME = {
  range: '12–18 Oct 2026',
  days: ['12 Oct', '13 Oct', '14 Oct', '15 Oct', '16 Oct', '17 Oct', '18 Oct'], daily: [42, 45, 37, 34, 29, 25, 21],
  weeks: ['6 Sep', '13 Sep', '20 Sep', '27 Sep', '4 Oct', '11 Oct', '18 Oct'], weekly: [24, 31, 36, 33, 38, 40, 21],
  cats: [['Access & permissions', 8], ['Process guidance', 6], ['Tools & resources', 4], ['Conflicting instructions', 3]] as [string, number][],
  byPic: [['ao', 8], ['mc', 6], ['dl', 4], ['pr', 3]] as [string, number][],
};

/** Trends tab, sample data: questions per theme for each time frame. */
export type TrendFrame = 'daily' | 'weekly' | 'monthly' | 'all';
export const TREND_FRAMES: { key: TrendFrame; label: string; caption: string; data: Record<ThemeKey, number> }[] = [
  { key: 'daily', label: 'Daily', caption: 'Today, 18 Oct 2026', data: { db: 2, vpn: 1, onb: 1, exp: 2, pay: 1, mfa: 0, leave: 1, hw: 1, ben: 0 } },
  // Same totals as THEMES[].count, which are this week's numbers.
  { key: 'weekly', label: 'Weekly', caption: 'This week, 12–18 Oct 2026', data: { db: 5, vpn: 9, onb: 8, exp: 7, pay: 6, mfa: 4, leave: 4, hw: 3, ben: 2 } },
  { key: 'monthly', label: 'Monthly', caption: 'October 2026, so far', data: { db: 14, vpn: 31, onb: 22, exp: 19, pay: 15, mfa: 11, leave: 10, hw: 8, ben: 5 } },
  { key: 'all', label: 'All', caption: 'All time, since 1 Sep 2026', data: { db: 23, vpn: 64, onb: 58, exp: 37, pay: 29, mfa: 26, leave: 21, hw: 15, ben: 12 } },
];
