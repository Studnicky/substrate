---
title: '@studnicky/domain-purity'
description: 'Forbids impure imports and non-deterministic calls inside the domain layer of a hexagonal architecture.'
---

# @studnicky/domain-purity

Forbids configurably-listed impure imports and non-deterministic calls inside files resolved to the domain layer of a hexagonal architecture. The domain layer is meant to hold pure business logic: no I/O, no wall-clock or random-number dependence, nothing that would make the same inputs produce different outputs across runs. The rule resolves each file's layer the same way [`layer-import-boundary`](./layer-import-boundary) does (via `layers`/`sourceRoot`/`aliasPrefixes`), then — for files in the domain layer (configurable via `domainLayerName`, default `"domain"`) — reports any import whose specifier matches (or is a submodule of) an entry in `forbiddenImports`, and any dotted call expression (`Identifier` or `Identifier.Identifier` form) matching an entry in `forbiddenCalls`. Files outside the domain layer are never checked. This rule is typically wired together with [`layer-import-boundary`](./layer-import-boundary), [`adapter-only-import`](./adapter-only-import), and [`known-types-outside-adapters`](./known-types-outside-adapters) via the `HexagonalSuite.create({...})` factory export, since all four share the same `layers`/`sourceRoot` configuration — but it is fully usable and configurable on its own.

**Fixable:** No · **Options:** Yes · **Suggested severity:** `error`

### Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `layers` | `string[]` | *(required)* | Ordered list of enforced layer names, e.g. `["domain", "ports", "application", "adapters", "infrastructure"]`. |
| `sourceRoot` | `string` | *(required)* | Path segment(s) after which the layer name appears, e.g. `"src"`. |
| `aliasPrefixes` | `object` | `undefined` | Map of path-alias prefixes (e.g. `"@domain/"`) to their layer name. |
| `allowedImports` | `object` | `undefined` | Override of the default allow-matrix: source layer name → list of layers it may import from. |
| `domainLayerName` | `string` | `"domain"` | Name of the layer treated as the pure-data domain layer, e.g. `"domain"` or `"entities"`. |
| `forbiddenImports` | `string[]` | `undefined` | Bare import specifiers or roots forbidden in domain-layer files, e.g. `["fs", "axios", "node:fs"]`. |
| `forbiddenCalls` | `string[]` | `undefined` | Dotted call expressions forbidden in domain-layer files, e.g. `["Date.now", "Math.random"]`. |

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// domain-layer file (/repo/src/domain/user/User.ts) importing a forbidden import — flagged
import axios from 'axios';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// domain-layer file calling a forbidden non-deterministic call — flagged
const timestamp = Date.now();
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// domain-layer file importing a submodule of a forbidden root — flagged via prefix match
import promises from 'node:fs/promises';
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// domain-layer file importing something not in forbiddenImports — not flagged
import { User } from './User.js';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// non-domain-layer file (/repo/src/application/UserService.ts) importing a
// forbidden import — not flagged, the rule only applies inside the domain layer
import axios from 'axios';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// domain-layer file calling something not in forbiddenCalls — not flagged
const id = crypto.randomUUID();
```
