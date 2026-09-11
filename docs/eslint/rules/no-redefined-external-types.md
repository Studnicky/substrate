---
title: "@studnicky/no-redefined-external-types"
description: "Requires exported local types to reuse or extend direct dependency public types instead of redefining them."
---

# @studnicky/no-redefined-external-types

Requires an exported local `interface` or `type` alias to reuse a public type exported by a direct declared dependency instead of rebuilding the same structural shape. The rule resolves only package names declared in the consumer package manifest and only their package-root public type exports. It compares only the restricted declaration-level shapes it can prove identical, so a local shape with any additional requirement remains valid composition. Private declarations, undeclared or transitive packages, dependency internals, and public types outside the restricted declaration syntax are outside its scope.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// @example/contracts exports RequestOptions with retries and timeoutMs.
export interface LocalRequestOptions {
  readonly retries: number;
  readonly timeoutMs: number;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// @example/contracts exports Result with value.
export type LocalResult = {
  readonly value: string;
};
```

The rule resolves public exports from direct dependencies declared in the package manifest; an import is not required for it to detect that the local declarations duplicate `RequestOptions` and `Result`.

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
import type { RequestOptions } from "@example/contracts";

export interface AuditedRequestOptions extends RequestOptions {
  readonly auditLabel: string;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
import type { Result } from "@example/contracts";

export type LocalResult = Result;
```

Use the dependency type directly when no local contract is needed, or compose it into a strictly larger shape when the consumer owns additional requirements.
