# Sheet

A panel that slides up from the bottom for a short task (Import) or to explain something that went wrong (a receipt that can't be read).

- White, 28px top corners, 10px top padding with a 40×5px grabber in `#DCDCD6`, 20 to 24px side padding, 36px bottom padding.
- Behind it: the screen it came from, under a 32% `ink` scrim. Tapping the scrim closes the sheet.
- Header: a `title-lg` title on the left and a 36px grey close circle inside a 44px tap area on the right.
- One sage button at the bottom, with at most one `sage-ink` text link under it.
- **Error sheets** say what happened in plain words and give the next step: "Couldn't read this receipt" → Retake photo, Add the items by hand. "No recipe on that page" → Paste the recipe text instead, Try another link. Don't use red for these; the title carries the message.
- While something is loading, show the `cooking` icon with steam that rises and fades, a one-line status ("Picking out the ingredients…") and a Cancel link.
