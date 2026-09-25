---
"@studnicky/eslint-config": minor
---

New rule `@studnicky/no-double-assertion` disallows a TypeScript assertion chain routed through `unknown` or `any` — `value as unknown as Target`, its `as any as Target` variant, the legacy `<Target>(<unknown>value)` angle-bracket form, and parenthesized combinations of the two. A single-step `as` between types the checker agrees overlap is untouched; the rule only fires when an assertion's own source expression is a second assertion node whose target is the widening keyword.

The rule is registered in `plugin.ts` and documented at `docs/eslint/rules/no-double-assertion.md`, but is not enabled in any suite — it ships unwired. `packages/entity` still carries the pattern this rule targets in three files queued to a separate workstream; enabling the rule at `error` before that lands would fail immediately in a package this change does not touch.
