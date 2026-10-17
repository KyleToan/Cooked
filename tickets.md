# Tickets

What's left to turn the faked parts of Cooked (see "What's built and what's faked" in `context.md`) into real features, in the order they depend on each other. 🔑 marks a decision or account only the owner can make; agents don't pick backends or add services that send user data out.

Suggested order: Phase 0 → 1 → 2 → 3 → 4 and 5 side by side → 6 → 7.

## Phase 0: Decisions (owner)

- [x] **T0.1 🔑 Backend.** Pick one for accounts, database, real-time sync and file storage (Supabase or Firebase are the usual Expo choices). Create the project with your own account; keys go in EAS environment variables. Log it in `Decisions.md`. *Supabase (Decisions #82).*
- [x] **T0.2 🔑 Receipt reading.** On-device (Apple Vision, needs a development build) or an AI/OCR service (sends photos out). How items get sorted into fridge, pantry or freezer. *On the phone with Google ML Kit (Decisions #86, #92); places still come from the keyword table in `receipt.ts`.*
- [x] **T0.3 🔑 Open product rules.** Who can remove whom from a kitchen. How "use soon" dates are worked out (shelf-life defaults, by hand, or both). Whether recipe links are fetched on a server or on the device. *Only the kitchen's maker removes people (Decisions #84), and when the maker leaves, the earliest joiner takes over. Use soon is both: a per-item shelf life sets it, and you can mark or change it by hand. Links are fetched on the device (Decisions #59; see T5.5).*
- [ ] **T0.4 🔑 Account fields.** Can Email, Sign-in method and Units be changed, and how? Decisions #54 left them read-only. For Units: is metric wanted, and where do units show besides recipe amounts? Needs design if yes. *Replaces "Units" under "Needs a decision".*

## Phase 1: Foundations

- [ ] **T1.1 Development build.** Owner runs `eas login`, `init`, `update:configure`; build with `npx eas-cli@latest build --profile development`. Needed for real Apple/Google sign-in, push and on-device OCR. *Done when the app runs on a phone from a dev build.*
- [x] **T1.2 Backend client.** Install the SDK with `npx expo install`, pinned. Config only from env vars; list the names in `AGENTS.md`. *`src/data/supabase.ts`; `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.*
- [x] **T1.3 Schema.** Tables matching `src/data/types.ts`: people, kitchens, kitchen_members, items, to_buy, recipes, invites, notification_settings. Access rules so you only see kitchens you belong to. *Done when two test accounts can't see each other's kitchens.* *In `supabase/migrations/`, applied and checked with two test users.*
- [x] **T1.4 Store on the backend.** Keep the `actions` in `src/data/store.tsx` with the same names and inputs; each writes to the backend. Load on sign-in, subscribe to live changes, keep undo, cache on the device for offline. *Done when a change on one phone shows on another within seconds.* *Built (`remote.ts`, `store.tsx`, Decisions #83); not yet run on two phones. Offline writes are T1.6.*
- [ ] **T1.5 Network error states with retry.** Every call that can fail (saving a change, loading the kitchen, joining, importing a recipe) needs an error state and a Retry, following the design system's error rules; the checklist asks that "every flow that can fail has an error state". Today error lines already say whether you're offline or the server failed (Decisions #89), but none offers Retry, and a failed kitchen write rolls back without telling you. *Done when, with the network off, each of the four shows an error with Retry, and Retry works once the network is back.*
- [ ] **T1.6 Offline write queue.** Decision #83 says "No offline queue yet: a failed write rolls back". Instead, keep failed writes on the phone and retry them about every 5 seconds and when the app comes back to the front, so changes made offline aren't lost. The `supabase-backend` branch has a reference design in commit 977d7c1: `flush` and `RETRY_MS` in `src/data/store.tsx`, and the diff against the server's last copy in `src/data/sync.ts`. Log the change to #83 in `Decisions.md`. *Done when ticking items in airplane mode and turning the network back on brings the same changes to a second phone, and killing the app while offline doesn't lose them.*

- [ ] **T1.7 Recipe ranking on the backend.** Ranks (Decisions #131, #132) live only in `State.ranks` on the phone (`src/data/saved.ts`); `remote.ts` never loads or writes them, so they don't follow you to a new phone and are lost on log out. Scores are personal, one ranking per person (Decisions #145). Add a table (e.g. `recipe_ranks`: person, recipe, band, position) with row level security, load it in `loadAll`, write changes in `writeDiff`, and keep the `rankRecipe` action's name and inputs. Remove a recipe's rank when the recipe is deleted. *Done when ranking on one phone shows the same scores after signing in on another.* Later (needs design): an overall view of every ranked recipe that the person can split into their own groups.

## Phase 2: Accounts

- [x] **T2.1 Email and phone codes.** Real one-time codes; resend with a cooldown; remove `481726`. *Real codes through Supabase Auth. `481726` stays for local mode only until T7.5. Phone codes need an SMS provider set up in Supabase (Decisions #87).*
- [x] **T2.2 Sign in with Apple.** Turn on `usesAppleSignIn`; pass Apple's token to the backend. *Token passed in `src/data/auth.ts`; needs the dev build (T1.1) to try.*
- [x] **T2.3 Sign in with Google.** Google OAuth (client IDs in env vars). *Through Supabase's OAuth page (`src/data/auth.ts`).*
- [x] **T2.4 Stay signed in.** Session in `expo-secure-store`; "onboarded" saved on the account. *The session is kept in `expo-sqlite/localStorage` (`src/data/supabase.ts`), not `expo-secure-store`.*
- [x] **T2.5 Log out and delete account.** Delete removes sign-in and name, keeps the kitchen for the others (server function). *The `delete_account` function is called from Account. The App Store requires in-app account deletion, so this covers that requirement (T7.4).*
- [ ] **T2.6 Edit account fields.** Build whatever T0.4 decides for Email, Sign-in method and Units. The name sheet already exists and only needs to save to the server. *Done when each field T0.4 makes editable changes on the server and shows on the next sign-in.*

## Phase 3: Kitchens and sharing

- [x] **T3.1 Create a kitchen.** Just me and Me and my household make a real kitchen. *`create_kitchen` (`src/data/kitchenApi.ts`).*
- [x] **T3.2 Invite links.** `cooked.app/join/<code>`, one person, 7 days; Make a new link cancels the old; system share sheet.
- [ ] **T3.3 Join.** Server checks the code; universal links open the app; existing error for unknown or expired codes. Before joining, Join shows a preview of the kitchen the code belongs to (its name and who made it). *The server check and the error are built; universal links (`associatedDomains` and the apple-app-site-association file on `cooked.app`) aren't. The preview is being built now.*
- [x] **T3.4 Household.** Rename, remove (rule from T0.3) with undo, leave; "Added by Sam" and activity lines from real data. *Only the maker removes people (Decisions #84). When the maker leaves, the earliest joiner becomes the maker; that hand-over is being built now.*

## Phase 4: Scanning

- [x] **T4.1 Receipts.** Photo → text (T0.2) → lines with `parseReceipt` in `src/data/receipt.ts` → Check your scan. Unreadable → Couldn't read this receipt. *ML Kit is wired into Scan (Decisions #92, #93); not yet checked against real receipt photos.*
- [ ] **T4.2 Fridge, Pantry, Freezer and Recipe modes.** Recognize items on a shelf; read a recipe page photo. *Recipe mode is done (Decisions #94). The shelf modes wait on "Needs a decision".*
- [ ] **T4.3 Use-soon dates.** `daysLeft` from the T0.3 rule instead of `DEFAULT_DAYS`. *The automatic part is done: a per-item shelf life (Decisions #95). Marking or changing it by hand is being built now.*

## Phase 5: Recipes

- [x] **T5.1 Import from a link.** Read schema.org Recipe data from the page; "No recipe on that page" otherwise. *Fetched on the device for now (Decisions #59).*
- [x] **T5.2 Import from pasted text.** Title, ingredients and steps.
- [x] **T5.3 Match ingredients.** Missing and have from real items with fuzzy names (`src/data/match.ts`).
- [x] **T5.4 Tonight's pick.** The recipe that uses the most use-soon items.
- [ ] **T5.5 Server-side link import.** Only if testers hit sites that block fetching from the phone, or the web version matters (on the web most sites block the fetch, Decisions #59). Same parser and same screens, run in a Supabase function. *Done when a link that fails on the phone imports through the server.*
- [ ] **T5.6 Full sample recipes.** Chickpea curry, Berry overnight oats and Pesto pasta have no steps, only list data (Decisions #55). Either write their steps, or drop them when the sample data goes (T7.5). *Done when every sample recipe opens with steps and I made this, or is gone.*

## Phase 6: Notifications

- [ ] **T6.1 🔑 Push.** `expo-notifications`, permission, save device tokens.
- [ ] **T6.2 The four notifications.** To Buy changes, daily use soon at the chosen time, someone joins, weekly summary. Switches saved on the server; sent by scheduled server jobs.

## Phase 7: Launch

- [ ] **T7.1 Help, Privacy and Terms** pages at `cooked.app`. Privacy lists every service that gets user data.
- [ ] **T7.2 App icon and splash** to replace the Expo placeholders.
- [x] **T7.3 Tests** for the store, receipt parser, recipe import and ingredient matching (`npm test`). Keep adding as features land.
- [ ] **T7.4 Ship.** Update to `preview`, test with friends, then `production` and the App Store. The App Store also needs a store listing, screenshots and the privacy nutrition labels (every service that gets user data, matching T7.1). In-app account deletion is required and already built (T2.5).
- [ ] **T7.5 Remove sample data and dev shortcuts.** Before launch, take out `src/data/seed.ts` (Rivera kitchen), the `SAMPLE_SCAN` and `SAMPLE_RECIPE_PAGE` fallbacks in Scan and `ocr.ts`, the `rivera-kitchen` join code, the **DEV error** button on Scan, `supabase/seed.sql`, and the notes about them in `AGENTS.md` and `context.md`. Keep what the tests need as test fixtures. *Done when a production build has no sample data or dev shortcuts and `npm test` still passes.*
- [ ] **T7.6 Accessibility pass on a device.** VoiceOver labels on every control, Dynamic Type at the largest sizes, reduced motion, 44pt tap targets and 4.5:1 contrast for text that matters (design checklist). *Done when every flow in `design/screens/README.md` works with VoiceOver and at the largest text size on a phone.*

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
- **Units, Email and Sign-in.** Now T0.4 and T2.6 above.
- **Editing an item by hand** (quantity, place). The design has Use and swipe to Use up, but no edit screen. Marking an item use soon or changing its date by hand is decided (T0.3) and being built.
- **Import from Safari's share sheet.** Sharing a recipe link straight to Cooked needs a share extension (a native config plugin and a new build). Wanted?
- **Dark mode and iPad** (Decision #40: light mode and iPhone only). No designs yet.

---

## Owner steps after the agent tickets (2026-10-11)

Agents finished tickets 2–9 on their own branches. None are pushed or merged. Each was checked with typecheck, lint and tests, but none has run on a phone.

| Ticket | Branch | Commit | Based on |
| --- | --- | --- | --- |
| 2 Receipt OCR | `ticket-2-ocr` | 45e502a | ce1e5ea |
| 3 Saved on the phone | `ticket-3-persist` | 89b9553 | ce1e5ea |
| 4 Shelf life | `ticket-4-shelf-life` | 286ade4 | ce1e5ea |
| 5 Local notifications | `ticket-5-notifications` | d7f74ef | ce1e5ea |
| 6 Recipe from a photo | `ticket-6-recipe-scan` | 8e1e538 | 45e502a (ticket 2) |
| 7 Photos and Flash icons | `ticket-7-icons` | 0f0fbe0 | ce1e5ea |
| 8 Bundled fonts | `ticket-8-fonts` | 04d46a9 | ce1e5ea |
| 9 Android fixes | `ticket-9-android` | 10e9524 | ce1e5ea |

### 1. Save what's in your main checkout
`/Users/linhp/Cooked` has uncommitted Supabase work and OCR work. The OCR part is now on `ticket-2-ocr`. Commit the Supabase files on their own branch, and don't add the OCR files (`src/data/ocr.ts`, the OCR hunks in `scan.tsx`, `scan-review.tsx` and `receipt.ts`). Otherwise they will clash with ticket 2.

### 2. Fix GitHub login and push
Pushing failed with "could not read Username". Run `gh auth login` (or set up a credential helper), then push `tickets-non-backend` and the eight ticket branches.

### 3. Merge the combined branch
`combined-tickets` already merges all eight branches (in the order 7, 9, 2, 6, 4, 3, 5, 8) with the conflicts resolved. The new `Decisions.md` rows are renumbered #90–#98 in that order (after the Supabase rows #82–#89; #99 records the merge). Review it, then merge it into `build-screens`. Two leftover branches, `worktree-agent-a711afe1bc7ad71aa` and `worktree-agent-ab85470e768a81e4f`, point at ce1e5ea and can be deleted.

### 4. Choose the app IDs
`app.json` has no iOS `bundleIdentifier` or `android.package` (e.g. `app.cooked`). EAS asks for them at the first build. Once set they're permanent in the stores.

### 5. EAS and a development build (ticket 1)
`npx eas-cli@latest login`, `init`, `update:configure`. Add a `development` profile (`developmentClient: true`) to `eas.json`, then build for iOS and Android. Tickets 2, 3, 6 and 8 add native code, so Expo Go isn't enough.

### 6. Test on your phones
- **Receipts:** photograph 3 real receipts. Check the items and places on Check your scan, and save the recognized text so an agent can add it as tests (ticket 2, step 5). A blank photo should show "Couldn't read this receipt".
- **Recipe photo:** a cookbook page from the camera and from Photos ends on the found screen and saves. Also try a two-column page.
- **Saved kitchen:** add and tick things, kill the app, reopen. Everything is still there, and days left went down the next day. Log out clears it.
- **Notifications:** with use-soon food, set the time a few minutes ahead and put the app in the background; the nudge arrives. With nothing to use, the switch off, or permission denied, nothing arrives.
- **Fonts:** with the network off on first launch, titles, body and notes all show the right fonts on iOS and Android.
- **Android:**
  - the drawn Apple button
  - the time dialog
  - back closing sheets with the slide
  - the camera permission working right after you allow it in Settings
  - fields staying above the keyboard (if they're covered, set the Android `behavior` to `'padding'` at `Sheet.tsx:323` and `Onboarding.tsx:31`)
  - the island above both kinds of nav bar
  - shadows
  - the largest text size

### 7. Small calls to make
- **Nudge text:** it keeps names as stored, so it reads "Chicken thighs and Spinach need using." Keep that, or lower-case all but proper nouns?
- **Shelf-life numbers:** check a few in ticket 4's table against USDA FoodKeeper.
- **Photo scan error:** after a failed photo scan, Import's error still offers "Try another link". Hide it?
- **Icon source:** re-export `design/system/design-system.json` from the design source so it lists the two new icons.
- **`npm run doctor`:** it fails because `expo-doctor` isn't installed (`npx -y expo-doctor` works). An agent can fix the script.

### 8. Things only you can provide
- App icon and splash artwork (ticket 10).
- Help, Privacy and Terms pages at `cooked.app` (ticket 11).
- Answers to "Needs a decision" above and T0.4: shelf-scan modes, account fields and units, editing items by hand, Safari share, dark mode and iPad.

### 9. Ship to testers (ticket 12)
`npx eas-cli@latest build --profile preview`, submit to TestFlight, then `npx eas-cli@latest update --channel preview --message "..." --environment preview` and check it reaches the build.
