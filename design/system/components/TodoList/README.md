# TodoList

The shared shopping list, titled "To Buy". It looks the same on Home and on the Kitchen To Buy tab.

- **Header.** "To Buy" in `section-title`, then a progress count like "1 of 3 done" in `caption` / `ink-muted`. "See all" on the right in `link` / `sage-ink`, with a 44px hit area. On the Kitchen tab, a one-line helper ("Sam sees this list too…") and a grey Share pill replace See all.
- **Progress bar.** 4px tall, `line-soft` track, `progress` fill.
- **Flat list.** No card. Rows are at least `row-height` (56px) with `line-soft` dividers.
- **Row.** A 24px checkbox (`radius-check`, 1.5px `#B5B5AF` border; checked = `sage-ink` fill with an `on-ink` check) inside a 44px tap area; the name in `body`; a note under it in `micro` / `ink-muted` ("For Shakshuka", "Added by Sam"); the place on the right as plain `caption` / `ink-muted` text.
- **Done.** The name turns `ink-off` with a line through it, the note reads "Got it", and the row drops to the bottom.
- **Undo.** Ticking shows the undo bar ("Bread ticked off · Undo") above the island.
- **Add row.** A dashed 24px box with a `sage-ink` plus and an "Add an item…" input.
