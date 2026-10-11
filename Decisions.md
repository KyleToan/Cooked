# Decisions

A log of every product, design and technical decision for Cooked, newest last. Times are UTC.

Earlier decisions were rebuilt from the timestamps saved on the design artifacts, so they have the time that artifact was created or last changed, not the exact minute of the conversation. Decisions made in chats that left no saved record aren't listed. Add them if you remember them.

**How to add one:** append a row with the timestamp (`YYYY-MM-DD HH:MM UTC`), the decision, why, and where it came from. Don't edit or delete old rows. If a decision changes, add a new row that says what it replaces.

| # | Timestamp (UTC) | Decision | Why / notes | Source |
| --- | --- | --- | --- | --- |
| 1 | 2026-10-07 19:05 | Build a mobile app called **Cooked**: a shared kitchen app for a household. | Starting point of the project. | "Cooked Scan Screen" canvas created |
| 2 | 2026-10-07 19:05 | Design for an iPhone-sized frame, 390 × 844. | Mobile first. | Scan Screen canvas |
| 3 | 2026-10-07 to 10-09 | Core features: scan to stock the kitchen, import recipes, track Fridge / Pantry / Freezer, one shared shopping list. | The main jobs of the app. | Scan Screen canvas |
| 4 | 2026-10-07 to 10-09 | Scan screen is a full-screen camera with a mode picker: Fridge, Pantry, Freezer, Receipt, Recipe. Receipt is the default. | One camera for every way of adding food. | Scan artboard |
| 5 | 2026-10-07 to 10-09 | Import opens as a pop-up sheet from Home. | Keeps Home as the hub. | Import pop-up artboard |
| 6 | 2026-10-07 to 10-09 | Each storage item shows quantity left and an expiry/status line, with a "Use" button that takes one off. Items expiring soon are flagged. | Help people use food before it goes off. | Kitchen artboards |
| 7 | 2026-10-07 to 10-09 | Shopping list items show why they're there ("For Shakshuka", "Running low", "Added by household") and their location. | Shared list needs context. | Shopping list artboard |
| 8 | 2026-10-07 to 10-09 | Household sharing button on the Scan and Kitchen screens. | The app is for people who live together. | Scan / Kitchen artboards |
| 9 | 2026-10-09 | Approved direction: the **"Home – minimal"** screen. It became the basis of the design system. | Chosen over the earlier, darker and busier screens. | Last canvas update; design system source |
| 10 | 2026-10-09 01:56 | Create the **Cooked design system** from the approved Home screen. All new screens must follow it. | One source of truth for design. | Design system created |
| 11 | 2026-10-09 01:56 | Pure white background; calm, uncluttered screens. | "Show a few things clearly and leave the rest out." | Design system |
| 12 | 2026-10-09 01:56 | **Light Bronze** (`#d4a373`) is the only accent, with `bronze-ink` (`#8a5a2b`) for text. | One accent keeps screens quiet; plain bronze fails contrast as text. | Design system |
| 13 | 2026-10-09 01:56 | Kitchen locations shown as **tilted sticky notes** with tape and handwriting, colored Cornsilk (Fridge), Papaya (Pantry), Beige (Freezer), Sage (List). | The one warm, playful element. | Design system |
| 14 | 2026-10-09 01:56 | Fonts: **Instrument Sans** for the interface, **Caveat** only on sticky notes. | Distinct, not the default AI fonts. | Design system |
| 15 | 2026-10-09 01:56 | No black buttons or cards. Actions are soft grey pills; max two per screen (Scan and Import on Home). | Replaces the black pills and black scan button in the earlier screens. | Design system |
| 16 | 2026-10-09 01:56 | Navigation is a floating white **tab island** with three icon-only tabs: Home, Scan, Recipes. Active tab gets a grey underscore. | Replaces the earlier 5-tab bar (Home, Recipes, Scan, Discover, Account). Discover dropped; Account moved to the header. | Design system |
| 17 | 2026-10-09 01:56 | Screen recipe: greeting + title, search, up to two actions, two or three sections, tab island. 20px gutter. | Consistent structure. | Design system |
| 18 | 2026-10-09 01:56 | Shopping list on Home is a "To Buy" to-do card with progress bar; done items cross out and drop to the bottom. | Makes the shared list feel like progress. | Design system |
| 19 | 2026-10-09 01:56 | Time-based greeting with the person's name: Good morning / Good afternoon / Good evening / Up late. | Personal, shared feel. | Design system |
| 20 | 2026-10-09 01:56 | Accessibility: 4.5:1 contrast for text that matters; touch targets at least 44px; low-contrast greys flagged for hints only. | Accessible by default. | Design system |
| 21 | 2026-10-09 01:56 | Camera screen is the one place see-through dark controls are allowed. | They sit over a live camera feed. | Design system |
| 22 | 2026-10-11 01:17 | Add the **"Avoid the AI look"** rules and make passing them a requirement for every screen. | Keep Cooked from looking generic or AI-made. | Design system last change |
| 23 | 2026-10-11 | Set up the `kyletoan/cooked` repo with `AGENTS.md`, `Decisions.md` and `context.md`. Agents may never touch secrets. | Give AI tools (Claude Code, Cursor) shared rules and context. | This commit |
| 24 | 2026-10-11 | **Sage** replaces Light Bronze as the action color (replaces #12). `sage` fills the one primary button per screen; `sage-ink` for links, icons on grey pills and checked boxes; `progress` for progress bars. Bronze now only marks food to use soon. | The owner prefers sage for everything and doesn't want orange or black buttons. | Design system, canvas |
| 25 | 2026-10-11 | Fonts: **Alumni Sans** for screen titles and section headings, **Albert Sans** for everything else (replaces #14). Caveat stays, only on sticky notes. | Owner's choice. | Design system |
| 26 | 2026-10-11 02:18 | 20 custom icons on a 24px grid with a 1.8 stroke, including three loaders (`loading`, `syncing`, `cooking`). Only these are used in the app. | One consistent icon set. | Design system Icons |
| 27 | 2026-10-11 | Home shows three sticky notes (Fridge, Pantry, Freezer). The shopping list is the To Buy section below them and a fourth tab in Your Kitchen (replaces the List note in #13). | Keeps the notes about places in the kitchen. | Canvas |
| 28 | 2026-10-11 | Lists are flat rows with dividers, not cards. To Buy checkboxes fill `sage-ink` when ticked (replaces the ink checkbox in #18). Ticking off or using up an item shows an undo bar. | Calmer screens; mistakes are easy to undo. | Design system |
| 29 | 2026-10-11 | Every flow that can fail has an error screen: a receipt that can't be read, a page with no recipe, a wrong sign-in code. | Each one says what happened and offers the next step. | Canvas |
| 30 | 2026-10-11 | Onboarding: one thing per screen (like Instagram) and sign-in choices side by side (like Airbnb): Apple, Google, or email or phone with a one-time code. No passwords. | Fast sign-up. | Canvas |
| 31 | 2026-10-11 | Onboarding asks who you cook with: Just me, Me and my household, or I have an invite. Households invite after the first scan; invitees join with a link or code. Scanning the first receipt is part of onboarding and can be skipped. | Cooked works for solo cooks too. | Canvas |
| 32 | 2026-10-11 | Account screen with Log out (grey pill) and Delete account (red text, confirmed in a sheet where "Keep my account" is the sage button). Destructive actions are always `error-ink` text, never filled buttons. | Required account controls without making them prominent. | Canvas, design system |
| 33 | 2026-10-11 | Household screen: rename the kitchen, see and remove people (asks first, can be undone), share a one-person invite link that runs out in 7 days, make a new link, leave the kitchen. Notifications screen with four switches. | How shared kitchens work. | Canvas |
| 34 | 2026-10-11 13:58 | Section headings are Alumni Sans **semibold (600) with no underline**. Screen titles stay bold (700). | Settled after trying thin and underlined headings. | Design system |
| 35 | 2026-10-11 | Add `design/` to the repo: the design system, every screen as a prototype, screenshots and a screen index, plus `.cursor/rules/cooked-design.mdc`. The prototypes are the spec, not app code; screens get rebuilt in the app's own UI framework. | Lets Cursor and other agents build from the real designs. | This commit |
| 36 | 2026-10-11 14:32 | Build the app in **React Native with Expo** (SDK 57, TypeScript, Expo Router), not SwiftUI. | The owner wants over-the-air updates (EAS Update) to ship fixes without App Store review. Also gives Android from the same code. | Owner, in chat |
| 37 | 2026-10-11 | OTA updates use EAS Update with two channels, `preview` and `production`. `runtimeVersion` uses the `fingerprint` policy. | Fingerprint changes the runtime version automatically when native code changes, so an update can't reach a build it would crash. | This commit |
| 38 | 2026-10-11 | The theme and icons are generated from `design/system/` by `scripts/build-tokens.mjs`; app code imports from `@/theme` and never hard-codes values. | One source of truth for the design. | This commit |
| 39 | 2026-10-11 | Fonts load at startup with `useFonts` and the `@expo-google-fonts` packages, behind the splash screen. | Works in Expo Go, so the app runs on a phone without a custom build. Can move to the expo-font config plugin later to bundle them. | This commit |
| 40 | 2026-10-11 | The app is light mode only and iPhone only for now (`userInterfaceStyle: light`, no iPad layout). | The design has no dark mode or iPad screens yet. | This commit |
