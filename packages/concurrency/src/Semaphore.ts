/** Counting permit gate. acquire() returns a release function. */

import { HookInvoker, RuntimeError } from '@studnicky/errors/node';
import { Predicates } from '@studnicky/types/node';

import type { SemaphoreGrantStateEntity } from './entities/SemaphoreGrantStateEntity.js';
import type { SemaphoreWaiterStateEntity } from './entities/SemaphoreWaiterStateEntity.js';
import type { SemaphoreAcquireOptionsInterface } from './interfaces/SemaphoreAcquireOptionsInterface.js';

import { SemaphoreOptionsEntity } from './entities/SemaphoreOptionsEntity.js';
import { SemaphoreError } from './errors/SemaphoreError.js';
import { SemaphoreQueueFullError } from './errors/SemaphoreQueueFullError.js';
import { SemaphoreGrantMachine } from './SemaphoreGrantMachine.js';
import { SemaphoreWaiterMachine } from './SemaphoreWaiterMachine.js';

interface SemaphoreWaiterInterface {
  'next': SemaphoreWaiterInterface | undefined;
  'previous': SemaphoreWaiterInterface | undefined;
  'queued': boolean;
  readonly 'reject': (reason?: unknown) => void;
  readonly 'resolve': (release: () => Promise<void>) => void;
  'state': SemaphoreWaiterStateEntity.Type;
  readonly 'unregisterAbort': () => void;
}

