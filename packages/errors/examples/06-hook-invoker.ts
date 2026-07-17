/** 06-hook-invoker — HookInvoker with a record-and-continue delegate subclass. Run: npx tsx packages/errors/examples/06-hook-invoker.ts */

import assert from 'node:assert/strict';

// #region usage
import { HookInvoker } from '../src/index.js';

// json-schema-uninexpressible: minimal demo-only entry type for a runnable doc example, not a shipped domain shape
type HookErrorEntryType = { 'cause': unknown; 'hookName': string };

/**
 * Hoisted to module scope, per the delegate-class idiom: overrides
 * `onHookError` to record a failure instead of letting it throw, so a
 * broken observer hook can never abort a mutation that already committed.
 */
class CounterHookInvoker extends HookInvoker {
  constructor(private readonly onError: (hookName: string, cause: unknown) => void) {
    super();
  }

  protected override onHookError<T>(hookName: string, cause: unknown): T {
    this.onError(hookName, cause);
    return undefined as T;
  }
}

class ObservedCounter {
  #value = 0;
  readonly #hookErrors: HookErrorEntryType[] = [];
  readonly #hooks: HookInvoker;

  constructor() {
    this.#hooks = new CounterHookInvoker((hookName, cause) => {
      this.#hookErrors.push({ 'cause': cause, 'hookName': hookName });
    });
  }

  get value(): number { return this.#value; }
  get hookErrorCount(): number { return this.#hookErrors.length; }
  getHookErrors(): readonly HookErrorEntryType[] { return [...this.#hookErrors]; }

  protected onIncrement(_next: number): void {}

  increment(): void {
    this.#value += 1;
    this.#hooks.invoke('onIncrement', () => {
      const result = this.onIncrement(this.#value);
      return result;
    });
  }
}

class ThrowingObservedCounter extends ObservedCounter {
  protected override onIncrement(next: number): void {
    if (next === 2) {
      throw new Error(`refusing to observe value ${String(next)}`);
    }
  }
}

const counter = new ThrowingObservedCounter();
counter.increment(); // onIncrement(1) succeeds
counter.increment(); // onIncrement(2) throws, recorded instead of propagating
counter.increment(); // onIncrement(3) succeeds
// #endregion usage

assert.strictEqual(counter.value, 3, 'increments proceed even after a hook failure');
assert.strictEqual(counter.hookErrorCount, 1, 'exactly one hook failure recorded');
assert.strictEqual(counter.getHookErrors()[0]?.hookName, 'onIncrement');
assert.ok(counter.getHookErrors()[0]?.cause instanceof Error);

console.log('06-hook-invoker: all assertions passed');
