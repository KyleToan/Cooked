# AGENTS.md

Rules for any AI agent (Claude Code, Cursor, Copilot, etc.) working in this repo. Read this file, `context.md` and `Decisions.md` before making changes.

## The codebase

**Stack:** React Native with Expo SDK 57, TypeScript, Expo Router. Over-the-air updates through EAS Update. iPhone first; Android builds from the same code.

| Path | What it is |
| --- | --- |
| `src/app/` | Screens. Every file is a route (Expo Router); `_layout.tsx` files are navigators. Only screens go here. |
| `src/components/` | Reusable views. `Text` and `Icon` are the base pieces; build the design system components here. |
| `src/theme/` | The theme. `tokens.ts` and `fonts.ts` are **generated**; import everything from `@/theme`. |
| `scripts/build-tokens.mjs` | Generates `src/theme/tokens.ts`, `src/theme/fonts.ts` and `src/components/icon-data.ts` from `design/system/`. |
| `design/` | The design spec: design system, every screen as a prototype and a screenshot. Read `design/README.md` first. Nothing in it ships. |
| `assets/` | App icon, splash and favicon (Expo placeholders for now). |
| `app.json`, `eas.json` | App config and EAS build and update channels. |
| `.cursor/rules/cooked-design.mdc` | The design rules Cursor loads for every request. |
| `context.md`, `Decisions.md` | What Cooked is, and every decision made. |

### Commands

```bash
npm install                 # install
npm start                   # dev server; scan the QR code with Expo Go on your phone
npm run tokens              # regenerate the theme and icons after design/system changes
npm run typecheck           # TypeScript
npm run lint                # ESLint (eslint-config-expo)
npm run doctor              # expo-doctor: dependency and config checks
npx expo install <package>  # add a package; always use this instead of npm install <package>
```

Run `typecheck` and `lint` before every commit. There are no tests yet.

### Updates and builds (EAS)

- Builds and OTA updates run on EAS: `npx eas-cli@latest build --profile preview` and `npx eas-cli@latest update --channel preview --message "..." --environment preview`.
- Channels: `preview` (internal testers) and `production` (App Store). Always ship an update to `preview` and check it before `production`.
- `runtimeVersion` uses the `fingerprint` policy, so an update only reaches builds with matching native code. Adding or upgrading a package with native code needs a new build, not just an update.
- The EAS project isn't linked yet. The owner runs `npx eas-cli@latest login`, `init` and `update:configure` once, with their own Expo account. Agents don't run these.

### Environment config

None yet. When there is, list the variable names here (never the values) and keep values in EAS environment variables or a git-ignored `.env.local`.

### Expo rules

