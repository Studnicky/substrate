---
title: '@studnicky/no-function-registries'
description: 'Disallows object literals that aggregate multiple function implementations.'
---

# @studnicky/no-function-registries

Disallows object literals containing two or more function implementations. A function registry obscures ownership, turns unrelated operations into a faux module, and makes a growing list of inline implementations the unit of reuse. Each operation belongs in an independently named module or cohesive class.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
const operators = {
  equals: (value: string): boolean => value === 'audit',
  contains: (value: string): boolean => value.includes('audit')
};
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const handlers = {
  created() { return publish('created'); },
  deleted() { return publish('deleted'); }
};
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
export class EqualsOperator {
  evaluate(value: string): boolean {
    const result = value === 'audit';
    return result;
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
export class ContainsOperator {
  evaluate(value: string): boolean {
    const result = value.includes('audit');
    return result;
  }
}
```

An object with one function property remains valid when it represents one cohesive operation at an integration boundary. Data objects and object literals that contain no function implementations remain valid.
