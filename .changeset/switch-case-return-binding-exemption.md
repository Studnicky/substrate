---
"@studnicky/eslint-config": patch
---

`@studnicky/explicit-return-binding` exempts a `return` that is a direct statement of a `SwitchCase`'s consequent. `@studnicky/v8/switch-statements` requires that exact position to stay a single unbraced statement, and wrapping it in a block to add a `const` binding is itself a violation of that rule — the two rules could not both be satisfied for a delegating switch case (`case 'start': return initialize();`, the documented `switch-statements` correct example) before this change. A `return` nested one level deeper inside the case — inside an `if`, a block, or any other statement — is still reported.