interface SemaphoreSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
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
    if (!Predicates.isObjectLike(result) || !Predicates.isInstanceOf<TInstance>(result, resolveSubclassConstructor())) {
      throw RuntimeError.create('Semaphore.create() did not construct the requested subclass.');
    }
    const instance: TInstance = result;
    return instance;
  }

  static #validate(options: SemaphoreOptionsEntity.Type): void {
    if (!SemaphoreOptionsEntity.validate(options)) {
      throw new SemaphoreError('Semaphore options must contain a positive integer permits value and a non-negative integer maximumQueueSize when provided.');
    }
  }

  protected readonly hooks: HookInvoker = new HookInvoker();
  #activeCount: number;
  #available: number;
  #grantState: SemaphoreGrantStateEntity.Type;
  readonly #grantMachine = new SemaphoreGrantMachine();
  #headWaiter: SemaphoreWaiterInterface | undefined;
  readonly #idleWaiters = new Set<() => void>();
  readonly #maximumQueueSize: number;
  #permits: number;
  #queuedCount: number;
  #tailWaiter: SemaphoreWaiterInterface | undefined;
  readonly #waiterMachine = new SemaphoreWaiterMachine();

  protected constructor(options: SemaphoreOptionsEntity.Type) {
    Semaphore.#validate(options);
    this.#activeCount = 0;
    this.#available = options.permits;
    this.#grantState = this.#grantMachine.getInitialState();
    this.#headWaiter = undefined;
    this.#maximumQueueSize = options.maximumQueueSize ?? 0;
    this.#permits = options.permits;
    this.#queuedCount = 0;
    this.#tailWaiter = undefined;
  }

  get activeCount(): number {
    const result = this.#activeCount;
    return result;
  }

  get available(): number {
    const result = this.#available;
    return result;
  }

  get maximumQueueSize(): number {
    const result = this.#maximumQueueSize;
    return result;
  }

  get permits(): number {
    const result = this.#permits;
    return result;
  }

  get queuedCount(): number {
    const result = this.#queuedCount;
    return result;
  }

  async acquire(options: SemaphoreAcquireOptionsInterface = {}): Promise<() => Promise<void>> {
    const signal = options.signal;
    if (Semaphore.#isAborted(signal)) {
      throw RuntimeError.create('Semaphore acquisition was aborted');
    }

    if (this.#available > 0 && this.#headWaiter === undefined) {
      const permitsBefore = this.#available;
      this.#available -= 1;
      this.#activeCount += 1;
      try {
        await this.hooks.invokeAsync('onAcquire', () => {
          const result = this.onAcquire(permitsBefore);
          return result;
        });
      } catch (error) {
        this.#activeCount -= 1;
        this.#available += 1;
        await this.#grantReadyWaiters();
        this.#notifyIdleWaiters();
        throw error;
      }
      const release = this.#buildRelease();
      return release;
    }

    if (this.#maximumQueueSize > 0 && this.#queuedCount >= this.#maximumQueueSize) {
      throw new SemaphoreQueueFullError(this.#maximumQueueSize);
    }

    const waiterResult = Promise.withResolvers<() => Promise<void>>();
    void waiterResult.promise.catch(() => {
      return undefined;
    });
    const abortResult = Promise.withResolvers<never>();
    void abortResult.promise.catch(() => {
      return undefined;
    });
    const onAbort = (): void => {
      if (waiter === undefined || waiter.state.variant === 'cancelled') {
        return;
      }
      this.#discardWaiter(waiter);
      const error = RuntimeError.create('Semaphore acquisition was aborted');
      abortResult.reject(error);
      waiter.reject(error);
      void this.#grantReadyWaiters();
      this.#notifyIdleWaiters();
    };
    const unregisterAbort = (): void => {
      signal?.removeEventListener('abort', onAbort);
    };
    const waiter: SemaphoreWaiterInterface = {
      'next': undefined,
      'previous': undefined,
      'queued': false,
      'reject': waiterResult.reject,
      'resolve': waiterResult.resolve,
      'state': this.#waiterMachine.getInitialState(),
      'unregisterAbort': unregisterAbort
    };
    this.#enqueueWaiter(waiter);
    signal?.addEventListener('abort', onAbort, { 'once': true });
    if (Semaphore.#isAborted(signal)) {
      onAbort();
      return await waiterResult.promise;
    }
    const queueLength = this.#queuedCount;

    try {
      await Promise.race([
        this.#prepareWaiter(waiter, queueLength),
        abortResult.promise
      ]);
    } catch (error) {
      if (waiter.state.variant !== 'cancelled') {
        this.#discardWaiter(waiter);
      }
      await this.#grantReadyWaiters();
      this.#notifyIdleWaiters();
      throw error;
    }

    await this.#grantReadyWaiters();
    return await waiterResult.promise;
  }

  async setPermits(permits: number): Promise<void> {
    if (!Number.isInteger(permits) || permits < 1) {
      throw new SemaphoreError('permits must be a positive integer');
    }
    const difference = permits - this.#permits;
    this.#permits = permits;
    this.#available += difference;
    await this.#grantReadyWaiters();
    this.#notifyIdleWaiters();
  }

  async waitForIdle(): Promise<void> {
    if (this.#isIdle()) {
      return;
    }
    await new Promise<void>((resolve) => {
      this.#idleWaiters.add(resolve);
    });
  }

  async withPermit<T>(
    callback: () => Promise<T>,
    options: SemaphoreAcquireOptionsInterface = {}
  ): Promise<T> {
    const release = await this.acquire(options);
    try {
      const result = await callback();
      return result;
    } finally {
      await release();
    }
  }

  #buildRelease(): () => Promise<void> {
    let released = false;
    return async (): Promise<void> => {
      if (released) {
        return;
      }
      released = true;
      await this.#release();
    };
  }

  #discardWaiter(waiter: SemaphoreWaiterInterface): void {
    if (waiter.state.variant !== 'cancelled') {
      waiter.state = this.#waiterMachine.transition(waiter.state, { 'type': 'markCancelled' }).state;
    }
    this.#removeWaiter(waiter);
    waiter.unregisterAbort();
  }

  #isWaiterCancelled(waiter: SemaphoreWaiterInterface): boolean {
    const result = waiter.state.variant === 'cancelled';
    return result;
  }

  #enqueueWaiter(waiter: SemaphoreWaiterInterface): void {
    const tail = this.#tailWaiter;
    waiter.queued = true;
    waiter.previous = tail;
    waiter.next = undefined;
    if (tail === undefined) {
      this.#headWaiter = waiter;
    } else {
      tail.next = waiter;
    }
    this.#tailWaiter = waiter;
    this.#queuedCount += 1;
  }

  async #prepareWaiter(waiter: SemaphoreWaiterInterface, queueLength: number): Promise<void> {
    await this.hooks.invokeAsync('onAcquireWait', () => {
      const result = this.onAcquireWait();
      return result;
    });
    if (this.#isWaiterCancelled(waiter)) {
      return;
    }
    await this.hooks.invokeAsync('onContended', () => {
      const result = this.onContended(queueLength);
      return result;
    });
    if (this.#isWaiterCancelled(waiter)) {
      return;
    }
    waiter.state = this.#waiterMachine.transition(waiter.state, { 'type': 'markReady' }).state;
  }

  async #grantReadyWaiters(): Promise<number> {
    if (this.#grantState.variant === 'granting') {
      return 0;
    }

    this.#grantState = this.#grantMachine.transition(this.#grantState, { 'type': 'start' }).state;
    let delegated = 0;
    try {
      while (this.#available > 0) {
        const next = this.#headWaiter;
        if (next?.state.variant !== 'ready') {
          break;
        }
        this.#removeWaiter(next);
        if (await this.#delegate(next)) {
          delegated += 1;
        }
      }
    } finally {
      this.#grantState = this.#grantMachine.transition(this.#grantState, { 'type': 'finish' }).state;
      this.#notifyIdleWaiters();
    }
    return delegated;
  }

  async #delegate(waiter: SemaphoreWaiterInterface): Promise<boolean> {
    this.#activeCount += 1;
    this.#available -= 1;
    try {
      await this.hooks.invokeAsync('onReleaseDelegated', () => {
        const result = this.onReleaseDelegated();
        return result;
      });
    } catch (error) {
      this.#activeCount -= 1;
      this.#available += 1;
      waiter.unregisterAbort();
      waiter.reject(error);
      return false;
    }

    if (waiter.state.variant === 'cancelled') {
      this.#activeCount -= 1;
      this.#available += 1;
      return false;
    }

    waiter.unregisterAbort();
    waiter.resolve(this.#buildRelease());
    return true;
  }

  #isIdle(): boolean {
    const result = this.#activeCount === 0 && this.#queuedCount === 0;
    return result;
  }

  #notifyIdleWaiters(): void {
    if (!this.#isIdle()) {
      return;
    }
    for (const resolve of this.#idleWaiters) {
      resolve();
    }
    this.#idleWaiters.clear();
  }

  #removeWaiter(waiter: SemaphoreWaiterInterface): boolean {
    if (!waiter.queued) {
      return false;
    }
    const previous = waiter.previous;
    const next = waiter.next;
    if (previous === undefined) {
      this.#headWaiter = next;
    } else {
      previous.next = next;
    }
    if (next === undefined) {
      this.#tailWaiter = previous;
    } else {
      next.previous = previous;
    }
    waiter.next = undefined;
    waiter.previous = undefined;
    waiter.queued = false;
    this.#queuedCount -= 1;
    return true;
  }

  async #release(): Promise<void> {
    this.#activeCount -= 1;
    this.#available += 1;
    try {
      if (this.#headWaiter === undefined && this.#grantState.variant === 'idle') {
        await this.hooks.invokeAsync('onRelease', () => {
          const result = this.onRelease(this.#available);
          return result;
        });
        return;
      }
      const delegated = await this.#grantReadyWaiters();
      if (delegated === 0 && this.#headWaiter === undefined && this.#grantState.variant === 'idle') {
        await this.hooks.invokeAsync('onRelease', () => {
          const result = this.onRelease(this.#available);
          return result;
        });
      }
    } finally {
      this.#notifyIdleWaiters();
    }
  }

  static #isAborted(signal: AbortSignal | undefined): boolean {
    const result = signal?.aborted === true;
    return result;
  }

  /**
   * Fires when a permit is granted immediately.
   * `permitsBefore` is the available count before decrement.
   * A failure aborts the acquisition and returns the reserved permit.
   */
  protected onAcquire(_permitsBefore: number): void {}

  /**
   * Fires when the caller had to queue.
   * A failure cancels the queued acquisition.
   */
  protected onAcquireWait(): void {}

  /**
   * Fires when a new waiter is added to the queue.
   * `queueLength` is the queue length after admission.
   * A failure cancels the queued acquisition.
   */
  protected onContended(_queueLength: number): void {}

  /**
   * Fires when a permit is returned to the pool with no waiting callers.
   * `permitsAfter` is the available count after increment.
   * A failure rejects release after the permit is restored.
   */
  protected onRelease(_permitsAfter: number): void {}

  /**
   * Fires when a permit is handed to a queued waiter.
   * A failure rejects that acquisition and leaves the permit available for
   * the next queued waiter.
   */
  protected onReleaseDelegated(): void {}
}
