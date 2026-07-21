/** 06-hook-invoker — HookInvoker with record-and-continue error handling. Run: npx tsx packages/errors/examples/06-hook-invoker.ts */

import assert from 'node:assert/strict';

// #region usage
import { type HookInvocationError, HookInvoker } from '../src/index.js';

class ObservedCounter {
  static readonly #OwnedHookInvoker = class CounterHookInvoker extends HookInvoker {
    // Disposition only: HookInvoker already owns and snapshots diagnostics.
    protected override onHookError(_hookName: string, _cause: unknown): void {}
  };

  #value = 0;
  readonly #hooks: HookInvoker = new ObservedCounter.#OwnedHookInvoker();

  get value(): number { return this.#value; }
  get hookErrorCount(): number { return this.#hooks.hookErrorCount; }
  getHookErrors(): readonly HookInvocationError[] {
    const diagnostics = this.#hooks.getHookErrors();
    if (diagnostics.length !== this.#hooks.hookErrorCount) {
      throw new Error('Hook diagnostic projection count mismatch');
    }
    return diagnostics;
  }

  protected onIncrement(_next: number): void {}

  increment(): void {
    this.#value += 1;
    this.#hooks.invoke('onIncrement', () => {
      const result = this.onIncrement(this.#value);
      return result;
    });
  }

  async incrementAndWait(): Promise<void> {
    this.#value += 1;
    await this.#hooks.invokeAsync('onIncrement', () => {
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
counter.increment(); // Fire-and-forget when subsequent work does not depend on hook completion.
await counter.incrementAndWait(); // Await when subsequent work requires hook completion.
counter.increment();
// #endregion usage

assert.strictEqual(counter.value, 3, 'increments proceed even after a hook failure');
assert.strictEqual(counter.hookErrorCount, 1, 'exactly one hook failure recorded');
assert.strictEqual(counter.getHookErrors()[0]?.hookName, 'onIncrement');
assert.ok(counter.getHookErrors()[0]?.cause instanceof Error);

console.log('06-hook-invoker: all assertions passed');
