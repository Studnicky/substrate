---
title: "@studnicky/no-redefined-external-types"
description: "Requires exported local types to reuse or extend direct dependency public types instead of redefining them."
---

# @studnicky/no-redefined-external-types

Requires an exported local `interface` or `type` alias to reuse a public type exported by a direct declared dependency instead of rebuilding the same structural shape. The rule resolves every exact public export subpath declared by each direct dependency in the consumer package manifest, including `/node`, `/browser`, and neutral type subpaths. It compares only the restricted declaration-level shapes it can prove identical, so a local shape with any additional requirement remains valid composition. Private declarations, undeclared or transitive packages, wildcard-only export paths, dependency internals, and public types outside the restricted declaration syntax are outside its scope.

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

## Canonical entity `Type`/`InputType` are exempt as a class

An entity namespace's own `Type` and `InputType` members are never reported, even when they structurally coincide with an unrelated dependency's public type. Their shape is authored by this codebase's own schema, not redefined from a library — the redefinition remedy (import the dependency's type, or extend it) is never correct for one, since importing an unrelated package's type into a schema-derived domain model would trade a coincidental structural match for a real, wrong coupling. This exemption is narrow: it requires the same provable schema-derivation provenance `type-alias-invariants` and `entity-file-shape` require elsewhere (a verified `FromSchema`/`NodeStaticType`/`NodeInputType` reference owning the namespace's own `Schema`/`Node`), not membership in an `*Entity` namespace alone — a hand-written `Type`/`InputType` with no such provenance is still reported.
