/** Counting permit gate. acquire() returns a release function. */

import { CircularBuffer } from '@studnicky/circular-buffer';
import { HookInvoker } from '@studnicky/errors';
import { Guard } from '@studnicky/types';

import type { SemaphoreGrantStateInterface } from './interfaces/SemaphoreGrantStateInterface.js';
import type { SemaphoreWaiterStateInterface } from './interfaces/SemaphoreWaiterStateInterface.js';

import { SemaphoreOptionsEntity } from './entities/SemaphoreOptionsEntity.js';
import { SemaphoreError } from './errors/SemaphoreError.js';
import { SemaphoreGrantMachine } from './SemaphoreGrantMachine.js';
import { SemaphoreWaiterMachine } from './SemaphoreWaiterMachine.js';

interface SemaphoreWaiterInterface {
  readonly 'reject': (reason?: unknown) => void;
  readonly 'resolve': (release: () => Promise<void>) => void;
  'state': SemaphoreWaiterStateInterface;
}

interface SemaphoreSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class SemaphoreInstance {
  static belongsTo<TInstance>(
    constructor: SemaphoreSubclassInterface<TInstance>,
    value: object
  ): value is object & TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

export class Semaphore {
  static create<TInstance extends Semaphore = Semaphore>(
    this: SemaphoreSubclassInterface<TInstance>,
    options: SemaphoreOptionsEntity.Type
  ): TInstance {
    const resolveSubclassConstructor = (): SemaphoreSubclassInterface<TInstance> => {
      return this;
    };

    const result: unknown = Reflect.construct(resolveSubclassConstructor(), [options]);
    if (!Guard.isObjectLike(result) || !SemaphoreInstance.belongsTo(resolveSubclassConstructor(), result)) {
      throw new TypeError('Semaphore.create() did not construct the requested subclass.');
    }
    const instance: TInstance = result;
    return instance;
  }

  static #validate(options: SemaphoreOptionsEntity.Type): void {
    if (!SemaphoreOptionsEntity.validate(options)) {
      throw new SemaphoreError('permits must be a positive integer');
    }
  }

  protected readonly hooks: HookInvoker = new HookInvoker();
  #available: number;
  #grantState: SemaphoreGrantStateInterface;
  readonly #grantMachine = new SemaphoreGrantMachine();
  #headWaiter: SemaphoreWaiterInterface | undefined;
  readonly #permits: number;
  readonly #queue: CircularBuffer<SemaphoreWaiterInterface>;
  readonly #waiterMachine = new SemaphoreWaiterMachine();

  protected constructor(options: SemaphoreOptionsEntity.Type) {
    Semaphore.#validate(options);
    this.#available = options.permits;
    this.#grantState = this.#grantMachine.getInitialState();
    this.#headWaiter = undefined;
    this.#permits = options.permits;
    this.#queue = CircularBuffer.create<SemaphoreWaiterInterface>({ 'overflow': 'grow' });
  }

  get available(): number { const result = this.#available;
    return result; }
  get permits(): number { const result = this.#permits;
    return result; }

  async acquire(): Promise<() => Promise<void>> {
    if (this.#available > 0 && this.#headWaiter === undefined && this.#queue.length === 0) {
      const permitsBefore = this.#available;
      this.#available -= 1;
      try {
        await this.hooks.invokeAsync('onAcquire', () => { const result = this.onAcquire(permitsBefore); return result; });
      } catch (error) {
        this.#available += 1;
        await this.#grantReadyWaiters();
        throw error;
      }
      const release = this.#buildRelease();
      return release;
    }
    const waiterResult = Promise.withResolvers<() => Promise<void>>();
    const waiter: SemaphoreWaiterInterface = {
      'reject': waiterResult.reject,
      'resolve': waiterResult.resolve,
      'state': this.#waiterMachine.getInitialState()
    };
    this.#queue.push(waiter);
    const queueLength = this.#queue.length + (this.#headWaiter === undefined ? 0 : 1);

    try {
      await this.hooks.invokeAsync('onAcquireWait', () => { const result = this.onAcquireWait(); return result; });
      await this.hooks.invokeAsync('onContended', () => { const result = this.onContended(queueLength); return result; });
      waiter.state = this.#waiterMachine.transition(waiter.state, { 'type': 'markReady' }).state;
    } catch (error) {
      waiter.state = this.#waiterMachine.transition(waiter.state, { 'type': 'markCancelled' }).state;
      await this.#grantReadyWaiters();
      throw error;
    }

    await this.#grantReadyWaiters();
    return await waiterResult.promise;
  }

