# StickyNote

Paper notes are Cooked's one playful element. They show the kitchen on Home, the empty kitchen, and tonight's recipe.

- **Kitchen row (Home).** Three notes side by side: Fridge (`cornsilk`), Pantry (`papaya`), Freezer (`beige`), in that order. `note-height` (116px), 12px gaps. Tilts -2.5°, 1.5° and -1°. To Buy is a list below, not a note.
- **Big note.** Full width for the empty kitchen ("Nothing here yet") and the Tonight recipe on Recipes. Tilt about -1°, a 52px strip of tape, and room for one sage button inside.
- Corners use `radius-note`, except the bottom-right at 14px for the curl. Shadow `shadow-note`. Keep every tilt between -2.5° and 2.5°.
- Tape: white at 65%, rotated -3°, centered on the top edge.
- The name uses `note-title` in `note-ink`; the count uses `note-body` in `note-ink-soft`.
- **Use soon flag.** "2 use soon" in `note-title` weight, `bronze-ink`, with a 2px `bronze` underline. At most one per row of notes.
- A kitchen note is one link to that location's tab in Kitchen.
- Handwriting (Caveat) appears only on notes. People's initials and labels elsewhere use Albert Sans.
