---
title: '@studnicky/no-threaded-vocabulary'
description: 'Disallows closed-vocabulary tokens in parameter, field, and property positions outside the adapters layer.'
---

# @studnicky/no-threaded-vocabulary

A closed vocabulary — a boolean, an enum, a union of literals — names the set of adapters a system can select. It has two legal moments: intake, where an untrusted string becomes the vocabulary type, and resolution, where the frame that received it exchanges the token for a port implementation. After resolution the token carries no information: the choice it encoded is embodied in the object now held.

This rule bans the token from every position that would carry it past that point. It does not examine branches. `switch (transport)` in the adapters layer is the design, not the defect — the defect is the token appearing in a frame that is not the one that resolved it.

Upgrading a flag to a well-named enum does not satisfy the rule. `transport: TransportMode` threaded six frames deep is the same defect as `isMcp: boolean` threaded six frames deep, more precisely typed.

**Fixable:** No · **Options:** Yes · **Suggested severity:** `error`

## Checked positions

Parameters (including default-valued, rest, and constructor parameter properties), class fields, and interface or type-literal property signatures. Return positions are not checked: a returned boolean was computed by the callee, so its decision was made locally. A token a frame can return is one it must already hold, which the field check covers.

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// src/domain/EntityResolver.ts
function withResolved(id: string, isMcp: boolean): void {}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// src/domain/EntityResolver.ts — a better type, the same defect
enum TransportMode { Cli = 'cli', Mcp = 'mcp' }
function withResolved(id: string, transport: TransportMode): void {}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// src/domain/Resolver.ts — stored rather than passed, same transmission
class Resolver {
  #transport: TransportMode;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// src/domain/ResolveOptionsInterface.ts
interface ResolveOptionsInterface {
  readonly transport: TransportMode;
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// src/adapters/ReporterFactory.ts — the resolution frame
class ReporterFactory {
  public static create(transport: TransportMode): ResultReporterInterface {
    switch (transport) {
      case TransportMode.Mcp: return new McpResultReporter();
      default: return new CliResultReporter();
    }
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// src/domain/EntityResolver.ts — the port, not the token
function withResolved(id: string, reporter: ResultReporterInterface): void {}
```

## Options

Extends the shared layer options (`layers`, `bindings`, `sourceRoot`) with:

- `adapterLayerName` (default `"adapters"`) — the layer permitted to receive a token and resolve it into a port.

Files that resolve to no configured layer are skipped.

## Checked positions

Parameters (including defaults, rest elements, and TS parameter properties), class fields (including `abstract` and `accessor`), interface and type-literal property signatures, and index signatures. A token laundered through a container — `TransportMode[]`, `readonly boolean[]`, a tuple member — or through a generic constraint (`<T extends boolean>`) resolves to the same verdict.

Not checked: return types, local variables, and an explicit `this` parameter. A returned boolean was computed by the callee, so its decision was made locally; a token a frame can return is one it already holds, which the field check covers. Contents of a `declare module 'pkg'` augmentation are skipped — that block describes a third-party surface, not a frame in this architecture.

## Resolution

Without type information the rule resolves `boolean`, literal types, literal unions, and enums or aliases declared in the same file (namespace members are indexed by qualified name, so `Domain.Mode` never resolves to an unrelated `Transport.Mode`).

With `parserServices` available, every annotation the syntactic walk cannot settle is put to the type checker: cross-file enums, generic alias instantiations, `keyof`, indexed access, `typeof` queries, and `import('...')` types. Typed linting is therefore the supported configuration — the syntactic path is a degraded fallback, not the intended mode.

## Limitations

Value flow is out of scope. A token widened to `string`, or inferred into an object literal and forwarded, has no closed-vocabulary annotation at any checked position and is not reported. Catching those needs a whole-program pass over the call graph, not a per-file rule.

A vocabulary carried as cargo — recorded in a telemetry or persistence shape, never compared — is reported. The value/discriminant split that would exempt it is not implemented.
