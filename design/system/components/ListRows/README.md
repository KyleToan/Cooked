# ListRows

The three row types that sit in Cooked's flat lists. Every row is at least `row-height` (56px) with a `line-soft` divider.

**Kitchen row** (Fridge, Pantry, Freezer tabs)
- Name in `body`; a meta line under it in `caption` / `ink-muted` ("Best in 3 days", "Opened in May"). In the Use soon section the meta line is `bronze-ink`, weight 600.
- The amount on the right in `ink-muted` ("1 carton", "About 1 cup"), then a 16px chevron in `ink-subtle`.
- Tapping the row opens it in place: a `sage-ink` text action on the left ("Find a recipe that uses it", "Add to To Buy") and the stepper on the right. The chevron flips up.
- Going to 0 marks it "Used up" and shows the undo bar.

**Check-items row** (after a scan)
- The name is an editable field that looks like plain text; a `sage-ink` underline appears on focus.
- Price and amount under it in `micro` / `ink-muted`.
- On the right, a place tag in the location's paper color (white with a `line` ring for Skip) and a small chevron. Tapping it opens the place picker (Fridge, Pantry, Freezer, Skip as four 44px pills; the picked one has a 1.5px `sage-ink` ring) and the stepper.

**Recipe row** (Recipes)
- Name in 17px weight 600, time on the right in `caption`.
- "You have 6 of 8. Missing tomatoes and feta." in 14px `ink-muted`, then the source in `micro`.
- A 64px photo square on the right only when the imported page had a photo; no photo, no square.
- A grey "Add 2 to To Buy" pill under it when something is missing; it turns into "Added to To Buy" with a `sage-ink` check.
- The row opens the Recipe screen.