- Expo changes every SDK. Before using an Expo, EAS or React Native API, check the docs for this SDK (https://docs.expo.dev/versions/v57.0.0/) instead of relying on memory. https://docs.expo.dev/llms.txt indexes them.
- `ios/` and `android/` are generated (Continuous Native Generation) and git-ignored. Never create or edit them; configure native behavior in `app.json` and config plugins.
- Expo Go only includes Expo's bundled native modules. Everything in the app works in Expo Go today; adding a library with other native code means using a development build instead.
- Prefer Expo's own modules over third-party libraries.

### UI code rules

- Import colors, type, space, radius, size and shadow from `@/theme`. Never write a hex value, font name or font size in a component.
- Use `Text` from `@/components/Text` (with a `variant` and `color` token) instead of React Native's `Text`, and `Icon` from `@/components/Icon` for icons.
- Never edit the generated files (`src/theme/tokens.ts`, `src/theme/fonts.ts`, `src/components/icon-data.ts`). Change `design/system/` and run `npm run tokens`.
- Use the system keyboard, share sheet, camera and Sign in with Apple. The prototypes only fake these.

## What you are allowed to do

- Read any file in the repo.
- Create and edit app code, tests and docs on your working branch.
- Run the project's own install, build, lint and test commands.
- Add dependencies when a task needs them. Pin exact versions and say why in the commit message.
- Add an entry to `Decisions.md` whenever you make a product, design or technical decision. Include the timestamp.
- Update `context.md` when the app's scope or state changes.

## What you are not allowed to do

- **Never touch secrets.** Don't read, print, log, copy, commit or change `.env` files, API keys, tokens, passwords, certificates or credentials, and don't hard-code them. If a task needs a secret, stop and ask the owner. Reference secrets only through environment variable names.
- Don't commit `.env`, keys or anything in `.gitignore`.
- Don't push to `main` or force-push to shared branches. Don't rewrite history on branches you didn't create.
- Don't open pull requests, merge, or deploy unless the owner asks.
- Don't delete files, data or branches you didn't create without asking.
- Don't skip, disable or delete tests to make CI pass.
- Don't add analytics, tracking or third-party services that send user data out without asking.
- Don't break the design system rules below. Any UI that uses a pattern from **Avoid the AI look** isn't done.
- Don't invent product decisions silently. If something isn't covered here or in `Decisions.md`, ask, or make the smallest reasonable choice and log it in `Decisions.md`.

## Working style

- Keep changes small and focused on the task.
- Match the surrounding code style.
- Run lint and tests before you commit.
- Write clear commit messages that say what changed and why.

---

# Design system: Cooked

The full system is in `design/system/` (copied from https://claude.ai/artifact/9uaDBLc2WkxCCJrooL3gki). Read these before any UI work, in this order:

1. `design/system/README.md`: the feeling, screen recipe, color roles, type, shape, components, interaction, checklist.
2. `design/system/tokens.json`: every color, type style, space, radius, shadow and size. Use the names, never raw values.
3. `design/system/avoid-the-ai-look.md`: patterns no Cooked screen may use.
4. `design/system/components/<Name>/README.md`: exact spec for each component.

If those files disagree, `README.md` and `tokens.json` win. A few older lines are listed in `design/README.md` under "Where the files disagree".

## The short version

- **White, calm, uncluttered.** `surface` (#FFFFFF) background, 20px side gutter, 24px between sections.
- **Sticky notes are the one playful element.** Fridge (`cornsilk`), Pantry (`papaya`) and Freezer (`beige`) as tilted paper notes with tape and Caveat handwriting.
- **Sage for action.** `sage` (#CCD5AE) fills the one primary button per screen. `sage-ink` (#56663A) for links, icons on grey pills and checked boxes. `progress` (#6F7D45) for progress bars.
- **Bronze for food only.** `bronze` and `bronze-ink` mark food to use soon and nothing else.
- **Red only for errors and destructive text.** `error-ink` (#A33A2B), never as a filled button.
- **Grey secondary pills.** `surface-sunken` (#F4F4F1). No black buttons, cards or island.
- **Type.** Alumni Sans for screen titles (`title-xl` 48px and `title-lg` 36px, bold) and section headings (`section-title` 28px, semibold, no underline). Albert Sans for everything else. Caveat only on sticky notes.
- **Flat lists.** Rows with `line-soft` dividers, not cards.
- **Tab island.** Floating white pill (300 × 68) with Home, Scan and Recipes; a grey underscore marks the active tab.
- **Undo, not confirm.** Ticking off or using up an item shows an undo bar. Deleting an account, leaving a kitchen or removing someone asks first; the safe choice is never the red one.
- **Accessible.** 4.5:1 contrast for text that matters, 44pt minimum tap targets.
- **Icons.** Only the 20 in `design/system/icons/` (24px grid, 1.8 stroke).

## Checklist for a new screen

1. Is the background `surface` white, with a 20px gutter and 24px between sections?
2. Is there a title top left (with the back arrow on the same line on a pushed screen)?
3. Is there exactly one sage button, with everything else grey or a `sage-ink` link?
4. Is bronze only on food that needs using soon?
5. Are paper colors used only on notes and picked tabs or choices?
6. Is every tap target at least 44pt?
7. Can every action that removes something be undone, and does every flow that can fail have an error state?
8. Does all small text that matters meet 4.5:1?
9. Does it pass every item in `design/system/avoid-the-ai-look.md`?
