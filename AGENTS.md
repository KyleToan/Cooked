# AGENTS.md

Rules for any AI agent (Claude Code, Cursor, Copilot, etc.) working in this repo. Read this file, `context.md` and `Decisions.md` before making changes.

## The codebase

The repo has no app code yet. When code is added, update this section with:

- Tech stack and framework
- Folder layout (what lives where)
- How to install, run, lint and test
- Where environment config lives (names only, never values)

Until then, the source of truth for the app is the design system below and `context.md`.

## What you are allowed to do

- Read any file in the repo.
- Create and edit app code, tests and docs on your working branch.
- Run the project's own install, build, lint and test commands.
- Add dependencies when a task needs them. Pin exact versions and say why in the commit message.
- Add an entry to `Decisions.md` whenever you make a product, design or technical decision. Include the timestamp.
- Update `context.md` when the app's scope or state changes.

## What you are not allowed to do

- **Never touch secrets.** Don't read, print, log, copy, commit or change `.env` files, API keys, tokens, passwords, certificates or credentials, and don't hard-code them. If a task needs a secret, stop and ask the owner. Reference secrets only through environment variable names.
- Don't commit `.env`, keys or anything in `.gitignore`.
- Don't push to `main` or force-push to shared branches. Don't rewrite history on branches you didn't create.
- Don't open pull requests, merge, or deploy unless the owner asks.
- Don't delete files, data or branches you didn't create without asking.
- Don't skip, disable or delete tests to make CI pass.
- Don't add analytics, tracking or third-party services that send user data out without asking.
- Don't break the design system rules below. Any UI that uses a pattern from **Avoid the AI look** isn't done.
- Don't invent product decisions silently. If something isn't covered here or in `Decisions.md`, ask, or make the smallest reasonable choice and log it in `Decisions.md`.

## Working style

- Keep changes small and focused on the task.
- Match the surrounding code style.
- Run lint and tests before you commit.
- Write clear commit messages that say what changed and why.

---

# Design system: Cooked

Source: https://claude.ai/artifact/9uaDBLc2WkxCCJrooL3gki (last updated 2026-10-11). If this copy and the link disagree, the link wins. Update this copy when the design system changes.

Cooked is a shared kitchen app. You scan a receipt to stock your fridge, pantry and freezer, import recipes, and keep one shopping list with the people you live with. This system is based on the approved home screen and is the reference for every new Cooked screen.

**Read this first, every time.** Before designing any Cooked screen, check it against the rules below and use the tokens by name. Then check it against **Avoid the AI look**. No Cooked design may use anything on that list.

## The feeling

- **Calm, white and uncluttered.** The background is pure white. Show a few things clearly and leave the rest out. If a section isn't needed right now, don't add it.
- **Warm, homemade touches.** The kitchen is shown as sticky notes on a fridge door: tilted paper, tape and handwriting. This is the one playful element; everything around it stays quiet.
- **One accent.** Light Bronze is the only accent. It marks progress and the few things that need attention. Everything else is ink and soft greys.
- **Shared, not solo.** Small touches show other people: "Added by Sam" on a row, a household button, a greeting with the person's name.

## Screen recipe

Every main screen uses the same structure, top to bottom, with a 20px side gutter (`space-5`) and 20px between sections:

1. **Header.** Greeting line (`greeting`, `ink-subtle`, e.g. "Good evening, Alex") above the screen title (`title-xl`, top left). The account button sits on the right.
2. **Search.** One white field (`radius-field`, `line` border, `shadow-card`) with the magnifier on the right.
3. **Primary actions.** At most two soft pills side by side (`surface-sunken`, `radius-pill`, `control-height`), with icons in `bronze-icon`. On Home these are Scan and Import.
4. **Content sections.** Each has a left-aligned `section-title`, an optional `caption` meta line or progress count, and an optional "See all" link on the right in `bronze-ink`.
5. **Tab island.** A floating white pill at the bottom center (`island-width` × `island-height`, `shadow-island`, 28px from the bottom). Content scrolls behind it, so give the scroll area about 130px of bottom padding.

## Color

