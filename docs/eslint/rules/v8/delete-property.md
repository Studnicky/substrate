---
title: '@studnicky/v8/delete-property'
description: 'Reports property deletion except where type information proves the target has no fixed-property contract.'
---

# @studnicky/v8/delete-property

Reports `delete object.property`, optional-chain deletion, and `Reflect.deleteProperty(object, key)`. With TypeScript type services, it permits a target only when every meaningful non-nullish type constituent has a string or number index signature, or is the bare `object` type. Those shapes make no fixed-property guarantee for deletion to violate. Without type services, every supported deletion is reported.

The exemption is evidence about the type contract, not a claim that deletion is free. Across 2,000,000 objects, deleting from a fixed-shape class instance made reads 9.6× slower (155.0 ms versus 16.2 ms); a dynamically keyed record was still 2.3× slower (49.0 ms versus 20.9 ms). Use an index-signature or bare-object deletion only when removal is the required operation.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
class Session {
  public token = 'secret';

  public clear(): void {
    delete this.token;
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const account: { id: string; temporary: boolean } = { 'id': '1', 'temporary': true };
delete account.temporary;
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const cache: Record<string, string> = { 'token': 'secret' };
delete cache.token;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function removeMember(target: object): boolean {
  return Reflect.deleteProperty(target, 'temporary');
}
```
