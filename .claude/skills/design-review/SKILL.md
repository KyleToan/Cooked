---
name: design-review
description: >-
  Cooked's full UI and UX design review. Runs every relevant design skill installed in this repo
  (taste, Emil Kowalski's design engineering, Apple design, React Native motion review and
  opportunities, worst-case data, plus impeccable and the accessibility and UX-copy reviews when the
  session has them) over real screenshots of the app, checks every finding against Cooked's own
  design system, then fixes what fails and confirms it. Use whenever the owner says "design review"
  (or "/design-review"), optionally naming screens, a feature or a branch; with nothing named, review
  what changed on this branch.
---

# Design review

One command for a whole review of how Cooked looks, reads, moves and holds up. It calls the other
skills as lenses, merges what they find into one list, filters that list through Cooked's own rules,
then fixes and re-checks.

## 0. What wins

Cooked already has a design system, and it outranks every skill below. Read these first, every time:

1. `design/system/README.md`, `design/system/tokens.json`, `design/system/avoid-the-ai-look.md`
   and the component pages in `design/system/components/` for anything the review touches.
2. The design half of `AGENTS.md` (the short version and the new-screen checklist), and `Decisions.md`
   for decisions already made about the screens under review.

A skill finding that contradicts these is dropped, not applied, and listed under "Set aside" in the
report with the rule it broke. Examples: a skill wants a second accent colour, a dark mode, a
gradient, a new type face, centred titles, cards around a list, or motion on load. Never re-deal a
visual style (the taste skill's `draw.mjs`); Cooked's look is decided.

## 1. Scope

- If the owner named screens, a feature, a file or a branch, review exactly that.
- If not, review the screens touched on the current branch: `git diff --stat` against the branch's
  merge base with `main`, mapped to the screens in `design/screens/README.md`.
- Say the scope in one line before starting.

## 2. Capture

Look at the real app, not just the code.

- Run the web preview: `npx expo start --web` (with `CI=1` it doesn't watch files, so restart it after
  every edit). Sign in with any email and the code `481726`, choose **I have an invite** and type
  `rivera-kitchen` for the sample kitchen. Use Playwright with Chromium (`/opt/pw-browsers` in cloud
  sessions) at 390 × 844, device scale 2.
- Screenshot every screen and state in scope: empty, filled, loading, error, a sheet open, a row
  open, after an action (undo bar showing). For error states, the browser's offline mode
  (`context.setOffline(true)`) or a Supabase URL on a closed port makes requests fail.
- Compare with `design/screens/screenshots/` where a designed screenshot exists.
- The web preview is a stand-in for the iPhone. Note what it can't show (keyboard, haptics, the real
  camera, blur, safe areas, VoiceOver) and leave those for a device check rather than guessing.

## 3. Lenses

Invoke each skill with the Skill tool, always passing a specific target and question in `args` (many
of them answer only with a greeting when called without one). Run each lens over the screenshots and
the source together.

| Lens | Skill | What to ask of it |
| --- | --- | --- |
| Taste and tells | `design-taste-frontend` | Its **app-screens** rules and tells (`references/app-screens.md`, `references/tells.md`) applied to the existing screens, and `scripts/inspect.mjs --app` against the web preview URL. Critique only; no draw. |
| Polish and details | `emil-design-eng` | The invisible details: alignment, spacing rhythm, states, feedback, component behaviour. |
| Apple conventions | `apple-design` | iOS expectations: sheets, gestures, springs and interruptibility, materials, type, Reduce Motion, feedback. Translate its web examples to React Native. |
| Motion review | `review-animations` | Every existing animation in scope (Reanimated, layout transitions, sheets, the undo bar, tab island). |
| Expo motion | `animate-expo` | Whether each animation runs on the UI thread, springs versus timing, gesture hand-off, haptics, how it degrades. |
| Missing motion | `find-animation-opportunities` | Where something changes without motion. Keep only what passes Cooked's "motion only when something changes". |
| Worst case | `break-ui` | Long names and units, one-letter names, 0 and huge counts, empty lists, long kitchen names, large text sizes. |
| Critique and audit | `impeccable` (if available) | `critique` and the native `audit` of the screens in scope. |
| Accessibility | `design:accessibility-review` (if available) | Contrast against the 4.5:1 rule, 44pt targets, VoiceOver labels, Dynamic Type. |
| Copy | `design:ux-copy` (if available) | Every string on the screens: plain, specific, sentence case, no words banned in Avoid the AI look. |

Skills that aren't installed in this session are skipped and named in the report. Not lenses for
Cooked's app: `write-swift` (no Swift), `ask-sonner` (web toasts), `pick-ui-library`, `prototype`
(only on request), `animation-vocabulary` (naming only), and the web-only `mobile-native`, `animate`
and `animation-performance`; use those three for the `cooked.app` website instead.

## 4. One list

Merge every lens's findings into one table, most serious first:

| # | Screen | Finding | Lenses | Rule or reason | Fix |

- Merge duplicates (several lenses often see the same thing) and list every lens that found it.
- Check each finding against section 0. Keep it, change the fix to fit the system, or set it aside.
- Severity: **blocking** (breaks a design-system rule, the checklist, accessibility or a flow),
  **should fix** (visibly worse than the system's bar), **nice to have**.

## 5. Fix and confirm

Unless the owner said "report only":

1. Fix every blocking and should-fix item in one batch, following `AGENTS.md`'s UI code rules
   (tokens from `@/theme`, `Text` and `Icon` components, no edits to generated files).
2. Run `npm run typecheck`, `npm run lint` and `npm test`.
3. One confirming round: restart the preview, re-take the same screenshots, re-check each fixed item.
   Fix anything still failing once more, then stop. Don't polish in an open loop.
4. Log the design decisions in `Decisions.md` with a timestamp, and commit with a message that names
   what changed and why.

## 6. Report

Keep it short:

- **Fixed:** the table rows that were fixed, with before and after screenshots where they help.
- **Still open:** nice-to-haves not done, and anything that needs a decision from the owner.
- **Set aside:** skill suggestions that broke Cooked's rules, each with the rule.
- **Needs a device:** what the browser couldn't check.
- **Lenses run:** which skills ran and which weren't available.
