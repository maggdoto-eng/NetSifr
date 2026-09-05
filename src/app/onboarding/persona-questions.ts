/**
 * Display text only — the mapping from an option's position to a persona
 * lives entirely server-side (see src/modules/identity/onboarding.ts).
 * Each question's options are authored in the same order across all
 * questions (policy / ground / narrative), matching that mapping.
 */
export const PERSONA_QUESTIONS: Array<{
  prompt: string;
  options: Array<{ title: string; desc: string }>;
}> = [
  {
    prompt: 'What pulls you into this work?',
    options: [
      { title: 'Policy & systems', desc: 'Rules, budgets, who decides' },
      { title: 'Ground action', desc: 'Organising, mutual aid, field work' },
      { title: 'Storytelling', desc: 'Media, research, making it land' },
    ],
  },
  {
    prompt: 'Where do you want to be a year from now?',
    options: [
      { title: 'In the room where plans are costed', desc: 'Committees, consultations, budgets' },
      { title: 'With the people the plan is for', desc: 'Wards, villages, response teams' },
      { title: 'Where the story reaches people', desc: 'Newsrooms, film, research briefs' },
    ],
  },
  {
    prompt: 'When something stalls, what do you reach for?',
    options: [
      { title: 'The written rule', desc: 'Find the clause, use it' },
      { title: 'The phone tree', desc: 'Get thirty people in a room' },
      { title: 'The evidence', desc: 'Show what it costs' },
    ],
  },
];
