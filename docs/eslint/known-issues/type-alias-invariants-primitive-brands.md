# `type-alias-invariants` — branded primitives have no available fix (confirmed against rule source)

Found while finishing `json-tology`'s conversion to `@studnicky/eslint-config@9.1.1`. Re-verified by reading the compiled rule implementation directly (`typeAliasInvariants.js` / `TypeContractClassification.js`), not just observed behavior — this is a real, traced gap, not a missed fix.

## The gap

A type alias that intersects a phantom brand with a JSON primitive — the standard TypeScript "branded primitive" idiom:

<!-- inline-ts-ok: consumer-side illustration of the branded-primitive idiom -->
```ts
declare const FORMAT: unique symbol;
type FormatBrandType<TF extends string> = { readonly [FORMAT]: TF };

type EmailBrandType = FormatBrandType<'email'> & string;
```

is unconditionally classified `interfaceContract`/`brand`, with no path to `pureDataCanonical`.

## Why, traced through the rule source

`classifyAlias` calls `findAliasContract(declaration.type, ...)` before ever considering schema-derivation. For a union/intersection, `findAliasContract` iterates every member and **returns on the first one that yields contract evidence** (`TypeContractClassification.js`, the `isUnionTypeNode(node) || isIntersectionTypeNode(node)` branch inside `findAliasContract`) — it never considers whether a *later* member is schema-derived once an earlier member has already resolved to a contract.

`FormatBrandType<'email'>` resolves to that contract unconditionally: its own declaration (`type FormatBrandType<TF> = { readonly [FORMAT]: TF }`) is generic, so `classifyAlias` first checks `containsTypeFunctionBody` — but that check only recognizes conditional/mapped/indexed-access bodies (or references that forward to one), and a plain symbol-keyed object literal is none of those, so it falls through to `findAliasContract` on `{ [FORMAT]: TF }` — a `TSTypeLiteral` with a computed, unique-symbol-keyed member, which `isBrandMember` matches directly, returning `{ reason: 'brand' }`. Every reference to `FormatBrandType<F>` therefore composes `interfaceContract`/`brand` (per the "a reference to a type-level function composes the same contract portion" rule), regardless of what it's intersected with.

**Verified empirically, not just by reading the source**: replacing the bare `string` with `InferType<typeof FormatSchema>` (a real, colocated JSON Schema literal using the actual `format` keyword) does **not** change the classification — `findAliasContract` never reaches the second intersection member, because the first (`FormatBrandType<'email'>`) already returned a contract. There is no rule-level carve-out for "one member is a brand, the other is schema-derived data, so allow the intersection."

The `aliasMustBeInterface` remedy this classification implies is then syntactically unreachable: `interface EmailBrandType extends string {}` is invalid TypeScript — an interface cannot `extends` a primitive type.

## The only fix that would satisfy the rule as written

Box every branded value in an object wrapper instead of intersecting a brand with a bare primitive:

<!-- inline-ts-ok: consumer-side illustration of the boxed-wrapper workaround -->
```ts
interface EmailBrandInterface {
  readonly value: string;
  readonly [FORMAT]: 'email';
}
```

This is syntactically valid (a real interface, not extending a primitive) and would pass both `type-alias-invariants` and `interface-must-be-contract`. It is not a lint-compliance change, though — it changes the *runtime representation* of every branded value in the consuming project from a bare string/number to a boxed object, breaking every call site that currently treats a branded value as its underlying primitive (string methods, template interpolation, JSON serialization, arithmetic on branded numbers, etc.). `json-tology` has ~24 of these formats; boxing all of them is a project-wide breaking API redesign, not a lint fix, and is out of scope for a lint-compliance pass.

## Ask

Recognize a type alias whose body is `SomeBrandType & TPrimitive` (where `TPrimitive` is `string`/`number`/`boolean`/`bigint` and the other intersection member is itself brand-exempt per the 9.1.0 symbol-keyed-brand fix) as canonical — i.e., extend the union/intersection walk in `findAliasContract` (or a check ahead of it) to recognize "one member is a bare brand, the other is a bare JSON primitive (or schema-derived application of one)" as a distinct, valid pattern rather than falling through to generic contract detection. Absent that, this is a class of type alias with no reachable fix at all under the current rule, confirmed against the rule's own source rather than assumed.
