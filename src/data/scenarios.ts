// Employee canvas sample answers. Replace `pickScenario` with a real retrieval call later.
import type { Scenario } from '../types';

export const SCENARIOS: Scenario[] = [
  {
    key: 'vpn', match: /vpn|remote|network|wi-?fi|sso|connect|laptop|access/i,
    heading: 'Getting connected on day one', queue: 'IT Enablement', expert: { name: 'Ana Okafor', initials: 'AO', eta: '12 min' },
    cards: [
      { id: 'v1', type: 'video', props: { title: 'Day-1 setup: VPN, SSO and your laptop', source: 'IT Enablement · Onboarding library', duration: 184, chapters: [{ t: 0, label: 'Unbox and sign in' }, { t: 42, label: 'Install GlobalConnect VPN' }, { t: 96, label: 'Approve your first SSO prompt' }, { t: 150, label: 'Check you’re green' }] } },
      { id: 'd1', type: 'doc', props: { title: 'Remote Access Policy: what applies to you', source: 'Summarised from the policy for new joiners', file: 'Remote-Access-Policy-v4.2.pdf', pages: 14, updated: 'Updated 2 Sep 2026 · Security', points: [{ text: 'VPN is required for finance, HR and source-code systems, not for email or chat.', page: 3 }, { text: 'Personal devices get the web apps only. No VPN client on them.', page: 5 }, { text: 'Public Wi-Fi is fine once the VPN shows Connected.', page: 6 }, { text: 'Lost or stolen laptop: report it within 1 hour in #it-help.', page: 9 }, { text: 'Sessions expire after 12 hours; you re-approve on your phone.', page: 11 }] } },
      { id: 's1', type: 'steps', props: { title: 'Get connected in four steps', source: 'The path most new joiners take', steps: [{ label: 'Install GlobalConnect from Self Service', detail: 'Applications → Self Service → search “VPN”' }, { label: 'Sign in with your work email', detail: 'Use the temporary password from your welcome email' }, { label: 'Approve the push on your phone', detail: 'Authenticator must be set up first' }, { label: 'Open the Wiki to confirm', detail: 'If it loads, you’re in' }] } },
    ],
  },
  {
    key: 'expense', match: /expens|dinner|claim|receipt|reimburs|travel|lunch/i,
    heading: 'Expensing a client dinner', queue: 'Finance Ops', expert: { name: 'Daniel Lim', initials: 'DL', eta: '25 min' },
    cards: [
      { id: 'd2', type: 'doc', props: { title: 'Client entertainment: the short version', source: 'Summarised from Travel & Expenses Policy', file: 'Travel-and-Expenses-Policy-2026.pdf', pages: 22, updated: 'Updated 14 Jul 2026 · Finance', points: [{ text: 'Up to RM 250 per head; alcohol capped at a third of the bill.', page: 7 }, { text: 'Submit within 30 days with an itemised receipt.', page: 8 }, { text: 'Name every attendee and their company.', page: 8 }, { text: 'Over RM 1,000 in total needs your manager’s approval first.', page: 9 }] } },
      { id: 's2', type: 'steps', props: { title: 'File it in Concur', source: 'Takes about three minutes', steps: [{ label: 'Snap the itemised receipt', detail: 'The card-machine slip alone is not enough' }, { label: 'Choose “Client entertainment”', detail: 'Not “Team meals”' }, { label: 'Add attendees and the client’s company' }, { label: 'Submit to your manager' }] } },
      { id: 'v2', type: 'video', props: { title: 'Snap, tag, submit: expenses in 90 seconds', source: 'Finance Ops · How-to', duration: 92, chapters: [{ t: 0, label: 'Capture the receipt' }, { t: 31, label: 'Pick the right category' }, { t: 64, label: 'Submit and track' }] } },
    ],
  },
  {
    key: 'mfa', match: /mfa|password|authenticat|2fa|locked|phone|reset/i,
    heading: 'Moving MFA to a new phone', queue: 'Identity & Access', expert: { name: 'Priya Raman', initials: 'PR', eta: '8 min' },
    cards: [
      { id: 's3', type: 'steps', props: { title: 'Move your authenticator', source: 'Keep the old phone until step 4', steps: [{ label: 'Open mysignins on your laptop', detail: 'Security info → Add method' }, { label: 'Scan the QR code with the new phone' }, { label: 'Approve the test prompt' }, { label: 'Remove the old phone from the list' }] } },
      { id: 'v3', type: 'video', props: { title: 'Re-enrol your authenticator', source: 'Identity & Access · How-to', duration: 128, chapters: [{ t: 0, label: 'Before you start' }, { t: 38, label: 'Add the new device' }, { t: 90, label: 'Retire the old one' }] } },
      { id: 'd3', type: 'doc', props: { title: 'Identity Standard: the MFA section', source: 'Summarised for employees', file: 'Identity-and-Access-Standard.pdf', pages: 9, updated: 'Updated 30 Jun 2026 · Security', points: [{ text: 'Every account needs two methods; SMS is the backup only.', page: 2 }, { text: 'Lost phone with no backup: IT verifies you on a video call.', page: 4 }, { text: 'Never approve a prompt you did not start. Report it.', page: 5 }] } },
    ],
  },
  {
    key: 'onboarding', match: /./,
    heading: 'Your first week', queue: 'People Team', expert: { name: 'Sofia Hart', initials: 'SH', eta: '20 min' },
    cards: [
      { id: 'v4', type: 'video', props: { title: 'Welcome aboard: how your first week works', source: 'People Team · Onboarding', duration: 236, chapters: [{ t: 0, label: 'Monday: kit and accounts' }, { t: 70, label: 'Meet your buddy' }, { t: 140, label: 'Mandatory training' }, { t: 200, label: 'Friday check-in' }] } },
      { id: 's4', type: 'steps', props: { title: 'Week-1 essentials', source: 'Tick them off as you go', done: [0, 1], steps: [{ label: 'Collect laptop and badge' }, { label: 'Sign the IT acceptable-use policy' }, { label: 'Submit your bank details for payroll', detail: 'Payroll closes on the 20th' }, { label: 'Book Security Basics (30 min)' }, { label: 'Coffee with your buddy' }] } },
      { id: 'd4', type: 'doc', props: { title: 'New Joiner Handbook: highlights', source: 'Summarised for your role', file: 'New-Joiner-Handbook-2026.pdf', pages: 38, updated: 'Updated 1 Oct 2026 · People Team', points: [{ text: 'Core hours are 10:00–16:00; the rest is yours to arrange.', page: 6 }, { text: 'Probation is 3 months, with a check-in at week 6.', page: 11 }, { text: 'Annual leave: 18 days, plus your birthday off.', page: 15 }, { text: 'Hybrid: two office days a week, team’s choice.', page: 17 }] } },
    ],
  },
];

export function pickScenario(q: string): Scenario {
  return SCENARIOS.find((s) => s.match.test(q)) ?? SCENARIOS[SCENARIOS.length - 1];
}

/** Employee-canvas scenario key → manager theme key. */
export const SCEN_THEME = { vpn: 'vpn', expense: 'exp', mfa: 'mfa', onboarding: 'onb' } as const;

export const DEFAULT_SUGGEST = [
  { label: 'Access issue', icon: 'route', query: 'I can’t get access to the VPN, it says my certificate expired' },
  { label: 'Find a guide', icon: 'doc', query: 'Where can I find the guide to move MFA to my new phone?' },
  { label: 'Missing resources', icon: 'steps', query: 'I’m missing the schedule and resources for my first week' },
];
