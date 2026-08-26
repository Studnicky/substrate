---
title: '@studnicky/known-types-outside-adapters'
description: 'Bans any and unknown types outside a configured adapters layer.'
---

# @studnicky/known-types-outside-adapters

Bans `any` and `unknown` outside a configured adapters layer. It is implemented and registered in the plugin, but substrate deliberately does not enable it.

The rule fits a business-logic core with one conversion boundary: adapters accept untyped input and the rest of the system consumes converted values. Substrate has neither. It is a four-band toolkit of utility and infrastructure packages, with defensive narrowing inside every band rather than one adapter edge.

The measured result confirms that mismatch: choosing the best possible adapter band produces 587 violations and the worst produces 1144. `unknown` is substrate's narrowing idiom, with approximately 1177 uses across every band; it is the deliberate alternative to `any`, not unconverted boundary data.

**Fixable:** No · **Options:** Yes · **Suggested severity for a matching architecture:** `error`

## Behavior when enabled

For a file resolved to any non-adapter layer, the rule reports syntactic `any` and `unknown` keywords. With TypeScript parser services, it also reports a type reference that resolves to `any` or `unknown`. Files that resolve to the configured adapter layer, and files that do not resolve to any configured layer, are skipped.

Layers resolve through the shared ordered `bindings` configuration described by [`layer-import-boundary`](./layer-import-boundary.md). The option `adapterLayerName` defaults to `"adapters"`.

```js
{
  '@studnicky/known-types-outside-adapters': ['error', {
    layers: ['domain', 'ports', 'application', 'adapters', 'infrastructure'],
    sourceRoot: 'src',
    bindings: [
      { kind: 'folder', layer: 'domain', pattern: 'domain' },
      { kind: 'folder', layer: 'ports', pattern: 'ports' },
      { kind: 'folder', layer: 'application', pattern: 'application' },
      { kind: 'folder', layer: 'adapters', pattern: 'adapters' },
      { kind: 'folder', layer: 'infrastructure', pattern: 'infrastructure' }
    ]
  }]
}
```

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: src/domain/user/User.ts
function parse(input: any): void {}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: src/domain/user/User.ts
function parse(input: unknown): void {}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: src/adapters/HttpAdapter.ts
function parse(input: any): unknown { return input; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: scripts/build.ts
function parse(input: any): void {}
```

Use this rule when your application actually has the described conversion boundary. Substrate's configuration leaves it disabled.