| Role | Token | Use |
| --- | --- | --- |
| Background | `surface` | Every screen background |
| Lines | `line`, `line-soft` | Card outlines and row dividers |
| Text | `ink`, `ink-muted`, `ink-subtle` | Primary, secondary, hint |
| Accent | `bronze` (fills), `bronze-ink` (text), `bronze-icon` (icons) | Progress, links, attention |
| Paper | `cornsilk`, `papaya`, `beige`, `sage` | Sticky notes only |

Rules:

- Use the four paper colors only for sticky notes and similar "paper" objects. Never use them as page backgrounds or button fills.
- Never use `bronze` for small text on white; it fails contrast. Use `bronze-ink` for text.
- No black buttons or black cards. The soft grey pill is the strongest button style on a screen. The only solid `ink` fills are the checked checkbox and the small "Add" confirm button.
- `ink-subtle` and `ink-off` are flagged for low contrast. Use them only for hints and inactive states. Use `ink-muted` for small text that matters.

### Color tokens

| Token | Value | Usage |
| --- | --- | --- |
| `surface` | `#ffffff` | Page background on every screen. |
| `surface-sunken` | `#f4f4f1` | Soft action pills (Scan, Import). No border, no shadow. |
| `surface-tag` | `#f3f3f0` | Small tags and counters, e.g. Fridge / Pantry tag on a to-do row. |
| `line` | `#ecece8` | 1px outline on white cards, search field, account button, tab island. |
| `line-soft` | `#f1f1ee` | Dividers between list rows; empty progress bar track. |
| `check-border` | `#cfcfc9` | Unchecked checkbox outline and dashed add-item box. |
| `ink` | `#1a1a18` | Primary text, headings, active tab icon, checked checkbox. 17.6:1. |
| `ink-muted` | `#6e6e68` | Secondary text: row notes, tags, helper copy. 5.2:1. |
| `ink-subtle` | `#8c8c86` | Greeting, "Synced 2h ago", placeholders. 3.4:1, flagged: 18px+ or non-essential hints only. |
| `ink-off` | `#a3a39d` | Inactive tab icons, crossed-out done items. 2.6:1, flagged: decorative only. |
| `tab-mark` | `#b5b5af` | Grey underscore under the active tab icon. |
| `on-ink` | `#ffffff` | Checkmark in a checked box; text on ink fills. |
| `bronze` | `#d4a373` | Light Bronze, the one accent. Fills only. Never small text on white (2.3:1). |
| `bronze-ink` | `#8a5a2b` | Accent as text: "See all", urgent notes. 6.0:1. |
| `bronze-icon` | `#9a6a3a` | Icons inside action pills. 5.0:1 on `surface-sunken`. |
| `cornsilk` | `#fefae0` | Sticky note: Fridge. |
| `papaya` | `#faedcd` | Sticky note: Pantry. |
| `beige` | `#e9edc9` | Sticky note: Freezer. |
| `sage` | `#ccd5ae` | Sticky note: List. |
| `note-ink` | `#2a2a26` | Handwritten text on sticky notes. 12:1+. |
| `note-ink-soft` | `#4a4a42` | Second line on a sticky note. 7:1+. |

## Type

- **Instrument Sans** (`sans`) for the whole interface. The title is bold and tight (`title-xl`, -0.035em). Sections are semibold at 18px, and body text is 16px.
- **Caveat** (`hand`) only on sticky notes: `note-title` for the name and `note-body` for the count. Never use the handwritten font for buttons, lists or headings.
- Write in sentence case. Keep it short and friendly: "To Buy", "Your Kitchen", "Add an item…".

Families:

- `sans`: `"Instrument Sans", system-ui, -apple-system, sans-serif`
- `hand`: `"Caveat", "Bradley Hand", cursive`

