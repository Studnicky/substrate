---
title: '@studnicky/v8/array-scan-outside-loops'
description: 'Disallows resolved linear scans that execute once per iteration.'
---

# @studnicky/v8/array-scan-outside-loops

Disallows built-in `every`, `filter`, `find`, `includes`, `indexOf`, and `some` calls on `Array`, `ReadonlyArray`, and typed arrays when they execute once per iteration. It treats a callback passed to a built-in per-element iterator as a loop body as well as loop-keyword bodies. Repeated scans of the same collection make the enclosing work quadratic; use a `Map` or `Set`, or compute the scan result once.

The rule resolves standard-library signatures rather than method spelling, so computed access is covered and same-named user methods are not. It does not report a receiver proven to be declared within the enclosing real loop, because that collection is fresh for the iteration. Type services are required for signature resolution; without them the rule reports nothing.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const id of ids) {
  const record = records.find((item) => item.id === id);
  process(record);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
records.forEach((record) => {
  if (selectedIds.includes(record.id)) {
    process(record);
  }
});
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const recordsById = new Map(records.map((record) => [record.id, record]));
for (const id of ids) {
  process(recordsById.get(id));
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const record of records) {
  const hasEmptyField = record.fields.some((field) => field.length === 0);
  process(record, hasEmptyField);
}
```
