# TabIsland

The floating bottom navigation: a white pill with Home, Kitchen and Recipes. Kitchen (fridge icon) opens Your Kitchen; Scan moved to the round button top left on Home (Decisions #104).

- Size `island-width` × `island-height` (300 × 68px), centered, `space-6` (28px) from the bottom edge, floating over scrolling content.
- White `surface`, 1px `line` border, `radius-pill`, `shadow-island`, 6px inner padding. Three equal columns.
- Each tab has a 22px icon stroked at 1.8 and an 11px label underneath (`Home`, `Kitchen`, `Recipes`).
- **Active tab:** icon and label in `ink`, label at weight 600, and a 16×2.5px `tab-mark` underscore below.
- **Inactive tab:** icon and label in `ink-muted`, label at weight 500, no underscore.
- Never fill the active tab with a pill, and never make the island black.
- Pushed screens with a sticky bottom button (Check items, Recipe) hide the island.
- The active link has `aria-current="page"`.
