---
"@studnicky/eslint-config": minor
---

New rule `@studnicky/no-double-assertion` disallows a TypeScript assertion chain routed through `unknown` or `any` — `value as unknown as Target`, its `as any as Target` variant, the legacy `<Target>(<unknown>value)` angle-bracket form, and parenthesized combinations of the two. A single-step `as` between types the checker agrees overlap is untouched; the rule only fires when an assertion's own source expression is a second assertion node whose target is the widening keyword.

The rule is registered in `plugin.ts`, documented at `docs/eslint/rules/no-double-assertion.md`, and enabled at `error` in `entityModelSuite`. `grep -rc 'as unknown as' packages/*/src` is 0 workspace-wide, and a full `npx eslint .` passes with the rule live.
