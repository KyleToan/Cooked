# Context

Everything an agent or new contributor needs to know about Cooked. Rules for agents are in `AGENTS.md`; the decision history is in `Decisions.md`; the design spec is in `design/`.

## What Cooked is

Cooked is a shared kitchen app for a household. You:

- **Scan** a grocery receipt and Cooked puts each item where it lives, or a cookbook page to import the recipe. (Scanning a shelf and sharing from Safari are planned for after launch, Decisions #123.)
- **Track** what's in your Fridge, Pantry and Freezer, with quantities and what to use soon.
- **Import** recipes from a link or pasted text and see what you already have for them.
- **Share one To Buy list** with the people you live with.

It's also for people who cook alone (the "Just me" path in onboarding).

The feel: calm, white, uncluttered, with one warm, homemade touch (sticky notes on a fridge door). It should feel shared, not solo: "Added by Sam" and a household screen.

## Platform

- iPhone app first, designed at 390 × 844. Native iOS expectations apply: back gestures, Sign in with Apple, the system share sheet and keyboard.
- Tech stack: React Native with Expo (SDK 57), TypeScript and Expo Router, with over-the-air updates through EAS Update. See `AGENTS.md` for the folder layout and commands.
- State of the code: every screen, state and flow in `design/screens/README.md` is built, running on local sample data with no backend. See "What's built and what's faked" below.

## Screens

Every screen is designed. `design/screens/README.md` lists them all with their states and where each one goes; `design/screens/screenshots/` has a picture of each.

- **App:** Home (and an empty first-run Home), Scan, Check your scan, Couldn't read this receipt, Your Kitchen (Fridge, Pantry, Freezer and To Buy tabs), Recipes, Recipe, Import a recipe (and its error), Account (and the delete-account sheet), Rivera kitchen (household), Notifications.
- **Onboarding:** Welcome, Log in or sign up (Apple, Google, email or phone with a code, no password), Your name, Who you cook with (Just me / Me and my household / I have an invite), Join a kitchen, Scan your first receipt, camera and check items, Invite your household, Your kitchen is ready.

## Design

The full design system is in `design/system/` and at https://claude.ai/artifact/9uaDBLc2WkxCCJrooL3gki. In short:

- White background, ink text.
- **Sage** (`#CCD5AE`) is the action color: one sage button per screen, `sage-ink` links and icons. Grey pills for everything else.
- **Bronze** only marks food to use soon. **Red** (`error-ink`) only for errors and destructive text.
- **Alumni Sans** for titles (bold) and section headings (semibold), **Albert Sans** for everything else, **Caveat** handwriting only on sticky notes.
- Sticky notes in Cornsilk (Fridge), Papaya (Pantry) and Beige (Freezer).
- Floating tab island: Home, Kitchen (fridge icon), Recipes. Kitchen is the Your Kitchen tab. Home's top bar has Scan (round, top left), Cooked centred with the greeting under it, and Account (round, top right).
- 22 custom icons on a 24px grid.
- Every screen must pass **Avoid the AI look** (`design/system/avoid-the-ai-look.md`).

## How sharing works in the design

- A household is a "kitchen" (e.g. "Rivera kitchen"). Everyone in it shares the fridge, pantry, freezer, To Buy and recipes.
- You join with an invite link (`cooked.app/join/<kitchen>`) or the code at the end of it. A link works for one person and runs out after 7 days. "Make a new link" kills the old one.
- People can be removed from the kitchen (the design shows Alex, who made it, removing Sam). What they added stays. Removing asks first and can be undone. Only the person who made the kitchen can remove people; if they leave or delete their account, whoever joined earliest takes over (Decisions #84, #100).
- Leaving a kitchen leaves it with the others and starts you a new, empty one. Deleting your account removes your sign-in and name; the kitchen stays for everyone else.
- Activity is shown by name: "Added by Sam", "Sam used the last one · 9:40 am".

## Sample data used in designs

- People: Alex Rivera (the user, alex.rivera@gmail.com), Sam (housemate, joined Oct 3). Kitchen: Rivera kitchen.
- Fridge: Spinach, Chicken thighs (use soon), Basil, Cheddar, Eggs, Greek yogurt, Milk 2%.
- Pantry: Rice, Bread, Chickpeas, Flour, Olive oil, Spaghetti.
- Freezer: Chili leftovers, Frozen peas, Ice cream, Salmon fillets.
- To Buy: Tomatoes and Feta (for Shakshuka), Frozen berries (added by Sam), Rice, Bread, Olive oil.
- Recipes: Shakshuka (25 min, 2 servings, missing tomatoes and feta), Spinach & chicken pasta (tonight's pick, uses the use-soon items).
- Receipt: Corner Market, 7 items, one of them (paper towels) skipped as not food.

## Design files

| File | Link | What it is |
| --- | --- | --- |
| Cooked design system | https://claude.ai/artifact/9uaDBLc2WkxCCJrooL3gki | Source of truth for the look. Copy in `design/system/`. |
| Cooked canvas | https://claude.ai/artifact/4Y3vzFjNNfX7kS88MV3mGV | Every screen. Copy in `design/screens/`. |

## What's built and what's faked

Built (branch `build-screens`): onboarding (all three paths, Apple and Google, email or phone with a code), Home and the empty first-run Home, Your Kitchen with all four tabs, Recipes, Recipe, Import a recipe (loading, found and error states), Scan with the real camera, Check your scan, Couldn't read this receipt, Account with the delete sheet, Rivera kitchen, and Notifications. Every action changes the local store, and everything that removes something can be undone or asks first. The kitchen, To Buy, recipes, notification settings and finished onboarding are saved on the phone and survive a restart (`src/data/saved.ts`); when signed in to Supabase the server's copy replaces it on load (Decisions #99). Logging out clears the kitchen and the saved copy.

Backend (Supabase, Decisions #82–89): the schema and RPCs are in `supabase/migrations/` and applied to the Supabase project (access rules checked with two test users), and the app code is built: real sign-in (`src/data/supabase.ts`, `auth.ts`), loading, write-through and realtime sync (`remote.ts`, `store.tsx`), and kitchen actions (`kitchenApi.ts`). It turns on when `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set; without them the app runs in the local mode below. The app itself hasn't been run against it yet.

Local mode (no env vars):

- **Sign-in.** Any email or number works and the code is always `481726`. Apple's button is Apple's own on iOS, but no real Apple or Google sign-in happens.
- **Accounts and sync.** Everything lives on this phone only; nothing syncs. Sam never changes anything.
- **Kitchens.** Just me and Me and my household start a new, empty kitchen that the first scan fills. Joining only works with the code `rivera-kitchen`, which loads the sample Rivera kitchen.
- **Receipt reading (OCR)** is real in a development build: the photo is read on the phone with Google ML Kit (`src/data/ocr.ts`), and `parseReceipt` in `src/data/receipt.ts` turns the text into Check your scan lines. No food lines or a failed read shows "Couldn't read this receipt". Expo Go and the web have no ML Kit, so there Scan shows the 7 sample Corner Market items in development. Not yet checked against real receipt photos.
- **Recipe scanning.** Scan's Recipe mode reads a cookbook page the same way and opens Import with the text, which shows the recipe it found or "No recipe on that page". In Expo Go and on the web it uses a sample page in development. Not yet checked against real cookbook photos.
- **Recipe import** is real: a link is fetched on the device and its schema.org recipe data read; pasted text is split into ingredients and steps (`src/data/recipeImport.ts`). In a web browser most sites block the fetch, so links there show "No recipe on that page".
- **Notifications.** The use-soon nudge and the Sunday summary are scheduled on the phone from the current kitchen (Decisions #97). To Buy changes and joins need server push, which comes later (Decisions #87), so they're only saved. The switches and send time are saved on the phone.
- **Help, Privacy and Terms** open `cooked.app` pages that don't exist yet.

## Open questions

- Offline use: writes need a connection for now, and a failed write rolls back.
- How items get sorted into fridge, pantry or freezer beyond the keyword table in `receipt.ts`.
- Whether recipe links should move from on-device fetching to a server.
- Push notifications: the design has To Buy changes, a daily use-soon nudge, someone joining and a weekly summary.

## Notes from conversations

_Add anything decided or discussed in chats that isn't captured above._
