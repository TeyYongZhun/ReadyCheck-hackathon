// Scripted sample conversations for the ticket room "Play sample conversation" demo (from the design export).
// {first} = employee's first name, {pic} = expert's first name, {team} = expert's team.
import type { ThemeKey } from '../types';

export type DialogueLine = ['pic' | 'employee', string];

const DIALOGUES: Partial<Record<ThemeKey, DialogueLine[]>> & { any: DialogueLine[] } = {
  vpn: [
    ['pic', 'Hi {first}, {pic} from IT Enablement. I’ve read your question and the card you were shown. What does GlobalConnect say right now?'],
    ['employee', 'It says “certificate expired” on step 2, right after I sign in.'],
    ['pic', 'Thanks, that helps. It’s an expired VPN profile on new laptops this week, nothing you did. I’ve just pushed a fresh profile to your laptop.'],
    ['employee', 'Okay. Do I need to restart?'],
    ['pic', 'No restart needed. Quit GlobalConnect fully from the menu bar, then open it again. It picks up the new profile on launch.'],
    ['employee', 'It says Connected now, and the Wiki loads.'],
    ['pic', 'You’re all set. If it ever drops again, the same fix works: quit, reopen, and check for Connected.'],
    ['employee', 'Great, thank you {pic}!'],
  ],
  exp: [
    ['pic', 'Hi {first}, {pic} from Finance Ops. I saw your question about the client dinner. What was the total, and did you get approval before it?'],
    ['employee', 'It came to RM 1,180 for four people. I didn’t know I needed approval first.'],
    ['pic', 'No problem, that’s common in your first weeks. Anything over RM 1,000 needs your manager’s OK, and you can ask for it after the dinner as long as it’s within 30 days.'],
    ['employee', 'Okay. How do I do that in Concur?'],
    ['pic', 'Open the expense, choose Client entertainment, add the attendees, then tick “Retroactive approval” at the bottom. It goes to your manager automatically.'],
    ['employee', 'Done. It now says “Pending: Rachel Goh”.'],
    ['pic', 'Perfect, that’s everything. Keep the itemised receipt attached and you’ll be paid in the next pay run.'],
    ['employee', 'Thanks {pic}, that was quick!'],
  ],
  mfa: [
    ['pic', 'Hi {first}, {pic} from Identity & Access. Do you still have your old phone with you?'],
    ['employee', 'Yes, but the authenticator won’t let me add the new phone.'],
    ['pic', 'That’s because your account needs a second sign-in method first. I’ve sent a temporary access code to your work email.'],
    ['employee', 'Got it, it’s a 6-digit code.'],
    ['pic', 'Go to mysignins, choose Add method, enter the code when asked, then scan the QR code with your new phone.'],
    ['employee', 'Done. The new phone gets the prompts now.'],
    ['pic', 'Great. Last step: remove the old phone from the list so nobody else can approve sign-ins with it.'],
    ['employee', 'Removed. Thanks {pic}!'],
  ],
  onb: [
    ['pic', 'Hi {first}, {pic} from the People Team. Which part of your first week is unclear?'],
    ['employee', 'I can’t find who my onboarding buddy is.'],
    ['pic', 'Your buddy is Jun Wei from Data. The pairing email went to your personal inbox by mistake, so I’ve resent it to your work email.'],
    ['employee', 'Found it, thanks. Should I set up time with him?'],
    ['pic', 'Yes, a 30-minute coffee this week. I’ve put Thursday 11:00 in both your calendars.'],
    ['employee', 'Accepted. Thank you {pic}!'],
  ],
  db: [
    ['pic', 'Hi {first}, {pic} from Data Platform. Your access broke in Tuesday’s credential rotation. What error do you see?'],
    ['employee', '“Password authentication failed” on staging-db-02.'],
    ['pic', 'That matches. I’ve re-issued your credentials. The new staging entry is in your password manager.'],
    ['employee', 'Connected now, thank you.'],
    ['pic', 'Great. If it ever fails again after a credential rotation, message the Data Platform channel and I’ll re-issue it.'],
    ['employee', 'Perfect, thanks {pic}!'],
  ],
  any: [
    ['pic', 'Hi {first}, {pic} from {team}. I’ve read your question and the card you saw. Can you tell me a bit more about what happened?'],
    ['employee', 'I followed the card, but it didn’t match what I see on my screen.'],
    ['pic', 'Thanks, that helps. The card is out of date for your setup. Let me check on my side.'],
    ['employee', 'Okay, thanks.'],
    ['pic', 'Sorted on my end. Try again now and it should go through.'],
    ['employee', 'It worked. Thanks {pic}!'],
  ],
};

export function dialogueFor(theme: ThemeKey): DialogueLine[] {
  return DIALOGUES[theme] ?? DIALOGUES.any;
}

export function fillLine(text: string, names: { first: string; pic: string; team: string }): string {
  return text.split('{first}').join(names.first).split('{pic}').join(names.pic).split('{team}').join(names.team);
}
