---
title: '@studnicky/no-circular-imports'
description: 'Disallow circular imports between package source files.'
---

# @studnicky/no-circular-imports

A circular import is a shared construct screaming to be created. This rule builds the in-repo `packages/*/src` module import graph from the linted file's TypeScript `Program` (cached per-`Program`, partitioned into strongly-connected components with an iterative Tarjan's algorithm) and reports an import or re-export whose target module can reach back to the importing file — `type`-only imports included, since a type-only cycle is still two files that cannot compile independently of each other.

**Fixable:** No · **Options:** None · **Suggested severity:** `error`

## Why type-only counts

`import type { Foo } from './bar.js'` disappears at runtime, but the module graph a bundler, a dependency-cruiser, or a human reading two files side by side reasons about is the source graph, not the emitted one. Two files that only resolve as a unit under the type checker still can't be understood, tested, or moved independently — the cycle is the same defect whether the edge that closes it carries a value or only a type.

## What the fix looks like

The two (or more) files in the cycle share a construct neither one should own alone — typically a base class or context type that also needs to call back into its own subordinates, or two entities that reference each other's shape. Extract the shared piece (an interface describing only what each side actually consumes, a third module both depend on, or a narrower split of one of the two files) so the dependency runs one direction.

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /repo/src/A.ts
import type { B } from './B.js';

export class A {
  public sibling!: B;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /repo/src/B.ts
import type { A } from './A.js';

export class B {
  public constructor(private readonly owner: A) {}
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /repo/src/AInterface.ts
export interface AInterface {
  readonly sibling: BInterface;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /repo/src/BInterface.ts
export interface BInterface {
  ownerMethod(): void;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /repo/src/A.ts
import type { AInterface } from './AInterface.js';
import type { BInterface } from './BInterface.js';

export class A implements AInterface {
  public sibling!: BInterface;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /repo/src/B.ts
import type { AInterface } from './AInterface.js';
import type { BInterface } from './BInterface.js';

export class B implements BInterface {
  public constructor(private readonly owner: AInterface) {}

  public ownerMethod(): void {}
}
```

`A` and `B` now depend only on the interface files, and neither interface file depends on the other.