| Style | Family | Size / line height | Weight | Usage |
| --- | --- | --- | --- | --- |
| `title-xl` | sans | 36px / 1.05, -0.035em | 700 | Screen title, top left. One per screen. |
| `greeting` | sans | 15px / 20px | 500 | Time-of-day greeting, in `ink-subtle`. |
| `section-title` | sans | 18px / 24px, -0.01em | 600 | Section headings, left-aligned. |
| `body` | sans | 16px / 22px | 400 | List rows, inputs, search text. |
| `button` | sans | 15px / 20px | 500 | Pill buttons. |
| `link` | sans | 14px / 20px | 600 | Section links, in `bronze-ink`. |
| `caption` | sans | 13px / 18px | 400 | Meta lines, progress counts. |
| `micro` | sans | 12px / 16px | 500 | Tags and row notes. |
| `note-title` | hand | 28px / 1 | 700 | Sticky note name. |
| `note-body` | hand | 20px / 22px | 500 | Sticky note count or short status. |

## Shape and depth

- **Pills** (`radius-pill`) for anything you tap that isn't a card: actions, tags, the island.
- **Cards** are white with a 1px `line` border, `shadow-card` and `radius-card`. Use them only to group a list, such as the to-do card. Don't wrap every section in a card.
- **Sticky notes** have nearly square corners (`radius-note`) with a curled bottom-right corner, `shadow-note`, a slight tilt between -2° and 2°, and a strip of tape.

| Spacing | Value | Usage |
| --- | --- | --- |
| `space-1` | 4px | Island inner padding; tight icon gaps. |
| `space-2` | 8px | Icon-to-label gap in pills; title-to-meta gap. |
| `space-3` | 12px | Gap between paired pills; gap inside a section. |
| `space-4` | 16px | Card side padding; section title to content. |
| `space-5` | 20px | Page side gutter; gap between sections. |
| `space-6` | 28px | Island distance from the bottom edge. |

| Radius | Value | Usage |
| --- | --- | --- |
| `radius-note` | 3px | Sticky note corners (bottom-right uses 14px for the curl). |
| `radius-check` | 7px | Rounded-square checkboxes. |
| `radius-control` | 14px | Square icon buttons (account). |
| `radius-field` | 16px | Search field. |
| `radius-card` | 20px | White cards. |
| `radius-pill` | 999px | Action pills, tags, tab island, Add button. |

| Shadow | Value | Usage |
| --- | --- | --- |
| `shadow-card` | `0 2px 10px rgba(26,26,24,0.05)` | Cards, search field, account button. Always with a 1px `line` border. |
| `shadow-island` | `0 10px 30px rgba(26,26,24,0.10)` | Tab island only. |
| `shadow-note` | `0 1px 1px rgba(26,26,24,0.06), 0 8px 16px -6px rgba(26,26,24,0.18)` | Sticky notes. |

| Size | Value | Usage |
| --- | --- | --- |
| `screen-width` | 390px | Design frame width (iPhone). |
| `control-height` | 48px | Action pills. |
| `field-height` | 50px | Search field. |
| `row-height` | 52px | Minimum to-do row height. |
| `note-height` | 104px | Sticky note height. |
| `island-width` | 300px | Tab island width. |
| `island-height` | 68px | Tab island height. |

## Components

### GreetingHeader

The top of every main screen: a greeting, the screen title and the account button.

- On the left, the greeting sits above the title with a 2px gap. The greeting uses `greeting` in `ink-subtle`, as "<time of day>, <first name>". The title uses `title-xl` in `ink`.
- Time of day: "Good morning" before noon, "Good afternoon" before 5pm, "Good evening" after 5pm, and "Up late" from midnight to 5am.
- On the right is a 44px square account button: `surface`, 1px `line` border, `radius-control`, `shadow-card`, with a 22px person icon in `ink`.
- Detail screens drop the greeting and put a back arrow before the title.

### Search field

White, outlined, magnifier on the right. `field-height`, `radius-field`, `line` border, `shadow-card`.

### ActionPill

A soft grey pill for a screen's main actions, such as Scan and Import on Home.

- Fill `surface-sunken`, no border, no shadow, `radius-pill`, height `control-height`.
- 18px icon, stroke 1.7, in `bronze-icon`. Label uses `button` in `ink`, 8px gap.
- At most two side by side in a 2-column grid with a 12px gap, directly under the search field.
- Never black or filled with a palette color.
- Use `<a>` when it navigates.

### StickyNote

A paper note for a kitchen location, in a 2×2 grid under "Your Kitchen".

