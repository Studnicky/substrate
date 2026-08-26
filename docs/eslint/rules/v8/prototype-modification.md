---
title: '@studnicky/v8/prototype-modification'
description: 'Disallows prototype mutation that is not provably one-shot setup before instances exist.'
---

# @studnicky/v8/prototype-modification

Disallows whole-prototype and prototype-property assignments, `__proto__` assignments, and calls that pass a prototype to `Object.assign`, `Object.defineProperty`, `Object.defineProperties`, `Object.setPrototypeOf`, `Reflect.set`, or `Reflect.setPrototypeOf`. Computed forms of the `Object` methods resolve through their TypeScript identity, so `Object['assign'](...)` is covered as well.

A module-top-level mutation outside every function and loop is exempt because that shape is provably one-shot before an instance exists. Mutations nested in a function or a loop, including a per-element iteration callback, are reported. The measured hazard is post-instantiation mutation: after V8 optimized a hot method call, adding a prototype member cleared its optimized status and forced recompilation. That is a one-time latency or startup stall; sustained calls can re-optimize.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
function addMethod(): void {
  Object.assign(Worker.prototype, {
    describe(): string {
      return 'worker';
    }
  });
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const target of targets) {
  target.__proto__ = replacement;
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
class Worker {
  public describe(): string {
    return 'worker';
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
class Worker {
  public value = 1;
}

Object.assign(Worker.prototype, {
  describe(): string {
    return String(this.value);
  }
});
```
