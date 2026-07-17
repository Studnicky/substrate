---
title: '@studnicky/v8/array-scan-outside-loops'
description: 'Disallows linear array scans inside loop bodies.'
---

# @studnicky/v8/array-scan-outside-loops

Disallows `.find()`, `.filter()`, `.indexOf()`, `.includes()`, `.some()`, and `.every()` calls inside any loop body (`for`, `while`, `do...while`, `for...of`, `for...in`), when the receiver is a stable collection that does not change between iterations. Each of these methods scans linearly; called every iteration against the same collection, the loop becomes O(n²). Hoist the collection into a `Map`/`Set` outside the loop, or compute the result once and reuse it.

This rule requires type information (`parserOptions.project`/`projectService`) to distinguish a real array scan from `String.prototype.indexOf`/`.includes()`, which share the same method names but a different complexity story — without it, the rule reports nothing rather than guess. It also skips a receiver proven to be freshly derived every iteration (a `for...of` loop's own binding, or a `const` declared inside the loop body), since that is not the same collection being re-scanned each time.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const id of ids) {
  const match = records.find((r) => r.id === id);
  process(match);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
while (queue.length > 0) {
  const item = queue.shift();
  if (seen.includes(item)) { continue; }
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const byId = new Map(records.map((r) => [r.id, r]));
for (const id of ids) {
  const match = byId.get(id);
  process(match);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const seenSet = new Set(seen);
while (queue.length > 0) {
  const item = queue.shift();
  if (seenSet.has(item)) { continue; }
}
```

Also not flagged: the receiver is a fresh, per-iteration value, not the same collection re-scanned every time.

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const entry of entries) {
  // entry.refs differs on every iteration — this is not the anti-pattern.
  const hasEmpty = entry.refs.some((ref) => ref.length === 0);
  process(entry, hasEmpty);
}
```
