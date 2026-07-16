---
title: '@studnicky/known-types-outside-adapters'
description: 'Bans any and unknown types outside the adapters layer of a hexagonal architecture.'
---

# @studnicky/known-types-outside-adapters

Bans `any` and `unknown` types outside the adapters layer of a hexagonal architecture. Adapters are the only layer permitted to hold untyped intake data — their job is converting it into known shapes at the boundary; every other layer must consume already-converted, known types. The rule resolves each file's layer the same way [`layer-import-boundary`](./layer-import-boundary) does (via `layers`/`sourceRoot`), then — for any file not resolved to the adapters layer (configurable via `adapterLayerName`, default `"adapters"`) — reports every `TSAnyKeyword` and `TSUnknownKeyword` node. Files outside the configured layer tree are never checked, and a file resolved to the adapters layer is fully exempt; notably, infrastructure — which can otherwise import any configured layer — is still bound by this restriction. This rule is typically wired together with [`layer-import-boundary`](./layer-import-boundary), [`domain-purity`](./domain-purity), and [`adapter-only-import`](./adapter-only-import) via the `HexagonalSuite.create({...})` factory export, since all four share the same `layers`/`sourceRoot` configuration — but it is fully usable and configurable on its own.

**Fixable:** No · **Options:** Yes · **Suggested severity:** `error`

### Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `layers` | `string[]` | *(required)* | Ordered list of enforced layer names, e.g. `["domain", "ports", "application", "adapters", "infrastructure"]`. |
| `sourceRoot` | `string` | *(required)* | Path segment(s) after which the layer name appears, e.g. `"src"`. |
| `aliasPrefixes` | `object` | `undefined` | Map of path-alias prefixes (e.g. `"@domain/"`) to their layer name. |
| `allowedImports` | `object` | `undefined` | Override of the default allow-matrix: source layer name → list of layers it may import from. |
| `adapterLayerName` | `string` | `"adapters"` | Name of the layer exempted from this ban — the layer responsible for converting untyped intake data into known shapes. |

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// domain-layer file (/repo/src/domain/user/User.ts) using 'any' — forbidden
function parse(input: any): void {}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// domain-layer file using 'unknown' — forbidden
function parse(input: unknown): void {}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// infrastructure-layer file using 'any' — forbidden despite infrastructure
// otherwise being able to import any configured layer
function parse(input: any): void {}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// domain-layer file using both 'any' and 'unknown' — both flagged
let value: any; let other: unknown;
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// adapters-layer file (/repo/src/adapters/HttpAdapter.ts) using 'any'/'unknown'
// — allowed, adapters are exempt
function parse(input: any): unknown { return input; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// domain-layer file using only known types — not flagged
function parse(input: string): number { return input.length; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// file outside the configured layer tree (/repo/scripts/build.ts) — out of scope
function parse(input: any): void {}
```
