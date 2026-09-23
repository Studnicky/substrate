---
title: '@studnicky/v8/prototype-modification'
description: 'Disallows prototype mutation that is not provably one-shot setup before instances exist.'
---

# @studnicky/v8/prototype-modification

Disallows whole-prototype and prototype-property assignments, `__proto__` assignments, and calls that pass a prototype to `Object.assign`, `Object.defineProperty`, `Object.defineProperties`, `Object.setPrototypeOf`, `Reflect.set`, or `Reflect.setPrototypeOf`. Computed forms of the `Object` methods resolve through their TypeScript identity, so `Object['assign'](...)` is covered as well. `Reflect.set` and `Reflect.setPrototypeOf` are matched by direct callee shape instead of `CallIdentity`: `CallIdentity.ownerNameOf` can resolve a namespace-declared member's owner through its parent fallback, but this rule has not been migrated to use it, so the raw-name match remains here.

A module-top-level mutation outside every function and loop is exempt because that shape is provably one-shot before an instance exists. Mutations nested in a function or a loop, including a per-element iteration callback, are reported. The hazard is proven with `node --allow-natives-syntax`: once `%OptimizeFunctionOnNextCall` compiles a hot method call against an instance's prototype, `%GetOptimizationStatus(hot).toString(2)` reports `1010001` (optimized bit set); assigning a further member onto that prototype afterward drops the status to `1` (optimized bit cleared) — the mutation alone deoptimizes `hot`. At 5,000,000 subsequent calls the amortized cost washes out, since V8 re-optimizes `hot` again within the loop, so the measured hazard is the one-time recompilation stall, not a sustained throughput loss — the stall matters most on latency- or startup-sensitive paths. See `scratchpad/bench_prototypeModification.js`. [`define-property`](./define-property) applies the same "not proven to run exactly once" reasoning to a plain object's own properties instead of a prototype.

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