- Height `note-height`, width half the grid; gaps 18px vertical, 14px horizontal, plus 6px padding so tilted notes don't clip.
- Paper: `cornsilk` Fridge, `papaya` Pantry, `beige` Freezer, `sage` List. Keep this order.
- Corners `radius-note`, except bottom-right at 14px with a soft fold gradient for the curl.
- Shadow `shadow-note`. Tilts: -2°, 1.5°, 1°, -1.5° in grid order.
- Tape strip (46×17px, white at 65%, rotated -3°) centered on the top edge.
- Name in `note-title` / `note-ink`; count in `note-body` / `note-ink-soft` ("12 items", "3 to buy").
- Optional urgent note on the right ("2 expiring!") in `note-title` weight, `bronze-ink`, with a 2px `bronze` underline. At most one per grid.
- The whole note is one link to the location's screen.
- No icons, badges or numbers in the interface font.

### TodoList

The shared shopping list, shown as a to-do list titled "To Buy".

- **Header.** "To Buy" in `section-title`, then a progress count like "1 of 3 done" in `caption` / `ink-subtle`. "See all" on the right in `link` / `bronze-ink`.
- **Progress bar.** 4px tall, `line-soft` track, `bronze` fill.
- **Card.** White, 1px `line` border, `shadow-card`, `radius-card`, 16px side padding.
- **Rows.** At least `row-height`, separated by `line-soft` dividers. Each row has:
  - a 22px checkbox with `radius-check`, empty with a 1.5px `check-border`, or filled `ink` with an `on-ink` check when done;
  - the item name in `body` / `ink`;
  - a note under it in `micro` / `ink-subtle` ("For Shakshuka", "Added by Sam", "Running low");
  - a location tag on the right in `micro`, `surface-tag`, `radius-pill`.
- **Done.** Name turns `ink-off` with a line through it, note reads "Done", row moves to the bottom.
- **Add row.** Dashed 22px box with a plus, an "Add an item…" input, and a small `ink` "Add" pill that appears only after typing.

### TabIsland

Floating bottom navigation: a white pill with Home, Scan and Recipes.

- `island-width` × `island-height`, centered, `space-6` from the bottom, over scrolling content.
- `surface`, 1px `line` border, `radius-pill`, `shadow-island`, 5px inner padding. Three equal columns.
- Icons only, 26px. Home is filled; Scan and Recipes are stroked at 1.9.
- **Active:** icon in `ink`, with an 18×3px `tab-mark` underscore 5px below.
- **Inactive:** icon in `ink-off`, no underscore.
- Never fill the active tab with a solid or dark pill; never make the island black.
- Each tab has an `aria-label`; the active one has `aria-current="page"`.

## Interaction

- Every kitchen note and "See all" opens its detail screen.
- Checking an item crosses it out, moves it to the bottom and fills the progress bar.
- The greeting changes with the time of day (see GreetingHeader).
- Touch targets are at least 44px.

## Do and don't

- **Do** keep each screen to one search field, up to two actions and two or three sections.
- **Do** left-align titles and section headings.
- **Don't** add black hero cards, gradients, emoji or colored page backgrounds.
- **Don't** put more than one accent on a screen, or color whole buttons with the palette.
- **Don't** fill the active tab with a solid pill; use the grey underscore.

## Checklist for a new screen

1. Is the background `surface` white, with a 20px gutter?
2. Is there a title top left, with a greeting if it's a main tab?
3. Is the only accent Light Bronze, used for fills and `bronze-ink` text?
4. Are buttons soft grey pills, not black?
5. Are paper colors used only on sticky notes?
6. Does the tab island float at the bottom with the underscore on the active tab?
7. Does all small text that matters meet 4.5:1?
8. Does it pass every item in **Avoid the AI look**? A design that fails any item isn't ready.

## Avoid the AI look

Every Cooked screen must pass this list before anyone sees it. These are patterns people now read as "an AI made this." One alone is a warning; two or more means redo that part.

### Color

