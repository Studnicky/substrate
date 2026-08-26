---
title: '@studnicky/v8/computed-class-properties'
description: 'Disallows non-static computed class members in classes re-evaluated by a function or loop.'
---

# @studnicky/v8/computed-class-properties

Disallows a non-literal, non-well-known-symbol computed field or method key when its class declaration or expression is nested in a function or loop. Each evaluation can create a class with a different runtime key; pooling instances from those classes makes a shared field access polymorphic. Across a pool of eight instances and 5,000,000 reads in Node v24, such a pool takes 16.01 ms compared with 5.33 ms for one fixed class: 3× slower.

Computed members of a class evaluated once are outside the rule because that class retains one uniform shape, regardless of its key expression. Literal keys and well-known symbols such as `[Symbol.iterator]` are also outside its scope, including in a recurring class, because they are compile-time constants and well-known symbols have no non-computed spelling.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
function createRecord(key: string) {
  return class Record {
    [key] = 0;
  };
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const key of keys) {
  class Record {
    [key](): string { return key; }
  }
  register(Record);
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const key = getRecordKey();
class Record {
  [key] = 0;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function createIterable() {
  return class IterableRecord {
    *[Symbol.iterator](): IterableIterator<number> {
      yield 0;
    }
  };
}
```
