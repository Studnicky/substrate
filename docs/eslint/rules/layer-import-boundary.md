---
title: '@studnicky/layer-import-boundary'
description: 'Enforces an allow-matrix for layers resolved from ordered bindings.'
---

# @studnicky/layer-import-boundary

Enforces an import allow-matrix for any architecture that can resolve files and import specifiers to named layers. It is not limited to a hexagonal `src/domain` layout: substrate enables it for its package dependency bands.

**Fixable:** No · **Options:** Yes · **Suggested severity:** `error`

## Resolution bindings

`bindings` is a required ordered list of `{ kind, layer, pattern }`. The first matching binding for the resolution in progress wins. A binding whose `layer` is not listed in `layers` does not resolve. There is no alias-prefix option or implicit folder fallback.

| `kind` | Resolves | Matching rule |
|---|---|---|
| `folder` | A folder after `sourceRoot` | Exact path-segment match on `pattern` |
| `package` | A workspace package directory after `sourceRoot` | Exact path-segment match on `pattern` |
| `module` | An internal module specifier | Specifier starts with `pattern` |
| `dependency` | An external dependency specifier | Specifier starts with `pattern` |
| `builtin` | Node builtins | `node:module` builtin detection; `pattern` is unused |

For file paths, only `folder` and `package` bindings participate. For imports, `module`, `dependency`, and `builtin` bindings are tried against the specifier first; a relative specifier that remains unresolved is resolved from its target path using the folder/package bindings. An unbound import or file is outside the rule's scope.

`layers`, `sourceRoot`, and `bindings` are required. `allowedImports` optionally overrides the allowed target layers for each source layer. Without an override, the layer order follows the canonical five-role matrix: domain may import domain; ports may import domain and ports; application may import domain, ports, and application; adapters may import domain, ports, and adapters; infrastructure may import every configured layer. Imports within the same layer are always allowed.

## Substrate configuration

`eslint.config.mjs` enables this rule for published package source files. Its `SUBSTRATE_LAYERS` configuration has the ordered bands `foundation`, `primitive`, `capability`, and `coordinator`; it uses explicit `allowedImports` so each band can import itself and every lower band.

The configuration uses `package` bindings such as `{ kind: 'package', layer: 'foundation', pattern: 'errors' }` to resolve source files under `packages/errors/src`, and `module` bindings such as `{ kind: 'module', layer: 'foundation', pattern: '@studnicky/errors' }` to resolve cross-package imports. This models substrate's dependency depth rather than a borrowed hexagonal vocabulary.

## Example configuration

```js
{
  '@studnicky/layer-import-boundary': ['error', {
    layers: ['foundation', 'capability'],
    sourceRoot: 'packages',
    bindings: [
      { kind: 'package', layer: 'foundation', pattern: 'errors' },
      { kind: 'package', layer: 'capability', pattern: 'fetch' },
      { kind: 'module', layer: 'foundation', pattern: '@studnicky/errors' },
      { kind: 'module', layer: 'capability', pattern: '@studnicky/fetch' },
      { kind: 'builtin', layer: 'foundation' }
    ],
    allowedImports: {
      foundation: ['foundation'],
      capability: ['foundation', 'capability']
    }
  }]
}
```

With that configuration, a source file in `packages/errors/src` may import `@studnicky/errors` but not `@studnicky/fetch`; a file in `packages/fetch/src` may import either. A binding placed before the builtin binding can bind a specific `node:` specifier differently.

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /repo/src/domain/user/User.ts
import { Service } from '@application/Service';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /repo/src/domain/user/User.ts
import { Adapter } from '@adapters/FooAdapter';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /repo/src/domain/user/User.ts
import { FooAdapter } from '../../adapters/fooAdapter';
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /repo/src/application/UserService.ts
import { User } from '@domain/User';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /repo/src/adapters/FooAdapter.ts
import { Port } from '@ports/Port';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /repo/src/infrastructure/Bootstrap.ts
import { Adapter } from '@adapters/FooAdapter';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /repo/src/domain/user/User.ts
import { Service } from '@application/Service';
```

The final example is allowed when `allowedImports` includes `application` for the `domain` layer.
