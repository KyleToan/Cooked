# AGENTS.md

Rules for any AI agent (Claude Code, Cursor, Copilot, etc.) working in this repo. Read this file, `context.md` and `Decisions.md` before making changes.

## The codebase

The repo has no app code yet. When code is added, update this section with:

- Tech stack and framework
- Folder layout (what lives where)
- How to install, run, lint and test
- Where environment config lives (names only, never values)

What's here now:

| Path | What it is |
| --- | --- |
| `design/` | The design spec: design system, every screen as a prototype and a screenshot. Read `design/README.md` first. Nothing in it ships in the app. |
| `.cursor/rules/cooked-design.mdc` | The design rules Cursor loads for every request. |
| `context.md` | What Cooked is and what's been designed. |
| `Decisions.md` | Every product, design and technical decision. |

Until there's code, the source of truth for the app is `design/` and `context.md`.

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
