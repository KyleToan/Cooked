# Design

Everything an agent or developer needs to build Cooked's screens. Nothing in this folder ships in the app. It's the spec.

| Folder | What's in it | Source |
| --- | --- | --- |
| `system/` | The design system: rules, tokens, components, icons | [Cooked design system](https://claude.ai/artifact/9uaDBLc2WkxCCJrooL3gki) |
| `screens/prototypes/` | Every screen as a clickable prototype (`.dc.html`) plus `canvas.json` | [Cooked canvas](https://claude.ai/artifact/4Y3vzFjNNfX7kS88MV3mGV) |
| `screens/screenshots/` | A 2× PNG of every screen and its key states | Rendered from the prototypes |
| `screens/README.md` | Index of every screen: what it does, its states, where it goes | Written for this repo |

Copied on 2026-10-11 from canvas version `1791726063-ccfe` and design system version `1791726067-9b5c`. If the links and this folder disagree, the links win. Copy the files again when the design changes.

## How to use it

1. **Tokens first.** `system/tokens.json` holds every color, type style, space, radius, shadow and size. Turn it into one theme file in the app and use only those names. Never hard-code a hex value or a font size in a view.
2. **Rules second.** `system/README.md` is the source of truth for how screens are put together (screen recipe, color roles, type, shape, interaction, checklist). `system/avoid-the-ai-look.md` lists what no screen may use.
3. **Components third.** Build each of `system/components/*` (README + `preview.html`) as a reusable view before building screens.
4. **Screens last.** Build one screen at a time from `screens/`. Look at the screenshot for the picture, and read the `.dc.html` for exact values, copy, states and behavior.

## Reading a `.dc.html` prototype

They're HTML with a small template layer. They don't run outside the design canvas (they load `support.js`, which isn't included), so read them as source, and use the screenshots to see them.

- `<div style="...">` holds exact sizes, colors and spacing. Map each value back to a token name; they all come from `tokens.json`.
- `{{name}}` is a value computed in the `<script type="text/x-dc">` block at the bottom, in `renderVals()`.
- `<sc-for list="{{items}}" as="it">` repeats for each item. `<sc-if value="{{x}}">` shows only when `x` is true.
- `<dc-import name="CookedIsland" active="home">` places another prototype as a component, with props.
- `data-props` on the script tag lists the screen's props (for example `tab`, `flow`, `step`, `state`). Each one is a state the real screen needs.
- `this.state` and `setState` show what changes when you tap.
- `href="Other.dc.html"` is navigation to that screen.
- The sample data (Alex, Sam, Rivera kitchen, the items) is the copy to use in previews and tests.

## Things the prototypes fake

Build these with the real platform feature, not by copying the prototype:

- **Keyboard.** `CookedKeyboard.dc.html` only exists because a picture can't show the system keyboard. Use the system keyboard with the right type: email, number pad, one-time code (`textContentType = .oneTimeCode` on iOS, so "From Mail 481726" appears).
- **Status bar, home indicator, safe areas.** Use the system ones.
- **Camera.** The dark scan screen stands in for a live camera feed.
- **Share sheet.** "Share invite link" opens the system share sheet.
- **Sign in with Apple and Google.** Use the official buttons and SDKs.
- **Greeting.** Computed from the device clock: "Up late" before 5am, "Good morning" before noon, "Good afternoon" before 5pm, "Good evening" after.

## Where the files disagree

A few lines in the design system weren't updated when sage replaced bronze as the action color and Alumni Sans + Albert Sans replaced Instrument Sans. **`system/README.md` and `system/tokens.json` win** over these:

| File | Stale line | Use instead |
| --- | --- | --- |
| `system/avoid-the-ai-look.md` | "Cooked instead" lines that say Light Bronze is the only accent, Instrument Sans for the interface, and grey pills with a bronze icon | Sage for actions, bronze only for food to use soon; Alumni Sans titles + Albert Sans text; grey pills with a `sage-ink` icon |
| `system/components/GreetingHeader/README.md` | Greeting in `ink-subtle`; account button with `shadow-card` | Greeting in `ink-muted`; account button with a 1px `line` border and no shadow (as in `AppHome.dc.html`) |
| `system/components/Icons/README.md` and `Icons/preview.html` | `bronze-icon` inside soft action pills | `sage-ink` on grey pills, `ink` on the sage pill. `bronze-icon` is no longer a token |

Every **don't** in `avoid-the-ai-look.md` still applies.
