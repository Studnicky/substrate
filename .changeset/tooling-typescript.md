---
"@studnicky/eslint-config": minor
---

Rule evidence — the benchmarks, bytecode readings and selector surveys behind each rule — lives on the rule's page under `docs/eslint/rules` rather than in the rule source, which keeps a short pointer. `check-rule-docs` already fails on a rule without a page, so the pairing stays enforced.

`prototype-modification`'s documentation states what the rule matches and why. `Reflect.set` and `Reflect.setPrototypeOf` are matched by callee shape; `CallIdentity.ownerNameOf` resolves a namespace-declared member's owner, so that remains a migration the rule has not taken rather than a capability it lacks.