  async withPermit<T>(callback: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try { return await callback(); } finally { await release(); }
  }

  #buildRelease(): () => Promise<void> {
    let released = false;
    return async () => {
      if (released) { return; }
      released = true;
      await this.#release();
    };
  }

  async #release(): Promise<void> {
    this.#available += 1;
    if (this.#headWaiter === undefined && this.#queue.length === 0 && this.#grantState.variant === 'idle') {
      await this.hooks.invokeAsync('onRelease', () => { const result = this.onRelease(this.#available); return result; });
      return;
    }
    const delegated = await this.#grantReadyWaiters();
    if (delegated === 0 && this.#headWaiter === undefined && this.#queue.length === 0 && this.#grantState.variant === 'idle') {
      await this.hooks.invokeAsync('onRelease', () => { const result = this.onRelease(this.#available); return result; });
    }
  }

  async #grantReadyWaiters(): Promise<number> {
    if (this.#grantState.variant === 'granting') {
      return 0;
    }

    this.#grantState = this.#grantMachine.transition(this.#grantState, { 'type': 'start' }).state;
    let delegated = 0;
    try {
      while (true) {
        const next = this.#headWaiter ?? this.#queue.shift();
        if (next === undefined) {
          break;
        }
        if (next.state.variant === 'cancelled') {
          this.#headWaiter = undefined;
          continue;
        }
        if (this.#available === 0 || next.state.variant !== 'ready') {
          this.#headWaiter = next;
          break;
        }

        this.#headWaiter = undefined;
        if (await this.#delegate(next)) {
          delegated += 1;
        }
      }
    } finally {
      this.#grantState = this.#grantMachine.transition(this.#grantState, { 'type': 'finish' }).state;
    }
    return delegated;
  }

  async #delegate(waiter: SemaphoreWaiterInterface): Promise<boolean> {
    this.#available -= 1;
    try {
      await this.hooks.invokeAsync('onReleaseDelegated', () => {
        const result = this.onReleaseDelegated();
        return result;
      });
    } catch (error) {
      this.#available += 1;
      waiter.reject(error);
      return false;
    }
    waiter.resolve(this.#buildRelease());
    return true;
  }

  /**
   * Fires when a permit is granted immediately.
   * `permitsBefore` is the available count BEFORE decrement.
   * A failure aborts the acquisition and returns the reserved permit.
   */
  protected onAcquire(_permitsBefore: number): void {}

  /**
   * Fires when the caller had to queue (no permit available).
   * A failure cancels the queued acquisition.
   */
  protected onAcquireWait(): void {}

  /**
   * Fires when a new waiter is added to the queue.
   * `queueLength` is the queue length AFTER push.
   * A failure cancels the queued acquisition.
   */
  protected onContended(_queueLength: number): void {}

  /**
   * Fires when a permit is returned to the pool (no waiting callers).
   * `permitsAfter` is the available count AFTER increment.
   * A failure rejects release after the permit is restored.
   */
  protected onRelease(_permitsAfter: number): void {}

  /**
   * Fires when a permit is handed to a queued waiter (not returned to pool).
   * A failure rejects that acquisition and leaves the permit available for
   * the next queued waiter.
   */
  protected onReleaseDelegated(): void {}
}
