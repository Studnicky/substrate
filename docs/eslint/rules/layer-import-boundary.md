---
title: '@studnicky/layer-import-boundary'
description: 'Enforces a configurable hexagonal-architecture layer allow-matrix on imports.'
---

# @studnicky/layer-import-boundary

Enforces a configurable allow-matrix of which hexagonal-architecture layers may import from which. Given an ordered `layers` list and the `sourceRoot` segment after which a layer name appears in the file path, the rule resolves each file's layer and each import's target layer, then checks the import against `allowedImports` (or a sensible default matrix — `domain` may only import `domain`; `ports` may import `domain`/`ports`; `application` may import `domain`/`ports`/`application`; `adapters` may import `domain`/`ports`/`adapters`; `infrastructure` may import any configured layer). Import targets are resolved both through `aliasPrefixes` (e.g. `@domain/` → `domain`) and by walking relative specifiers against the importing file's path. Bare npm package imports and files outside the configured `sourceRoot`/`layers` tree are never flagged — the rule only governs imports between the architecture's own layers. This rule is typically wired together with [`domain-purity`](./domain-purity), [`adapter-only-import`](./adapter-only-import), and [`known-types-outside-adapters`](./known-types-outside-adapters) via the `HexagonalSuite.create({...})` factory export, since all four share the same `layers`/`sourceRoot` configuration — but it is fully usable and configurable on its own.

**Fixable:** No · **Options:** Yes · **Suggested severity:** `error`

### Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `layers` | `string[]` | *(required)* | Ordered list of enforced layer names, e.g. `["domain", "ports", "application", "adapters", "infrastructure"]`. |
| `sourceRoot` | `string` | *(required)* | Path segment(s) after which the layer name appears, e.g. `"src"`. |
| `aliasPrefixes` | `object` | `undefined` | Map of path-alias prefixes (e.g. `"@domain/"`) to their layer name. |
| `allowedImports` | `object` | `undefined` | Override of the default allow-matrix: source layer name → list of layers it may import from. |

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// domain (/repo/src/domain/user/User.ts) importing from application — forbidden per default matrix
import { Service } from '@application/Service';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// domain (/repo/src/domain/user/User.ts) importing from adapters — forbidden per default matrix
import { Adapter } from '@adapters/FooAdapter';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// relative import from domain resolving into adapters — forbidden, same resolution
// applies whether the specifier is aliased or relative
import { FooAdapter } from '../../adapters/fooAdapter';
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// application importing from domain — allowed per default matrix
import { User } from '@domain/User';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// infrastructure importing from adapters — allowed, infrastructure can import any configured layer
import { Adapter } from '@adapters/FooAdapter';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// bare npm package import — never flagged regardless of source layer
import lodash from 'lodash';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// domain importing from application, but an allowedImports override
// ({ domain: ['domain', 'application'] }) permits this direction — not flagged
import { Service } from '@application/Service';
```
