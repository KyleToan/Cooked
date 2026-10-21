# To do (2026-10-18)

A snapshot of what's left, pulled from `tickets.md`, `context.md`, `Decisions.md` and the repo. `tickets.md` has the full detail for each ticket.

## Where things stand

- Every designed screen is built. Typecheck, lint and all 354 tests pass, including the uncommitted work on `claude/sweep-fixes`.
- The Supabase backend is built and every migration is applied, including the new `items_unsorted`. The app has **never been run against it**, and nothing has been tested on a real phone.
- `claude/sweep-fixes` has 22 changed files and 4 new ones that aren't committed yet (Decisions #150–154: used-up items leave the list, the Recipes filter button, the servings stepper, To Buy amounts, shorter recipe rows).

## What you have to do

### Right now
1. **Commit the work on `claude/sweep-fixes`**, then merge it into `claude/practical-ride-7bm7pd`. Include the new `filter.svg` icon and the `items_unsorted` migration, which is already live on the database, so the app code needs to ship with it. Decide whether `design/logos/` belongs in the repo.
2. **Clean up branches.** `claude/admiring-newton-52caaf` is already merged in. There are also `worktree-design-review-fixes` and the remote branches `gallant-carson-ws7ehu` and `peaceful-fermi-wkj3pr`: keep or delete them.

### On a phone (nothing below has been checked)
3. **Make a development build**: `npx eas-cli@latest build --profile development` (T1.1). The EAS project and app IDs are already set up.
4. **Run it against Supabase on two phones (T1.4):**
   - sign in
   - a change on one phone shows on the other
   - joining with an invite code
   - removing someone
   - deleting your account
5. **Test with real things:**
   - 3 real receipts: save the recognized text so it can become tests
   - a cookbook page, including a two-column one
   - the use-soon nudge
   - fonts with the network off
6. **Android checklist** in `tickets.md` under "Owner steps", step 6.

### Decisions only you can make
7. **T0.4 Account fields.** Can Email, Sign-in method and Units be changed? Do you want metric?
8. **Shelf scan modes** (Fridge, Pantry, Freezer from a photo): run on the phone, use a paid service, or drop them?
9. **Editing an item by hand** (quantity, place): wanted? It needs a design.
10. **Import from Safari's share sheet**: wanted? It needs a native share extension and a new build.
11. **iPad**: still out of scope? Dark mode is now done (Decisions #143), so that part of the old question is answered.
12. **Small calls:**
    - nudge text casing ("Chicken thighs and Spinach")
    - spot-check shelf-life numbers against USDA FoodKeeper
    - hide "Try another link" after a failed photo scan?
13. **Push notifications (T6.1)**: needs your Apple push key and Expo account setup.

### Things only you can provide
14. **App icon and splash** artwork (T7.2). `design/logos/` may be the start of this.
15. **Help, Privacy and Terms pages** on `cooked.app` (T7.1). The app already links to them. Privacy must list every service that gets user data (Supabase, Google ML Kit runs on the phone).
16. **Universal links**: host the `apple-app-site-association` file on `cooked.app` so invite links open the app (part of T3.3).
17. **App Store**: listing, screenshots and privacy nutrition labels, then TestFlight (T7.4).

## What an agent can do (no owner input needed)

- **T1.5 Retry on network errors**: saving, loading the kitchen, joining, importing.
- **T1.6 Offline write queue**: there's a reference design in commit 977d7c1.
- **T1.7 Recipe ranks on the backend.** Ranks are phone-only today and are lost on log out.
- **T5.6** Write steps for Chickpea curry, Berry overnight oats and Pesto pasta, or drop them with the sample data.
- **T7.5** Remove the sample data and dev shortcuts before launch (`seed.ts`, `rivera-kitchen`, DEV error, sample scans).
- **T7.6** Accessibility pass. It needs a phone for VoiceOver and the largest text sizes.
- **Fix `npm run doctor`.** `expo-doctor` isn't installed, so the script fails.
- **Tidy `tickets.md`.**
  - The "Owner steps (2026-10-11)" section is out of date: app IDs, EAS and pushing are done.
  - "Dark mode" is still listed under "Needs a decision".
  - T3.3 (join preview) and T4.3 (use soon by hand) say "being built now", but their migrations are applied. Check them and tick them off.

## Later, only if needed

- **T5.5** Server-side link import, only if testers hit sites that block fetching from the phone.
- **T6.2** The four server-sent notifications, after push (T6.1).
- An overall view of every ranked recipe (needs design).
