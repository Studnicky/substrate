---
"@studnicky/types": major
"@studnicky/errors": major
---

`BaseError` lives in `@studnicky/types`, the dependency-free root package, so `@studnicky/entity` and `@studnicky/types` can throw `BaseError` subclasses. Import it from `@studnicky/types/node` or `@studnicky/types/browser`, alongside `BaseErrorArgumentsInterface`, `ProblemDetailsInterface`, `CauseNodeInterface`, `ThrownValueInterface`, `ThrownValueProjection`, and the `CAUSE_*` and `PROBLEM_TYPE_*`/`PROBLEM_TITLE_*` constants. `@studnicky/errors` builds `ModuleError`, `RuntimeError`, `ValidationError`, and the rest of its hierarchy on `BaseError` and does not export it. `BaseError.toJSON()` output is unchanged.
