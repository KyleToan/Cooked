# Cooked

Cooked is a shared kitchen app: scan a receipt to stock your fridge, pantry and freezer, import recipes, and keep one shopping list with the people you live with. This system is drawn from the approved app screens and is the reference for every new Cooked screen.

**Read this first, every time.** Before designing any Cooked screen, check it against the rules below and use the tokens by name. Then check it against **Avoid the AI look**, the next section of this system. No Cooked design may use anything on that list.

## The feeling

- **Calm, white and uncluttered.** The ground is pure white. Show a few things clearly and leave the rest out. If a section isn't needed right now, don't add it.
- **Warm, homemade touches.** The kitchen is shown as sticky notes on a fridge door: tilted paper, tape and handwriting. This is the one playful element; everything around it stays quiet.
- **Sage for action, bronze for food.** Sage is the one action color: the main button, links and checked boxes. Bronze only marks food that needs using soon. Everything else is ink and soft greys.
- **Shared, not solo.** Small touches show other people: "Added by Sam" on a row, a household button, a greeting with the person's name.

## Screen recipe

Every main screen follows the same skeleton, top to bottom, with a 20px side gutter (`space-5`) and 24px between sections (`space-section`):

1. **Header.** Home has a top bar: a round grey Scan button on the left, **Cooked** (`title-xl`) centred with the time-of-day greeting (`greeting`, `ink-muted`) under it, and the round account button on the right. Kitchen and Recipes put a status line (`greeting`, `ink-muted`) above a `title-xl` title top left, with the round account button on the right. On a pushed screen (Recipe, Account, Check items), the back arrow and a `title-lg` title share one line.
2. **Search.** One white field (`radius-field`, 1px `line` border, no shadow) with the magnifier on the right.
3. **Actions.** At most one sage primary pill per screen, plus one grey secondary pill beside it if needed. Icons in pills use `sage-ink` on grey and `ink` on sage.
4. **Content sections.** Each has a left-aligned `section-title`, an optional `caption` meta line or progress count, and an optional `link` on the right in `sage-ink`. Lists are plain rows with `line-soft` dividers, not cards.
5. **Tab island.** A floating white pill at the bottom center (`island-width` × `island-height`, `shadow-island`, 28px from the bottom). Give the scroll area about 130px of bottom padding. Screens with a sticky bottom button (Check items, Recipe) don't show the island.

## Color

| Role | Token | Use |
| --- | --- | --- |
| Ground | `surface` | Every screen background |
| Lines | `line`, `line-soft`, `control-line` | `line` for the island, undo bar and quiet outlines; `line-soft` for row dividers; `control-line` (3.4:1) for the outline of anything you fill in or tick |
| Text | `ink`, `ink-muted`, `ink-subtle` | Primary, secondary, placeholder |
| Action | `sage` (button fill), `sage-ink` (links, icons, checked box), `progress` (bar) | The one action color |
| Use soon | `bronze-ink`, `bronze` | Food that needs using soon, nothing else |
| Error | `error-ink` | A wrong code or an unusable field |
| Paper | `cornsilk`, `papaya`, `beige`, `sage` | Sticky notes, the picked Fridge, Pantry or Freezer tab, picked choices and initials avatars. The picked To Buy tab is white with a `sage-ink` ring, so a sage fill always means the main button. |

Rules:
- **One sage button per screen.** Every other button is a grey `surface-sunken` pill or a `sage-ink` text link.
- Use the paper colors for sticky notes, the picked Kitchen tab, picked choices and people's initials avatars. Never as page backgrounds.
- Text fields, the search field, unchecked checkboxes, radios and the dashed add box are outlined in `control-line` so they reach the 3:1 non-text contrast minimum. Focus is a 1.5pt `sage-ink` outline; an error is `error-ink`.
- Bronze means "use this soon". Never use it for links, buttons or progress.
- No black buttons, black cards or a black island.
- **Destructive actions** (Delete account, Leave this kitchen, Remove someone) are `error-ink` text buttons, never filled. The sheet that confirms them makes the safe choice the sage button (“Keep my account”) and says what happens to the shared kitchen.
- `ink-subtle` and `ink-off` are flagged for low contrast. Use them only for placeholders and crossed-out items.

## Type

Two families, used the way the Impeccable website uses them: a tall, light, condensed face for titles and a plain, friendly sans for everything you read or tap.

