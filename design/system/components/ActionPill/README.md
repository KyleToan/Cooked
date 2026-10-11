# ActionPill

The two button styles in Cooked: one sage primary per screen, and a grey secondary for everything else.

- **Primary.** Fill `sage`, label in `ink` using `button` at weight 600, icon 18px in `ink`. One per screen: Scan a receipt on Home, Cook this on Recipes, the bottom button on a pushed screen.
- **Secondary.** Fill `surface-sunken`, label in `ink` at weight 500, icon 18px stroked in `sage-ink`. Import on Home and Recipes, Share, Paste from clipboard.
- Both use `radius-pill` and `control-height` (48px) on Home, 44px in headers, and 52px full width at the bottom of a screen. No border, no shadow.
- A pill drawn shorter than 44px keeps a 44px hit area.
- Never black, never two sage buttons on one screen, and never a bronze button.
- Use `<a>` when the pill navigates, `<button>` when it acts in place.
