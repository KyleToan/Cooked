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

---

## Step by step: everything except the backend

Every screen is built (see `context.md`). These tickets finish the features that still don't work, **leaving out Supabase and anything else that needs a server**: accounts, real sign-in, sync between phones, invites, joining a kitchen, remote recipe fetching and push notifications sent by a server. Those stay in Phases 1–3 and 6 above. This section replaces T0.2 (on-device OCR was chosen), T4.1, T4.3, the use-soon and weekly parts of T6.2, T7.1 and T7.2 with concrete steps.

Work through them in order; each ticket says what it needs first. Every ticket ends with `npm run typecheck && npm run lint && npm test`, a `Decisions.md` row for any choice made, and an update to "What's built and what's faked" in `context.md`.

**Owner** means only the owner can do it (accounts, artwork, legal text). Agents don't.

### Order at a glance

| # | Ticket | Who | Needs |
| --- | --- | --- | --- |
| 1 | Link EAS and make a development build | Owner | — |
| 2 | Land on-device receipt reading (OCR) | Agent | 1 to test on a phone |
| 3 | Keep the kitchen on the phone between launches | Agent | — |
| 4 | Real use-soon dates (shelf life per item) | Agent | 3 |
| 5 | Use-soon and weekly notifications, scheduled on the phone | Agent | 3, 4 |
| 6 | Scan a recipe from a photo | Agent | 2 |
| 7 | Add the Photos and Flash icons to the set | Agent | — |
| 8 | Bundle the fonts in the build | Agent | 1 |
| 9 | Android pass | Agent | 1 |
| 10 | App icon and splash | Owner, then agent | — |
| 11 | Help, Privacy and Terms pages | Owner | — |
| 12 | First TestFlight build | Owner | 1–11 |

Not ticketed, waiting on a decision: see "Needs a decision" at the end.

---

### 1. Link EAS and make a development build (Owner)

OCR, bundled fonts and real testing all need a development build; Expo Go can't run them.

