# Icons

Twenty icons drawn for Cooked, all on one 24px grid with a 1.8 stroke, rounded ends and rounded corners. Use only these in the app.

## The set

| Group | Icons |
| --- | --- |
| Navigation | `home`, `scan`, `recipes`, `back`, `close` |
| Kitchen | `fridge`, `pantry`, `freezer`, `to-buy`, `receipt`, `use-soon` |
| Actions | `import`, `search`, `add`, `check` |
| People | `household`, `account` |
| Loading | `loading`, `syncing`, `cooking` |

## Rules

- **Size:** 24px by default (`icon-md`). Use 18px (`icon-sm`) inside pills and next to captions, with the stroke at 2.
- **Color:** `ink` by default. Use `bronze-icon` inside soft action pills, `ink-off` for inactive tabs and white on the camera screen. Never fill an icon with a palette color.
- **Active tab:** the Home icon may be filled solid when its tab is active; every other icon stays outlined.
- **Labels:** an icon-only button needs an `aria-label` ("Scan", "Back"). Decorative icons next to text are hidden from screen readers.
- **Touch:** an icon button's tap area is at least 44px, even when the icon is 24px.

## Loading icons

- **`loading`:** a quiet arc that turns once every 0.9s. Use it for short waits under about 2 seconds, like opening a list.
- **`syncing`:** two arrows that turn once every 1.6s. Use it next to "Syncing…" when the household's changes are coming in. When finished, show the static icon with "Synced just now".
- **`cooking`:** a pot whose three wisps of steam fade in turn. Use it for longer jobs that read something, like "Reading your receipt…" or "Importing recipe…". Always pair it with a line of text saying what's happening.
- With reduced motion turned on, loaders stay still and the text carries the meaning.
- The uploaded files may show as still images; the motion is specified in this component's preview.
