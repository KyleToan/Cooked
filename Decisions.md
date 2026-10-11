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
