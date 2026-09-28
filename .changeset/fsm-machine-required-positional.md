---
"@studnicky/fsm": major
---

`EffectInterpreter.create` and `InterpreterHistory.create` take `machine` as a required, non-nullable positional parameter instead of a field inside their options object. Both previously typed `machine` as a required key whose value could still be `undefined`, enforced only by a runtime throw — a required collaborator belongs to the type system, not a runtime check. A caller that omits `machine` now fails to compile instead of throwing `FsmConfigError` at construction; there is no runtime path left to reach that throw, so it is removed along with the `'missing-machine'` test that exercised it. `packages/fsm/tests/unit/types/machine-required.negative.type-check.ts` asserts both `create()` calls fail to compile without `machine`.