- No purple-to-blue or pink-to-orange gradient backgrounds.
- No gradient text on headlines.
- No near-black screens with one neon accent.
- No default cream background with a terracotta accent.
- No blurred pastel blobs behind content.
- No glows on cards, buttons or borders.
- No mesh or "aurora" gradients.
- No indigo or violet as a default accent.
- No low-contrast grey-on-grey text that matters.

**Cooked instead:** a white background, ink text, Light Bronze as the only accent, and the four paper colors on sticky notes only.

### Type

- No Inter, Roboto, Arial or Space Grotesk.
- No generic elegant-serif-plus-sans pairing.
- No giant headline with a small grey subhead as a formula.
- No single italic or colored word inside a headline.
- No uppercase, letter-spaced eyebrow labels above sections.
- No everything-centered layouts.
- No ultra-thin weights for big numbers.

**Cooked instead:** Instrument Sans for the interface, Caveat only on sticky notes, left-aligned titles in sentence case.

### Layout

- No hero → logo strip → three feature cards → testimonial → pricing → FAQ template.
- No three-column grid of icon + bold title + two lines of text.
- No bento grids.
- No big-number stat rows with invented figures.
- No 01 / 02 / 03 numbering unless the content really is a sequence.
- No full-height empty heroes.
- No rigid symmetry everywhere; break the grid on purpose (the tilted sticky notes do this).
- No huge empty padding between sections.
- No alternating image-left / image-right zigzag sections.

**Cooked instead:** the screen recipe: header, search, up to two actions, two or three sections, and the tab island.

### Shapes and depth

- No identical radius and shadow on every element.
- No cards with a colored accent bar down the left edge.
- No glassmorphism. The camera screen's dark see-through controls are the one exception, because they sit over a live camera feed.
- No pill badges above a headline ("New", "Beta", "✨ AI").
- No soft shadow on everything.
- No icon in a tinted circle or square on every feature.
- No dotted or grid patterns behind the hero.

**Cooked instead:** cards only to group a list, pills for things you tap, paper notes with tape for the kitchen.

### Icons and imagery

- No emoji as icons, bullets or section markers.
- No sparkle ✨ icon to mean "smart" or "AI".
- No random generic line icons (lightning bolt for "fast", shield for "secure").
- No AI-generated photos.
- No 3D clay or glossy blob illustrations.
- No isometric floating laptops and charts.
- No floating abstract 3D shapes.
- No stock photos of a smiling team at a laptop.
- No fake dashboard screenshots or fake company logo strips.

**Cooked instead:** simple stroked icons that name a real action (scan, link, search), handwritten initials as food placeholders, and real food photos once there are some.

### Buttons and UI

- No solid "Get started" next to a ghost "Learn more" as a formula.
- No gradient or glowing buttons.
- No arrow → on every button.
- No three pricing tiers with a raised "Most popular" middle one.
- No floating chat bubble in the corner.
- No dark-mode toggles or controls that do nothing.
- No sidebar + four KPI tiles + line chart dashboard by default.

**Cooked instead:** soft grey pills with a bronze icon and a clear verb ("Scan", "Import", "Add").

### Motion

- No fade-up animation on every section.
- No typewriter headlines.
- No slowly rotating gradient borders.
- No cursor-following spotlight glows.
- No endless logo marquees.
- No numbers that count up on load.

**Cooked instead:** motion only when something changes, like a checked item sliding to the bottom or a tab switching.

### Copy

- No "Unlock your potential," "Supercharge your…," "The future of … is here."
- Don't use: seamless, effortless, elevate, empower, revolutionize, harness, unleash, game-changing.
- No three-word drumbeats ("Fast. Simple. Powerful.").
- No "Not just X, it's Y."
- No fake testimonials or placeholder stats.
- Don't call things "AI-powered."
- No heavy use of em-dashes.
- No vague feature nouns ("Insights," "Automation") without saying what they do.

**Cooked instead:** plain, specific words about the kitchen: "Use soon," "2 of 6 done," "Added by Sam," "Scan a receipt to stock up."

### The overall test

1. Could this screen belong to a different app if the logo changed? If yes, add something only Cooked would have.
2. Is there exactly one bold element, with everything around it quiet?
3. Is every word specific and real?
4. Did anything from this list sneak in? If so, remove it.