- **Alumni Sans** (`display`) for screen titles and section headings only, always **large**. Titles are **bold** (700): `title-xl` 48px for the screen title and `title-lg` 36px for onboarding questions and detail screens. Section headings are **semibold** (600), never underlined: `section-title` 28px. Never go below 24px, and never use it for buttons, labels or body text.
- **Albert Sans** (`sans`) for everything else: the greeting, body text (16px), buttons (15px, medium), links (14px, semibold), captions (13px) and tags (12px).
- **Caveat** (`hand`) only on sticky notes: `note-title` for the name and `note-body` for the count. Never use the handwritten face for buttons, lists or headings.
- Each screen has one display title. Pair a big bold Alumni title with Albert text close beneath it, like the Impeccable hero.
- Write in sentence case. Keep it short and friendly: "To Buy", "Your Kitchen", "Add an item…".

## Shape and depth

- **Pills** (`radius-pill`) for anything you tap that isn't a row: buttons, filter pills, the switch, steppers, the island and the undo bar.
- **Lists are flat.** Rows sit on white with `line-soft` dividers. Don't wrap lists or sections in cards.
- **Sheets** slide up from the bottom with 28px top corners and a 40×5px grabber, over a 32% ink scrim.
- **Sticky notes** have nearly square corners (`radius-note`) with a curled bottom-right corner, `shadow-note`, a slight tilt between -2° and 2°, and a strip of tape.
- **Tap targets** are at least `target-min` (44px). A 24px checkbox or 36px pill keeps its drawn size inside a 44px hit area.

## Components

- **Greeting header** — greeting or status line, the title, and the account button.
- **Search field** — white, outlined, magnifier on the right.
- **Action pill** — the sage primary and the grey secondary.
- **Sticky note** — Fridge, Pantry and Freezer as three notes on Home, plus the empty-kitchen note and the Tonight recipe note.
- **To-do list** — the To Buy list: progress, 24px checkboxes in `sage-ink`, a note under each item, the place as plain text, and an add row.
- **List rows** — the Kitchen row that opens to a stepper, the Check-items row with its place picker, and the Recipe row.
- **Controls** — the Link/Text switch, filter pills, the stepper and the undo bar.
- **Sheet** — the Import sheet and error sheets such as “Couldn’t read this receipt”.
- **Settings** — settings rows with a value and chevron, the switch, people rows, and the Log out / Delete account ending used on Account, Household and Notifications.
- **Tab island** — Home, Kitchen (fridge icon) and Recipes with icons and labels; an `ink-muted` underscore slides under the active tab, and each tab dips slightly when pressed.
- **Icons** — 22 icons drawn for Cooked on one 24px grid with a 1.8 stroke, including three loading icons (`loading`, `syncing`, `cooking`). Use only these in the app; the Icons group under Assets holds the files.

Each component's page has its exact spec and a live preview.

## Interaction

- Every kitchen note and “See all” opens its detail screen. Every recipe row opens the Recipe screen.
- Ticking a To Buy item crosses it out, moves it to the bottom, fills the progress bar and shows an undo bar above the island. Using up a kitchen item shows the same undo bar.
- A Kitchen row opens in place to show a stepper; a chevron shows that it can.
- Every flow that can fail has an error screen: a receipt that can't be read, a page with no recipe, a wrong code. Each one says what happened and offers the next step.
- The greeting changes with the time of day: “Good morning” until noon, “Good afternoon” until 5pm, “Good evening” after that, and “Up late” from midnight to 5am.
- Touch targets are at least 44px.

## Do and don't

- **Do** keep each screen to one search field, one sage button and two or three sections.
- **Do** left-align titles and section headings, with at least 24px between a bold title and the first section title.
- **Don't** add black hero cards, gradients, emoji or colored page backgrounds.
- **Don't** put two sage buttons on one screen, or use bronze for anything but food to use soon.
- **Don't** fill the active tab with a solid pill; use the grey underscore.

## Checklist for a new screen

1. Is the ground `surface` white, with a 20px gutter and 24px between sections?
2. Is there a title top left (with the back arrow on the same line on a pushed screen)?
3. Is there exactly one sage button, with everything else grey or a `sage-ink` link?
4. Is bronze only on food that needs using soon?
5. Are paper colors used only on notes, picked tabs or choices, and initials avatars?
6. Is every tap target at least 44px?
7. Can every action that removes something be undone, and does every flow that can fail have an error state?
8. Does all small text that matters meet 4.5:1?
9. Does it pass every item in **Avoid the AI look**? A design that fails any item isn't ready.
