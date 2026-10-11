# Controls

Small controls shared across Cooked. All of them are pills with a 44px or larger tap area.

- **Switch** (Link / Text on Import, Email / Phone in onboarding). A 48px `surface-sunken` track with 2px padding; the picked side is a white 44px pill with a hairline shadow and weight 600 text, the other side `ink-muted`.
- **Filter pills** (Recipes). Drawn 36px tall inside a 44px tap area. Unpicked: `surface-sunken`, `ink-muted`, weight 500. Picked: `sage`, `ink`, weight 600. They scroll sideways and bleed to the screen edge.
- **Stepper.** A 44px `surface-sunken` pill with 44px minus and plus buttons in `sage-ink` around the number (weight 600).
- **Undo bar.** Appears 12px above the island after ticking, removing or using something up. White, 1px `line` border, `shadow-island`, 52px tall, 20px from each side. Plain text on the left ("Bread ticked off"), "Undo" in `sage-ink` weight 600 on the right. It stays until the next action.
- **Fields.** 58px tall, `radius-control`, 1px `line` border with a small label above the value. On focus the border turns `sage-ink`. On error it turns `error-ink` with a one-line message and icon under it.
