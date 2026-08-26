---
title: '@studnicky/adapter-only-import'
description: 'Restricts configured concrete dependencies to an adapters layer resolved by ordered layer bindings.'
---

# @studnicky/adapter-only-import

Restricts configured third-party dependency roots to one adapters layer. In a file resolved to any other layer, an `ImportDeclaration` whose specifier equals an `adapterOnlyImports` entry or starts with that entry followed by `/` is reported. Files whose paths do not resolve to a layer and files in the configured adapters layer are out of scope.

The rule is implemented and registered, but this repository deliberately does not enable it. `adapter-only-import` reports either 0 or 3 violations depending on which architectural band is called `adapters`; the three are `fetch` importing `undici`, and `fetch` is the adapter that wraps `undici`. This rule, [`domain-purity`](./domain-purity), and [`known-types-outside-adapters`](./known-types-outside-adapters) assume a business-logic core with a conversion boundary. Substrate has neither: it has four utility and infrastructure bands, no domain layer, and no separate intake boundary.

**Fixable:** No · **Options:** Yes · **Suggested severity:** `error`

## Options

The shared layer options resolve the importing file through an ordered `bindings` list. A binding has `kind`, `layer`, and (except for `builtin`) `pattern`; the first applicable match wins. `folder` and `package` match the path segment after `sourceRoot`, while `module` and `dependency` prefix-match import specifiers and `builtin` matches Node builtins. `layers` lists the configured layer names and `sourceRoot` identifies the segment before a folder or package candidate. `allowedImports` is accepted as part of the shared options but is not consulted by this rule.

| Name | Type | Default | Description |
|---|---|---|---|
| `bindings` | `{ kind, layer, pattern? }[]` | *(required)* | Ordered layer-resolution bindings. |
| `layers` | `string[]` | *(required)* | Configured layer names. |
| `sourceRoot` | `string` | *(required)* | Path segment(s) before the folder/package candidate. |
| `allowedImports` | `Record<string, string[]>` | `undefined` | Shared layer option; unused by this rule. |
| `adapterLayerName` | `string` | `"adapters"` | Layer exempt from this restriction. |
| `adapterOnlyImports` | `string[]` | `undefined` | Dependency roots reserved for the adapters layer. |

## ✗ Incorrect

<!-- inline-ts-ok: conceptual rule example -->
```ts
// A file resolved to `domain` imports a configured adapter-only dependency.
import axios from 'axios';
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
// Submodule imports match their configured root.
import { Client } from 'pg/lib/client';
```

## ✓ Correct

<!-- inline-ts-ok: conceptual rule example -->
```ts
// A file resolved to the configured adapters layer is exempt.
import axios from 'axios';
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
// Imports outside adapterOnlyImports are not reported by this rule.
import { User } from './User.js';
```
