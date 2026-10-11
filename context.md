# Context

Everything an agent or new contributor needs to know about Cooked. Rules for agents are in `AGENTS.md`; the decision history is in `Decisions.md`.

> Note: this was written from the saved design artifacts. Claude can't see past chat conversations, so anything discussed only in chat isn't here yet. Add it to the "Notes from conversations" section.

## What Cooked is

Cooked is a shared kitchen app for a household. You:

- **Scan** a receipt (or your fridge, pantry, food or a recipe) to stock your kitchen.
- **Track** what's in your Fridge, Pantry and Freezer, with quantities and expiry dates.
- **Import** recipes.
- **Share one shopping list** with the people you live with.

The feel: calm, white, uncluttered, with one warm, homemade touch (sticky notes on a fridge door). It should feel shared, not solo: "Added by Sam", a household button, a greeting with your name.

## Platform

- Mobile app, designed at iPhone size (390 × 844).
- Tech stack: not chosen yet. Record it in `Decisions.md` when it is.

## Screens

### Home (approved: "Home – minimal")

1. Greeting ("Good evening, Alex") and title "Cooked", account button on the right.
2. Search field.
3. Two action pills: **Scan** and **Import**.
4. **Your Kitchen**: 2×2 grid of sticky notes: Fridge, Pantry, Freezer, List, each with a count ("12 items", "3 to buy") and maybe one urgent note ("2 expiring!").
5. **To Buy**: shared shopping list card with progress ("1 of 3 done"), checkboxes, notes ("For Shakshuka", "Added by Sam") and location tags. "Add an item…" row at the bottom.
6. Floating tab island: Home, Scan, Recipes.

### Scan

- Full-screen live camera with corner guides and a capture button.
- Prompt: "Point your camera at your fridge, pantry, food, receipt, or recipe."
- Mode picker: Fridge, Pantry, Freezer, Receipt (default), Recipe. The hint changes with the mode ("Scan a receipt to stock up", "Adding to Fridge", "Import a recipe").
- Close button and a share-with-household button. Dark see-through controls are allowed here only.

### Import

- A pop-up sheet over Home for importing a recipe.

### Kitchen: Fridge, Pantry, Freezer

- Tabs for Fridge, Pantry, Freezer and Shopping list; search per location.
- Filters, e.g. Fridge: All, Expiring soon, Produce, Dairy, Meat & fish, Leftovers. Pantry: Running low, Grains & pasta, Canned, Baking, Spices. Freezer: Meat & fish, Veggies, Meals, Desserts.
- Each item: initial as a placeholder image, name, "N left · Expires in X days" (urgent ones highlighted), and a "Use" button that takes one away.
- Sorting: Expiring first (Fridge/Freezer), A–Z (Pantry).

### Shopping list

- Items with a reason and location ("For Shakshuka · Fridge", "Running low · Pantry", "Added by household").
- Mark as bought; bought items cross out. Filters: To buy, Bought, From recipes. Sort by aisle. "Add item".

### Recipes

- A main tab. Not designed yet.

Note: the Kitchen and Shopping list mockups were made **before** the design system. Their layout and features are still the plan, but they use the old look (grey background, black pills, 5-tab bar). Rebuild them with the design system: white background, soft grey pills, bronze accent, tab island.

## Design

The full design system is in `AGENTS.md` and at https://claude.ai/artifact/9uaDBLc2WkxCCJrooL3gki. In short:

- White background, ink text, **Light Bronze** as the only accent.
- **Instrument Sans** for UI, **Caveat** handwriting only on sticky notes.
- Soft grey pill buttons, no black buttons.
- Sticky notes in Cornsilk, Papaya, Beige, Sage for kitchen locations.
- Floating tab island: Home, Scan, Recipes.
- Every screen must pass the **Avoid the AI look** list.

## Sample data used in designs

- People: Alex (the user), Sam (housemate).
- Fridge: Spinach, Milk, Eggs, Greek yogurt, Chicken thighs, Cheddar.
- Pantry: Rice, Spaghetti, Chickpeas, Olive oil, Flour.
- Freezer: Frozen peas, Salmon fillets, Chili (leftovers), Ice cream.
- Shopping: Tomatoes, Feta (for Shakshuka), Bread, Rice, Frozen berries.

## Design files

| File | Link | What it is |
| --- | --- | --- |
| Cooked design system | https://claude.ai/artifact/9uaDBLc2WkxCCJrooL3gki | Source of truth for the look. |
| Cooked Scan Screen canvas | https://claude.ai/artifact/4Y3vzFjNNfX7kS88MV3mGV | Mockups: Home, Import pop-up, Scan, Fridge, Pantry, Freezer, Shopping list, Home – minimal. |

## Open questions

- Tech stack (native iOS, React Native, Flutter, web?).
- Backend, accounts and how households share data.
- How receipt and food scanning works (OCR / vision service).
- How recipe import works (link, photo, paste).
- Recipes screen design.
- Notifications for expiring food?

## Notes from conversations

_Add anything decided or discussed in chats that isn't captured above._
