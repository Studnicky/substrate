---
title: '@studnicky/v8/object-spread'
description: 'Disallows object spread inside a constructor.'
---

# @studnicky/v8/object-spread

Spreading another object into an object literal built inside a constructor (`{ ...defaults, ...options }`) copies a variable, data-dependent set of properties in a variable order, so V8 cannot assign the resulting instance a stable hidden class from one construction to the next. Assign each property explicitly instead, so every instance is built through the same fixed sequence of property assignments.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
class RetryOptions {
  #config: RetryOptionsType;

  constructor(overrides: Partial<RetryOptionsType>) {
    this.#config = { ...DEFAULT_RETRY_OPTIONS, ...overrides };
  }
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
class RetryOptions {
  #attempts: number;
  #delayMs: number;

  constructor(overrides: Partial<RetryOptionsType>) {
    this.#attempts = overrides.attempts ?? DEFAULT_RETRY_OPTIONS.attempts;
    this.#delayMs = overrides.delayMs ?? DEFAULT_RETRY_OPTIONS.delayMs;
  }
}
```
