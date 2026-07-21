---
"@studnicky/errors": major
---

### Changed

- Error code registration is package-internal and exposes no process-global mutation or collision-handler API.
- `HookInvoker.invoke(hookName, fn)` enters hooks synchronously and always returns `undefined`, including for thenable callbacks. `invokeAsync(hookName, fn)` is the only completion-observed API and returns `Promise<void>`. Protected `onHookError(hookName, cause)` returns `void | Promise<void>` and controls failure disposition without fabricating recovery values; timeout, reentrancy, and hook-error semantics remain unchanged.
- `ValidationErrors` instances are constructed through `ValidationErrors.create(items)`.
- `ValidationErrors.create()`, `ValidationErrors.merge()`, and `ValidationErrors.fromValidatorErrors()` provide the collection construction paths.
- Public JSON signatures import `JSONSchema7Type` and `JSONSchema7Object` from `json-schema`, backed by the package's direct `@types/json-schema` dependency.
- `@studnicky/errors` is the sole public code entrypoint and exports `EventRecorder` with the package-owned error contracts.
