// The Cooked data model. Everything the screens show comes from these types,
// held in the local store (store.tsx) until there is a backend.

export type Place = 'fridge' | 'pantry' | 'freezer';

export type Person = {
  id: string;
  /** First name, as it shows up on rows ("Added by Sam"). */
  name: string;
  lastName?: string;
  email?: string;
  /** "Joined Oct 3", "Made this kitchen". */
  note: string;
};

export type Kitchen = {
  name: string;
  people: Person[];
  /** The end of the invite link: cooked.app/join/<code>. One person, 7 days. */
  inviteCode: string;
  /** True once "Make a new link" has been used, so the screen can say so. */
  newLink: boolean;
  /** "2h ago", "just now"; empty before the first scan. Home says "Synced 2h ago from a receipt". */
  syncedAgo: string;
};

export type Item = {
  id: string;
  name: string;
  place: Place;
  qty: number;
  /** "carton", "eggs". Empty for things counted with × n. */
  unit: string;
  /** Shown instead of the count while the count hasn't changed ("About 1 cup"). */
  amountText?: string;
  /** The line under the name: "Best in 3 days", "Opened in May", "Sam used the last one · 9:40 am". */
  meta: string;
  /** Days until it's best used by. Sorts the "Use by" order and decides "use soon". */
  daysLeft: number;
  /** Pantry items flagged as running low instead of going off. */
  runningLow?: boolean;
  /** Overrides the days-left rule for things like leftovers. */
  useSoon?: boolean;
  addedBy: string;
};

export type ToBuyItem = {
  id: string;
  name: string;
  /** "For Shakshuka", "Added by Sam", "Running low". */
  note: string;
  place: Place;
  done: boolean;
  addedBy: string;
};

export type Ingredient = {
  name: string;
  place: Place;
  have: boolean;
  /** How much the recipe uses: "400 g", "2", "1 tbsp". Missing when the recipe doesn't say. */
  amount?: string;
};

export type Recipe = {
  id: string;
  title: string;
  /** "25 min". */
  time: string;
  /** "2 servings". Missing when only the list data exists. */
  servings?: string;
  /** "saved by Sam", the end of the meta line on the recipe. */
  savedBy?: string;
  /** Set on the recipe picked for tonight: the line on the Tonight note. Worked out in match.ts, never saved. */
  tonight?: string;
  /** The recipe's photo (an image URL), from the page it was imported from. None means no photo block. */
  photo?: string;
  /** "Imported from somekitchenblog.com" on the list. */
  sourceLine: string;
  /** "Open the original on somekitchenblog.com" on the recipe. */
  sourceLink: string;
  imported: boolean;
  /** The page it came from, when there is one. */
  url?: string;
  /** The total count on the list ("You have 6 of 8"). */
  need: number;
  have: number;
  /** What you still need ("Tomatoes", "Feta"). The list sentence lower-cases them. */
  missing: string[];
  /** How much of each missing thing the recipe uses, keyed by its name in `missing` ("Tomatoes" → "400 g"). */
  missingAmounts?: Record<string, string>;
  /** The ingredients you have, shown on the recipe. Empty when only the list data exists. */
  ingredients: Ingredient[];
  steps: string[];
  /** Missing things already put on To Buy. */
  onToBuy: boolean;
};

export type NotificationKey = 'toBuy' | 'useSoon' | 'joins' | 'weekly';

export type NotificationSettings = Record<NotificationKey, boolean> & {
  /** When the use-soon nudge goes out. */
  useSoonTime: string;
};

export type KitchenPath = 'household' | 'solo' | 'join';

export type Session = {
  /** Finished onboarding once. In memory only for now. */
  onboarded: boolean;
  /** "email", "phone", "apple" or "google": how they signed in. */
  signIn: 'email' | 'phone' | 'apple' | 'google' | null;
  /** The email or phone the code was sent to. */
  contact: string;
  path: KitchenPath | null;
  /** What the last scan put away, for the Ready screen ("milk, eggs, basil"). */
  lastScan: Record<Place, string[]>;
};

/** A scanned line on Check your scan. */
export type ScanLine = {
  id: string;
  name: string;
  /** "$3.49", "Not food · $5.99". */
  price: string;
  place: Place | 'skip';
  qty: number;
};

/** Where Scan, Check your scan and Couldn't read this receipt were opened from. */
export type ScanFlow = 'app' | 'onb' | 'onbsolo';
