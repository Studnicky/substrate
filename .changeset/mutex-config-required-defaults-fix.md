---
"@studnicky/mutex": major
---

`MutexConfigEntity`'s schema listed `enableCoalescing`, `maximumQueueSize`, and `timeout` as `required` despite every one carrying a `default` — a self-contradictory pair, since `required` means validation rejects a payload where a default would otherwise apply. None of the three is required now; `MutexConfigEntity.create()`/`intake()` still fill their declared defaults, and `MutexCreateOptionsInterface` drops the `Partial<>` wrapper it used to compensate for the defect, since `MutexConfigEntity.InputType` is genuinely optional on its own.

Breaking: `MutexConfigEntity.validate()` is a structural predicate with no default-filling. It previously rejected a payload missing any of the three fields; it now accepts one. No call site in this codebase calls `validate()` on this entity directly, so nothing here changes behavior, but external code that validates untrusted mutex configuration and relies on all three fields being present afterward must fill defaults itself or call `intake()`/`create()` instead.
