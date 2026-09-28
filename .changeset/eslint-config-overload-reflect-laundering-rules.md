---
"@studnicky/eslint-config": minor
---

`packages/eslint-config` gains two type-aware rules that catch a cast expressed in other syntax. `no-unchecked-overload-implementation` reports an overloaded function or method whose implementation signature the checker cannot prove satisfies every declared overload — TypeScript relates an overload set to its implementation loosely, so an overload can promise a return or parameter type the implementation never actually produces or accepts, and the compiler stays silent. `no-reflect-argument-laundering` reports `Reflect.apply`/`Reflect.construct` called with an argument list the target's real signature does not accept, and reports the call's `any`-typed result flowing anywhere but an `unknown`-typed binding, parameter, or return. Neither rule is wired into the shared config yet.
