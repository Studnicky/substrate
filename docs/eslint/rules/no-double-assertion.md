---
title: '@studnicky/no-double-assertion'
description: 'Disallows an assertion chain routed through unknown or any to reach an unrelated type.'
---

# @studnicky/no-double-assertion

Disallows a TypeScript assertion whose source expression is itself an assertion to `unknown` or `any` — the `value as unknown as Target` shape, its `as any as Target` variant, the legacy `<Target>(<unknown>value)` angle-bracket form, and any parenthesized combination of the two. A single `as` requires the source and target types to overlap; TypeScript checks that overlap and rejects an assertion where it cannot find one. Routing through `unknown`/`any` first removes that check entirely, because every type overlaps with `unknown`. A double assertion is not a stronger cast — it is the absence of the one check `as` exists to perform.

A single-step `as` between two types the checker agrees overlap is a different, narrower construct and is not what this rule targets. This rule fires only when the assertion's own source expression is a second assertion node whose target is `unknown`/`any`; an assertion reading from a plain expression, however wide that expression's own type is, is untouched.

**Fixable:** No · **Options:** No

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
type Target = { readonly value: string };
declare const raw: string;
const target = raw as unknown as Target;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
type Target = { readonly value: string };
declare const raw: string;
const target = raw as any as Target;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
type Target = { readonly value: string };
declare const raw: string;
const target = <Target>(<unknown>raw);
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
declare const raw: string;
const widened = raw as unknown;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
type Target = { readonly value: string };
declare const parsed: Target;
const repeated = parsed as Target;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
declare const raw: unknown;
const first = raw as { readonly a: string };
const second = first as { readonly a: string; readonly b: string };
```

## Rationale

A double assertion is how a wrong assumption about a value's shape becomes unfalsifiable: the compiler cannot object, because routing through `unknown`/`any` is specifically what removes its ability to object. Every occurrence found and removed in this codebase's own `packages/eslint-config` — ninety-seven of them, across thirty files — was inspected by deleting the cast and reading what the compiler said with it gone. Five of those removals surfaced a concealed shape gap the cast had been hiding, not merely a verbose way of writing something safe:

- **A schema field's own optionality contradicted itself.** Removing a double assertion in `packages/entity` produced `TS2375` under `exactOptionalPropertyTypes`: the object being built wrote `contains: undefined`, while the field's declared type said `contains?:`. The cast had been asserting past a real disagreement between what the code wrote and what the type promised.
- **A `range` field the type already says is optional.** `arrayScanOutsideLoops.ts` cast `declarationNode.range`/`loopNode.range` to a non-optional tuple, though `@types/estree`'s `BaseNode.range` is `[number, number] | undefined`. With the cast gone, `TS18048: '...' is possibly 'undefined'` fired at the first read — the guard for a missing `range` was written three lines below the point that would have already thrown on it.
- **A `.name` field asserted onto a value that might not have one.** The same file's `findDeclarationNode` cast an AST node to `{ readonly 'name': string }`, though its real parameter type is the full `Rule.Node` union — most of whose members have no `.name` at all. Removing the cast surfaced `TS2339: Property 'name' does not exist on type 'Node'`.
- **An `Identifier | Literal` union collapsed to `Identifier` alone.** `exportShape.ts`'s `onExportSpecifier` cast `ExportSpecifier.local`/`.exported` to `{ name: string; type: string }`, but their real type is `Identifier | Literal` — and `Literal` (the shape a string-literal export name like `export { "foo" as "bar" }` produces) has no `.name`. The cast asserted a shape that is only sometimes true.
- **An optional-and-nullable field narrowed to only nullable.** `conditionalPropertyAssignment.ts` cast `IfStatement.alternate` to `AstNodeInterface | null`, but `@types/estree` declares it `Statement | null | undefined`. Removing the cast surfaced `TS18048` on the very next read, because the `undefined` case the cast had erased was reachable.

None of these five were visible by reading the surrounding code — the cast's whole purpose was to make the compiler stop checking, so the compiler had nothing to say until the cast was gone. That is the general hazard: a double assertion does not just skip one check on one line, it removes the one mechanism that would have surfaced a shape disagreement the author never noticed making.

A double assertion that turns out to be genuinely unavoidable is rare, but real: `packages/eslint-config`'s `exportShape.ts` keeps two single-step (not double) `as` assertions where `@types/eslint`'s `RuleListener` catch-all index signature spans dozens of unrelated handler shapes and no listener-derived type can be borrowed for the one non-standard AST node it reads. Those are single assertions between types the checker agrees overlap, not a chain through `unknown`/`any`, so this rule does not — and should not — flag them; they are the two valid scenarios named directly in this rule's own test suite.