1. `npx eas-cli@latest login`, then `init` and `update:configure` with your Expo account.
2. `npx eas-cli@latest build --profile development --platform ios` (add a `development` profile to `eas.json` with `developmentClient: true` if it's missing; an agent can do that part).
3. Install the build on your phone and run `npm start`.

**Done when:** the app opens on your phone from a development build.

### 2. Land on-device receipt reading (OCR)

The work is already written but uncommitted in the main checkout, mixed in with the Supabase changes: `src/data/ocr.ts`, the `scan.tsx` and `scan-review.tsx` changes, the `receipt.ts` and test changes, and `@infinitered/react-native-mlkit-text-recognition` 5.0.1 in `package.json`.

1. Move only the OCR files and hunks onto a branch, without `supabase.ts`, `auth.ts`, `remote.ts`, the onboarding sign-in changes or the Supabase packages.
2. Check the ML Kit package against the SDK 57 docs and pin it.
3. Keep the fallbacks as they are: where the native module is missing (Expo Go, web) use `SAMPLE_SCAN` in `__DEV__` and show "Couldn't read this receipt" in production.
4. Add a `joinRows` test (names and prices in separate columns come back as one line per row).
5. On a phone: photograph three real receipts, save the recognized text and add each as a `receipt.test.ts` case. Fix the parser where they fail.
6. Log the OCR choice and "Expo Go no longer reads receipts" in `Decisions.md`; add the note to `AGENTS.md`.

**Done when:** a real receipt photo on a development build gives the right lines on Check your scan, a blank photo gives "Couldn't read this receipt", and Expo Go still opens with the sample scan.

### 3. Keep the kitchen on the phone between launches

Today everything resets when the app restarts, including having finished onboarding.

1. Save `kitchen`, `items`, `toBuy`, `recipes`, `notifications`, `user` and `session` to device storage after each change; leave out the undo. Use `expo-sqlite/localStorage` (Expo's own, works in Expo Go).
2. Store each item's date as a best-by date, not `daysLeft`, so "2 days left" counts down. `bestByFromDays` and `daysFromBestBy` already exist in the uncommitted `remote.ts`; move them to `helpers.ts` with their tests.
3. Add a `hydrate` action to the reducer; load before the splash screen hides, so onboarding doesn't flash.
4. Add a `version` field and drop saved data with an unknown version instead of crashing.
5. Log out still clears everything (Decision #75); also clear the saved copy.
6. Tests: save then load gives the same state; an item saved 2 days ago shows 2 fewer days left.

**Done when:** killing and reopening the app keeps the kitchen, the To Buy list, recipes, notification settings and onboarding.

### 4. Real use-soon dates (shelf life per item)

Every new item gets 7, 180 or 90 days just from its place (`DEFAULT_DAYS` in `store.tsx`).

1. Add a shelf-life table next to the place keywords in `receipt.ts` (spinach 5 days, chicken 2, milk 7, eggs 21, bread 5, rice 365 and so on), with the place default as the fallback.
2. Use it in `addScanned` and the add-item actions.
3. Tests for a few items in each place, and for the fallback.
4. Log the table and where its numbers came from in `Decisions.md`.

**Done when:** scanning the sample receipt flags chicken as use soon but not rice.

### 5. Use-soon and weekly notifications, scheduled on the phone

The Notifications screen asks for permission and stores the switches, but nothing is sent. Two of the four can be sent without a server. To Buy changes and someone joining need push from a server, so they stay backend work.

1. Each time the app opens, goes to the background or the kitchen changes: cancel Cooked's scheduled notifications and schedule the next use-soon one (a single date trigger at `useSoonTime`) with text from the current items, e.g. "Chicken thighs and spinach need using." Schedule nothing when nothing needs using.
2. Weekly summary: the same, a single date trigger for the next Sunday, from the current kitchen.
3. Put the text builders in `helpers.ts` with tests.
4. Change the screen's "nothing is scheduled yet" line to say only To Buy and joins wait for sync.
5. Log the approach in `Decisions.md` (it replaces the "can't check" note in #76).

**Done when:** with use-soon food and the switch on, a notification arrives at the chosen time; with none, nothing arrives.

### 6. Scan a recipe from a photo

Decision #77 removed the scan modes until they worked. With ticket 2, the Recipe mode can come back.

1. Bring back a two-mode strip on Scan: Receipt (default) and Recipe.
2. Recipe: photo → `readReceiptText` (rename it to `readText`) → the pasted-text parser in `recipeImport.ts` → Import's found screen.
3. No ingredients found goes to Import's existing error state.
4. Add one test with OCR text from a cookbook page.
5. Check the design for the mode strip (`design/screens/`) and the Avoid the AI look rules.

**Done when:** a photographed cookbook page becomes a saved recipe with its ingredients and steps.

### 7. Add the Photos and Flash icons to the set

Decision #49: Camera draws its own two glyphs outside the 20 icons.

1. Add `photos.svg` and `flash.svg` to `design/system/icons/` (24px grid, 1.8 stroke), list them in the design system README.
2. `npm run tokens`, then use `Icon` in `Camera.tsx` and delete the drawn glyphs.

**Done when:** `Camera.tsx` has no drawn icons and the icon count in the docs says 22.

### 8. Bundle the fonts in the build

Decision #39: fonts load at startup with `useFonts`.

1. Move to the `expo-font` config plugin in `app.json` so the fonts ship in the binary.
2. Keep `useFonts` for web only.
3. Log it in `Decisions.md`. Needs a new build (ticket 1), not just an update.

**Done when:** a development build shows the right fonts with the network off on first launch.

### 9. Android pass

The app is iPhone first but builds for Android from the same code.

1. Make an Android development build and go through every flow in `design/screens/README.md`.
2. Check: the drawn Apple button, the time picker dialog, the back button closing sheets, the camera permission, the tab island above the gesture bar, the text sizes at the largest font setting.
3. Fix what breaks; note anything that can't match iOS in `Decisions.md`.

**Done when:** every flow works on an Android phone.

### 10. App icon and splash (Owner, then agent)

`assets/` still has Expo's placeholders.

1. Owner: provide a 1024 × 1024 icon, the Android adaptive layers and a splash mark.
2. Agent: replace the files in `assets/`, check `app.json`, make a new build.

**Done when:** the home screen and launch show Cooked's icon.

### 11. Help, Privacy and Terms pages (Owner)

Account links to `cooked.app/help`, `/privacy` and `/terms`, which don't exist. The App Store needs a privacy policy URL.

1. Owner: write the text and publish the pages (or choose other URLs).
2. Agent: update the links in `account.tsx` if the URLs change.

**Done when:** all three links open real pages.

### 12. First TestFlight build (Owner)

1. `npx eas-cli@latest build --profile preview`, then submit to TestFlight.
2. Ship an update to `preview` and check it reaches the build.

**Done when:** testers can install Cooked from TestFlight.

---

### Needs a decision

These are features the design mentions but that need the owner's choice before they can become tickets.

- **Fridge, Pantry and Freezer scan modes.** Recognising food on a shelf from a photo needs an image model, either on the phone (big download, rough results) or a service (backend, costs per scan). Which, or drop it?
- **Units.** Account shows "Cups and ounces" as read-only. Is metric wanted, and where do units show besides recipe amounts?
- **Editing an item by hand** (quantity, date, place, marking a leftover as use soon). The design has Use and swipe to Use up, but no edit screen.
- **Import from Safari's share sheet.** Sharing a recipe link straight to Cooked needs a share extension (a native config plugin and a new build). Wanted?
- **Dark mode and iPad** (Decision #40: light mode and iPhone only). No designs yet.
