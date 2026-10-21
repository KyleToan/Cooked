# Claude Code instructions

The shared rules for every coding agent live in AGENTS.md, and the design rules in the Cursor rules file. Both are imported here so Claude Code loads them too.

@AGENTS.md
@.cursor/rules/cooked-design.mdc

## Design review

When the owner says "design review" (with or without naming screens, a feature or a branch), invoke the `design-review` skill in `.claude/skills/design-review/`. It runs every installed UI and UX skill as a lens, checks each finding against the design system above, then fixes and re-checks.
