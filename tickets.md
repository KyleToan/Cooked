# Tickets

What's left to turn the faked parts of Cooked (see "What's built and what's faked" in `context.md`) into real features, in the order they depend on each other. 🔑 marks a decision or account only the owner can make; agents don't pick backends or add services that send user data out.

Suggested order: Phase 0 → 1 → 2 → 3 → 4 and 5 side by side → 6 → 7.

## Phase 0: Decisions (owner)

- [ ] **T0.1 🔑 Backend.** Pick one for accounts, database, real-time sync and file storage (Supabase or Firebase are the usual Expo choices). Create the project with your own account; keys go in EAS environment variables. Log it in `Decisions.md`.
- [ ] **T0.2 🔑 Receipt reading.** On-device (Apple Vision, needs a development build) or an AI/OCR service (sends photos out). How items get sorted into fridge, pantry or freezer.
- [ ] **T0.3 🔑 Open product rules.** Who can remove whom from a kitchen. How "use soon" dates are worked out (shelf-life defaults, by hand, or both). Whether recipe links are fetched on a server or on the device.

## Phase 1: Foundations

- [ ] **T1.1 Development build.** Owner runs `eas login`, `init`, `update:configure`; build with `npx eas-cli@latest build --profile development`. Needed for real Apple/Google sign-in, push and on-device OCR. *Done when the app runs on a phone from a dev build.*
- [ ] **T1.2 Backend client.** Install the SDK with `npx expo install`, pinned. Config only from env vars; list the names in `AGENTS.md`.
- [ ] **T1.3 Schema.** Tables matching `src/data/types.ts`: people, kitchens, kitchen_members, items, to_buy, recipes, invites, notification_settings. Access rules so you only see kitchens you belong to. *Done when two test accounts can't see each other's kitchens.*
- [ ] **T1.4 Store on the backend.** Keep the `actions` in `src/data/store.tsx` with the same names and inputs; each writes to the backend. Load on sign-in, subscribe to live changes, keep undo, cache on the device for offline. *Done when a change on one phone shows on another within seconds.*

## Phase 2: Accounts

- [ ] **T2.1 Email and phone codes.** Real one-time codes; resend with a cooldown; remove `481726`.
- [ ] **T2.2 Sign in with Apple.** Turn on `usesAppleSignIn`; pass Apple's token to the backend.
- [ ] **T2.3 Sign in with Google.** Google OAuth (client IDs in env vars).
- [ ] **T2.4 Stay signed in.** Session in `expo-secure-store`; "onboarded" saved on the account.
- [ ] **T2.5 Log out and delete account.** Delete removes sign-in and name, keeps the kitchen for the others (server function).

## Phase 3: Kitchens and sharing

- [ ] **T3.1 Create a kitchen.** Just me and Me and my household make a real kitchen.
- [ ] **T3.2 Invite links.** `cooked.app/join/<code>`, one person, 7 days; Make a new link cancels the old; system share sheet.
- [ ] **T3.3 Join.** Server checks the code; universal links open the app; existing error for unknown or expired codes.
- [ ] **T3.4 Household.** Rename, remove (rule from T0.3) with undo, leave; "Added by Sam" and activity lines from real data.

## Phase 4: Scanning

- [ ] **T4.1 Receipts.** Photo → text (T0.2) → lines with `parseReceipt` in `src/data/receipt.ts` → Check your scan. Unreadable → Couldn't read this receipt. *The parser is done; still needs OCR (T0.2) and wiring into Scan.*
- [ ] **T4.2 Fridge, Pantry, Freezer and Recipe modes.** Recognize items on a shelf; read a recipe page photo.
- [ ] **T4.3 Use-soon dates.** `daysLeft` from the T0.3 rule instead of `DEFAULT_DAYS`.

## Phase 5: Recipes

- [x] **T5.1 Import from a link.** Read schema.org Recipe data from the page; "No recipe on that page" otherwise. *Fetched on the device for now (Decisions #59).*
- [x] **T5.2 Import from pasted text.** Title, ingredients and steps.
- [x] **T5.3 Match ingredients.** Missing and have from real items with fuzzy names (`src/data/match.ts`).
- [x] **T5.4 Tonight's pick.** The recipe that uses the most use-soon items.

## Phase 6: Notifications

- [ ] **T6.1 🔑 Push.** `expo-notifications`, permission, save device tokens.
- [ ] **T6.2 The four notifications.** To Buy changes, daily use soon at the chosen time, someone joins, weekly summary. Switches saved on the server; sent by scheduled server jobs.

## Phase 7: Launch

- [ ] **T7.1 Help, Privacy and Terms** pages at `cooked.app`. Privacy lists every service that gets user data.
- [ ] **T7.2 App icon and splash** to replace the Expo placeholders.
- [x] **T7.3 Tests** for the store, receipt parser, recipe import and ingredient matching (`npm test`). Keep adding as features land.
- [ ] **T7.4 Ship.** Update to `preview`, test with friends, then `production` and the App Store.
