---
title: '@studnicky/v8/memoize-array-length'
description: 'Disallows reassigning an identifier loop bound to an array length inside the loop.'
---

# @studnicky/v8/memoize-array-length

Disallows assigning `array.length` or `array["length"]` to either identifier in an identifier-to-identifier `for` or `while` loop comparison inside that loop's body. The rule catches a self-defeating form such as a manually memoized bound reassigned to `.length` on every iteration; it does not require memoizing a length in the first place.

On Node v24, the direct `i < array.length` loop measured 2.327 ms and the memoized form measured 3.256 ms over 5,000,000 iterations: memoization was 1.399x slower. TurboFan hoists an invariant length read when the array is not resized, so this rule is a code-clarity constraint rather than a claim that reading `.length` prevents optimization.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
let end = items.length;

for (let index = 0; index < end; index += 1) {
  end = items.length;
  process(items[index]);
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
for (let index = 0; index < items.length; index += 1) {
  process(items[index]);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const end = items.length;

for (let index = 0; index < end; index += 1) {
  process(items[index]);
}
```
