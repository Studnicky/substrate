---
title: '@studnicky/v8/dynamic-property-access'
description: 'Reports variable-keyed access on non-indexed receivers when TypeScript can prove it is not collection element access.'
---

# @studnicky/v8/dynamic-property-access

Reports a computed member expression with a variable key when TypeScript type services show that its receiver is not an indexed collection. The rule covers **writes only** — assignment targets, updates (`o[k]++`), `delete o[k]`, destructuring targets, and `Reflect.set(target, key, value)`. A read is silent, because a read cannot move an object into dictionary mode; only a variable-key assignment can. It is aimed at variable string keys on ordinary object shapes, where enough distinct writes force the object from fast properties into dictionary mode and later named-property lookups become hash lookups.

`Reflect.set(target, key, value)` performs the same `[[Set]]` operation as `target[key] = value` and is reported on the same terms: a variable key on a non-indexed receiver is forbidden, a literal key is exempt, and an indexed-collection receiver (array, tuple, typed array, `DataView`, string) is exempt. `Reflect.defineProperty` is reported by [`v8/define-property`](./define-property), which already owns `Object.defineProperty`; it is not duplicated here.

Literal string and numeric keys are exempt: `object['name']` compiles to the same `GetNamedProperty` bytecode and measured identically to `object.name` (17.7 ms each at 50,000,000 iterations). `Symbol.*` keys are also exempt because they are compile-time constants with no dot spelling. Arrays, tuples, typed arrays, `DataView`, and strings are exempt because their indexed elements live in a separate elements store; `array[index]` is the fast path that the related [`for-of-arrays`](./for-of-arrays) rule expects. Without type services, variable keys are not reported rather than guessed.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## Why reads are not reported

The measured hazard is a variable-key **assignment** driving a plain object out of fast properties:
`%HasFastProperties(o)` returns `false` after enough distinct string-key writes. Reading `o[k]` in an
expression position causes no such transition, so reporting reads flagged sites that could not
exhibit the hazard.

That over-reach had a cost. A read in `StructuralHash` was "fixed" by rewriting `value[key]` as
`Reflect.get(value, key)` — which does not remove the dynamic key, only spells it in a form the rule
did not match. Measured over a realistic object walk at 200,000 iterations the two are
indistinguishable (75.3ms vs 73.0ms, 0.97x), and `Object.entries` — the other obvious rewrite — is
5.80x slower (437.0ms) because it allocates a pair array per walk. The remedy this rule names is a
`Map`, and a read of a JSON object arriving from `JSON.parse` cannot become one. `Reflect.get` is
therefore exempt on the same grounds as bracket-read syntax; only `Reflect.set` performs the
`[[Set]]` write this rule targets.

## The trust-boundary primitives

[`v8/computed-object-properties`](./computed-object-properties) covers `{ [key]: value }`, `Object.fromEntries`, and `Object.assign` with a computed key. Between the two rules there are exactly two sanctioned ways to perform a runtime-keyed write, both on `JsonObject` in `@studnicky/types`:

- `JsonObject.fromEntries(entries)` **constructs** a plain object from a `Map`, an array of pairs, or any iterable of `[key, value]`. It allocates the result only once every entry is known.
- `JsonObject.write(target, key, value)` **mutates** an existing target in place, for a value already constructed before every key is known — a `Proxy` trap, an RFC 6902 patch applier, or a cycle-safe clone that registers its target before walking its properties. It rejects a `__proto__` key outright and otherwise returns the `boolean` `Reflect.set` itself returns, so a `Proxy` `set` trap can return it directly.

Both writes are exempt by resolved identity — their class, member, and declaring source file — not by name, so a same-named local helper elsewhere does not gain the exemption.

Neither primitive removes the hazard; each localises it to one audited implementation. Building an object from 20 or more dynamic keys through either one still drives that object into dictionary mode, the same transition a hand-written variable-key loop would cause. Code that pays that cost once, at a single declared boundary, is safer than code that pays it at every call site that needs a runtime-keyed write.

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
const values: { [key: string]: string } = {};
const key = 'name';
values[key] = 'Ada';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const settings = { 'theme': 'dark' };
const key = 'theme';
const value = settings[key];
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const values: { [key: string]: string } = {};
const key = 'name';
Reflect.set(values, key, 'Ada');
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const settings = { 'theme': 'dark' };
const value = settings.theme;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const values = new Map<string, string>();
values.set('name', 'Ada');
const value = values.get('name');
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const numbers = [3, 5, 8];
const index = 1;
const value = numbers[index];
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const values = new Map<string, string>();
values.set('name', 'Ada');
const settings = JsonObject.fromEntries(values);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const settings: Record<string, string> = { 'theme': 'dark' };
const key = 'theme';
JsonObject.write(settings, key, 'light');
```
