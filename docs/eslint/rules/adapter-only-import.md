---
title: '@studnicky/adapter-only-import'
description: 'Restricts concrete third-party dependencies to the adapters layer of a hexagonal architecture.'
---

# @studnicky/adapter-only-import

Restricts a configurable list of concrete third-party dependencies — HTTP frameworks, database drivers, external API clients — to the adapters layer of a hexagonal architecture. Business logic in domain, application, ports, or even infrastructure files should depend on a port/interface, not directly on a specific library; only the adapters layer (configurable via `adapterLayerName`, default `"adapters"`) is exempt. The rule resolves each file's layer the same way [`layer-import-boundary`](./layer-import-boundary) does (via `layers`/`sourceRoot`), then reports any import whose specifier matches (or is a submodule of) an entry in `adapterOnlyImports`. Files outside the configured layer tree are never checked; notably, infrastructure — which can otherwise import any configured layer — is still bound by this restriction, since infrastructure bootstrap code should still route concrete dependencies through adapters. This rule is typically wired together with [`layer-import-boundary`](./layer-import-boundary), [`domain-purity`](./domain-purity), and [`known-types-outside-adapters`](./known-types-outside-adapters) via the `HexagonalSuite.create({...})` factory export, since all four share the same `layers`/`sourceRoot` configuration — but it is fully usable and configurable on its own.

**Fixable:** No · **Options:** Yes · **Suggested severity:** `error`

### Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `layers` | `string[]` | *(required)* | Ordered list of enforced layer names, e.g. `["domain", "ports", "application", "adapters", "infrastructure"]`. |
| `sourceRoot` | `string` | *(required)* | Path segment(s) after which the layer name appears, e.g. `"src"`. |
| `aliasPrefixes` | `object` | `undefined` | Map of path-alias prefixes (e.g. `"@domain/"`) to their layer name. |
| `allowedImports` | `object` | `undefined` | Override of the default allow-matrix: source layer name → list of layers it may import from. |
| `adapterLayerName` | `string` | `"adapters"` | Name of the layer treated as the adapters layer for exemption purposes. |
| `adapterOnlyImports` | `string[]` | `undefined` | Package names/roots restricted to the adapters layer, e.g. `["express", "pg", "axios"]`. |

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// domain-layer file (/repo/src/domain/user/User.ts) importing an
// adapter-only package directly — forbidden
import axios from 'axios';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// application-layer file importing an adapter-only package — forbidden
import axios from 'axios';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// infrastructure-layer file importing an adapter-only package — forbidden,
// despite infrastructure otherwise being able to import any configured layer
import axios from 'axios';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// domain-layer file importing a submodule of an adapter-only root — forbidden,
// exercises prefix match against adapterOnlyImports
import { Client } from 'pg/lib/client';
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// adapters-layer file (/repo/src/adapters/HttpAdapter.ts) importing an
// adapter-only package — allowed, adapters are exempt
import axios from 'axios';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// domain-layer file importing something not in adapterOnlyImports — not flagged
import { User } from './User';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// file outside the configured layer tree (/repo/scripts/build.ts) — out of scope
import axios from 'axios';
```
