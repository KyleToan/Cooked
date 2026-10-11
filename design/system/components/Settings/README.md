# Settings

The patterns behind Account, Household and Notifications. Settings are plain lists like the rest of Cooked, grouped under `section-title` headings.

- **Settings row.** At least 56px, `line-soft` divider. Label in `body` on the left; the current value in `ink-muted` on the right, then a 16px chevron in `ink-subtle`. Rows that lead somewhere get a one-line description under the label ("You and Sam · invite, remove, leave").
- **Switch.** iOS-sized track (51 × 31px) inside a 44px tap area. On: `sage-ink` track; off: `#E3E3DE`. White 27px knob. Use `role="switch"` with `aria-checked`. A switch that has a setting (the use-soon time) opens a row under it when on.
- **People row.** 40px initials circle in a paper color (Albert Sans, weight 600, never Caveat), name, and a line saying what they did ("Joined Oct 3 · added 12 things this week"). Remove is a quiet `ink-muted` text button; tapping it opens a confirm sheet ("Remove Sam?") that says what happens to their things, with "Keep Sam" as the sage button and "Remove Sam" as `error-ink` text, and Undo afterwards.
- **Who changed what.** In the kitchen, a row someone else just changed says so in its meta line ("Sam used the last one · 9:40 am"), so nobody is surprised by a missing item.
- **Ending of a settings screen.** A grey "Log out" pill, then "Delete account" as an `error-ink` text button, then the app version in `micro`. Delete opens a sheet: the title asks the question, the body says what is lost and what stays in the shared kitchen, the sage button keeps the account, and the `error-ink` link deletes.
