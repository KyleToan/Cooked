# Context

Everything an agent or new contributor needs to know about Cooked. Rules for agents are in `AGENTS.md`; the decision history is in `Decisions.md`; the design spec is in `design/`.

## What Cooked is

Cooked is a shared kitchen app for a household. You:

- **Scan** a grocery receipt (or your fridge, pantry, freezer, or a recipe) and Cooked puts each item where it lives.
- **Track** what's in your Fridge, Pantry and Freezer, with quantities and what to use soon.
- **Import** recipes from a link or pasted text and see what you already have for them.
- **Share one To Buy list** with the people you live with.

It's also for people who cook alone (the "Just me" path in onboarding).

The feel: calm, white, uncluttered, with one warm, homemade touch (sticky notes on a fridge door). It should feel shared, not solo: "Added by Sam", a household screen, a greeting with your name.

## Platform

- iPhone app first, designed at 390 × 844. Native iOS expectations apply: back gestures, Sign in with Apple, the system share sheet and keyboard.
- Tech stack: React Native with Expo (SDK 57), TypeScript and Expo Router, with over-the-air updates through EAS Update. See `AGENTS.md` for the folder layout and commands.
- State of the code: the project, theme, fonts and icons are set up, and a temporary theme check screen opens first. No Cooked screens are built yet.

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
- Floating tab island: Home, Scan, Recipes.
- 20 custom icons on a 24px grid.
- Every screen must pass **Avoid the AI look** (`design/system/avoid-the-ai-look.md`).

## How sharing works in the design

- A household is a "kitchen" (e.g. "Rivera kitchen"). Everyone in it shares the fridge, pantry, freezer, To Buy and recipes.
- You join with an invite link (`cooked.app/join/<kitchen>`) or the code at the end of it. A link works for one person and runs out after 7 days. "Make a new link" kills the old one.
- People can be removed from the kitchen (the design shows Alex, who made it, removing Sam). What they added stays. Removing asks first and can be undone. Who is allowed to remove whom isn't decided yet.
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

## Open questions

- Backend, accounts and real-time sync for a shared kitchen.
- How receipt scanning works (on-device OCR such as Apple Vision, or a service) and how items get sorted into fridge, pantry or freezer.
- How recipe import works (fetching and parsing a page, or pasted text).
- How "use soon" dates are worked out (typical shelf life per item, or entered by hand).
- Push notifications: the design has To Buy changes, a daily use-soon nudge, someone joining and a weekly summary.

## Notes from conversations

_Add anything decided or discussed in chats that isn't captured above._
