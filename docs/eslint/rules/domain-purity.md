---
title: '@studnicky/domain-purity'
description: 'Restricts configured impure imports and calls in a layer resolved as domain.'
---

# @studnicky/domain-purity

Restricts configured impure dependencies in files resolved to the configured domain layer. It reports static and dynamic imports whose specifier equals a `forbiddenImports` entry or starts with that entry followed by `/`. It also reports a call when any suffix of its resolved dotted callee name is in `forbiddenCalls`.

The callee resolver supports identifier/member chains, string-literal bracket access such as `Date['now']()`, and a directly destructured property such as `const { now } = Date; now()`. Files outside the resolved domain layer are out of scope.

The rule is implemented and registered, but this repository deliberately does not enable it. It reports one violation for `BaseError`'s legitimate `Date.now()` timestamp. This rule, [`adapter-only-import`](./adapter-only-import), and [`known-types-outside-adapters`](./known-types-outside-adapters) assume a business-logic core with a conversion boundary. Substrate has neither: it has four utility and infrastructure bands, no domain layer, and no separate intake boundary.

**Fixable:** No · **Options:** Yes · **Suggested severity:** `error`

## Options

Layer resolution uses the same required ordered `bindings`, `layers`, and `sourceRoot` options as [`layer-import-boundary`](./layer-import-boundary). A binding has `kind`, `layer`, and (except for `builtin`) `pattern`; the first applicable binding wins. `folder` and `package` match the path segment after `sourceRoot`; `module` and `dependency` prefix-match import specifiers; and `builtin` matches Node builtins. `allowedImports` is accepted as a shared option but is not consulted by this rule.

| Name | Type | Default | Description |
|---|---|---|---|
| `bindings` | `{ kind, layer, pattern? }[]` | *(required)* | Ordered layer-resolution bindings. |
| `layers` | `string[]` | *(required)* | Configured layer names. |
| `sourceRoot` | `string` | *(required)* | Path segment(s) before the folder/package candidate. |
| `allowedImports` | `Record<string, string[]>` | `undefined` | Shared layer option; unused by this rule. |
| `domainLayerName` | `string` | `"domain"` | Layer where the restriction applies. |
| `forbiddenImports` | `string[]` | `undefined` | Import roots forbidden in that layer. |
| `forbiddenCalls` | `string[]` | `undefined` | Dotted callee names forbidden in that layer. |

## ✗ Incorrect

<!-- inline-ts-ok: conceptual rule example -->
```ts
// A domain-layer file imports a configured forbidden dependency.
import axios from 'axios';
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
// A configured dotted call is forbidden in a domain-layer file.
const timestamp = Date.now();
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
const { now } = Date;
now();
```

## ✓ Correct

<!-- inline-ts-ok: conceptual rule example -->
```ts
// This import is not listed in forbiddenImports.
import { User } from './User.js';
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
// Files resolved outside the domain layer are out of scope.
const timestamp = Date.now();
```
