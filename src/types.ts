export const criteria = [
  { key: 'originality', label: 'Originality', icon: '✦', hint: 'A fresh, unexpected idea' },
  { key: 'creativity', label: 'Creativity', icon: '☾', hint: 'Imaginative choices and details' },
  { key: 'effort', label: 'Effort', icon: '✂', hint: 'Time and care put into it' },
  { key: 'craftsmanship', label: 'Craftsmanship', icon: '⚒', hint: 'How well it all came together' },
  { key: 'presence', label: 'Spooky Presence', icon: '♰', hint: 'Commitment to the character' },
] as const;

export type CriterionKey = (typeof criteria)[number]['key'];

export type Costume = {
  id: string;
  participantName: string;
  costumeName: string;
  description: string;
  photoUrl: string;
  createdAt: string;
};

export type Ratings = Record<CriterionKey, number>;

export type Result = Costume & {
  score: number;
  voteCount: number;
  breakdown: Ratings;
};
