---
"@studnicky/eslint-config": major
---

`no-unchecked-overload-implementation` and `no-reflect-argument-laundering` are registered in `LayerBoundarySuite` and turned on at `error` in this repo's own `eslint.config.ts`. A consumer with an overload set the implementation does not provably satisfy, or a `Reflect.apply`/`Reflect.construct` call laundering mismatched arguments or an unguarded `any` result, now fails lint.
