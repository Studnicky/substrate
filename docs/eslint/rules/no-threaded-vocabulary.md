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

The rule asks one binary question of a file — may it resolve a token? — so it takes only what answers that. It does not consume the shared layer axis, and it enforces independently of the other architecture rules.

- `sourceRoot` (required) — path segment(s) after which a resolution site's candidate segment appears, e.g. `"src"` or `"packages"`.
- `resolutionSites` (default `[]`) — matchers for the files permitted to receive a token and resolve it into an implementation. Same matcher vocabulary as layer bindings — `unit` is one of `folder`, `package`, `module`, `dependency`, `builtin` — minus the layer name.

```js
{ sourceRoot: 'src', resolutionSites: [{ unit: 'folder', pattern: 'adapters' }] }
{ sourceRoot: 'packages', resolutionSites: [{ unit: 'package', pattern: 'boundary-kit' }] }
```

Binding the exemption to a layer *name* out of a project's `layers` list would couple this rule to whatever that list encodes. A project whose bands measure dependency depth has no layer name meaning "resolves external input", and no string would make one. A resolution site is a property of a file, declared directly.

Every file not matching a resolution site is checked, including files outside `sourceRoot`. There is no silent skip: an unconfigured path is enforced, not exempted.

## Limitations

Value flow is out of scope. A token widened to `string`, or inferred into an object literal and forwarded, has no closed-vocabulary annotation at any checked position and is not reported. Catching those needs a whole-program pass over the call graph, not a per-file rule.

A vocabulary carried as cargo — recorded in a telemetry or persistence shape, never compared — is reported. The value/discriminant split that would exempt it is not implemented.
