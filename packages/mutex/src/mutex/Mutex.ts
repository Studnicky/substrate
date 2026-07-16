/**
 * Mutex - Key-based mutual exclusion for async operations
 *
 * Provides fine-grained locking where operations on different keys can run
 * concurrently, but operations on the same key are serialized via a queue.
 *
 * Perfect for preventing race conditions in entity resolution where multiple
 * threads may try to resolve entities with the same identity keys.
 *
 * @example
 * ```typescript
 * const mutex = Mutex.create<string>({
 *   maxQueueSize: 100,
 *   timeout: 5000
 * });
 *
 * // These run concurrently (different keys)
 * await Promise.all([
 *   mutex.runExclusive('user1', async () => resolveUser('user1')),
 *   mutex.runExclusive('user2', async () => resolveUser('user2'))
 * ]);
 *
 * // These run serially (same key)
 * await Promise.all([
 *   mutex.runExclusive('user1', async () => resolveUser('user1')),
 *   mutex.runExclusive('user1', async () => resolveUser('user1'))  // Waits for first
 * ]);
 * ```
 */

import type { LockMetricsEntity } from '../entities/LockMetricsEntity.js';
import type { MutexConfigEntity } from '../entities/MutexConfigEntity.js';
import type { MutexStatsEntity } from '../entities/MutexStatsEntity.js';
import type {
  MutexInterface,
  MutexLockInterface
} from '../interfaces/index.js';
import type { MutexKeyStateType } from '../types/MutexKeyStateType.js';

import {
  EMPTY_LENGTH,
  FIRST_ARRAY_INDEX,
  INCREMENT_BY_ONE,
  INITIAL_COUNTER,
  NOT_FOUND_INDEX,
  UNLIMITED_QUEUE_SIZE
} from '../constants/index.js';
import {
  LockTimeoutError,
  QueueSizeExceededError
} from '../errors/index.js';
import { configInternal } from './configInternal.js';
import { MutexBuilder } from './MutexBuilder.js';

// json-schema-uninexpressible: reject/resolve are callback function fields, not JSON-representable
type QueueEntryType = {
  'queuedAt': number;
  'reject': (error: Error) => void;
  'resolve': (release: () => void) => void;
  'timeoutId': ReturnType<typeof setTimeout> | undefined;
};

// json-schema-uninexpressible: promise is a Promise instance, not a JSON-representable value
type InFlightOperationType = {
  'promise': Promise<unknown>;
  'waitersCount': number;
};

/**
 * Key-based mutual exclusion for async operations.
 *
 * Provides fine-grained locking where operations on different keys run
 * concurrently, but operations on the same key are serialized via a queue.
 * Ideal for preventing race conditions in entity resolution where multiple
 * threads may resolve entities with the same identity keys.
 *
 * Subclass and override the protected lifecycle hooks to add observability
 * without coupling the base class to any logging or metrics library:
 *
 * @example Subclass with custom observability
 * ```typescript
 * class InstrumentedMutex extends Mutex<string> {
 *   protected override afterAcquire(key: string, waitTimeMs: number): void {
 *     metrics.histogram('mutex.wait', waitTimeMs, { key });
 *   }
 *   protected override beforeRelease(key: string, holdTimeMs: number): void {
 *     metrics.histogram('mutex.hold', holdTimeMs, { key });
 *   }
 * }
 * ```
 *
 * @typeParam K - The type of keys used for locking (defaults to string)
 */
export class Mutex<K extends PropertyKey = string> implements MutexInterface<K> {
  /**
   * Create a new Mutex instance with validated configuration
   *
   * @param config - Partial configuration object (validated in constructor)
   * @returns New Mutex instance
   *
   * @example
   * ```typescript
   * const mutex = Mutex.create<string>({
   *   maxQueueSize: 100,
   *   timeout: 5000,
   *   debug: true
   * });
   * ```
   */
  static create<K extends PropertyKey = string>(
    config?: Partial<MutexConfigEntity.Type>
  ): Mutex<K> {
    return new this(config);
  }

  /**
   * Create a MutexBuilder for fluent configuration of a Mutex instance.
   *
   * @returns MutexBuilder instance
   */
  static builder<K extends PropertyKey = string>(): MutexBuilder<K> {
    const builder = MutexBuilder.create<K>((options) => {
      return new this(options);
    });
    return builder;
  }

  readonly #keyStates: Map<K, MutexKeyStateType>;

  private coalescedCount = INITIAL_COUNTER;
  private readonly config: MutexConfigEntity.Type;
  private readonly inFlightOperations: Map<K, InFlightOperationType>;
  private readonly lockMetrics: Map<K, LockMetricsEntity.Type>;
  private readonly locks: Set<K>;
  private readonly observers: (() => void)[] = [];
  private readonly queues: Map<K, QueueEntryType[]>;
  private totalExecuted = INITIAL_COUNTER;

  #invokeHook(invoke: () => void): void {
    try {
      invoke();
    } catch {}
  }

  /**
   * Constructor validates and initializes Mutex
   *
   * @param config - Partial configuration object (validated internally, defaults applied)
   */
  protected constructor(config?: Partial<MutexConfigEntity.Type>) {
    this.#keyStates = new Map();
    this.locks = new Set();
    this.queues = new Map();
    this.lockMetrics = new Map();
    this.inFlightOperations = new Map();
    this.config = configInternal.validateConfig(config);
  }

  /**
   * Acquire a lock for the given key
   *
   * Returns a promise that resolves to a release function when the lock is acquired.
   * The lock must be manually released by calling the returned release function.
   *
   * @param key - The key to lock on
   * @returns Promise that resolves to a release function
   * @throws {QueueSizeExceededError} If maxQueueSize is exceeded
   * @throws {LockTimeoutError} If timeout is exceeded
   *
   * @example
   * ```typescript
   * const release = await mutex.acquire('user1');
   * try {
   *   // Critical section - guaranteed exclusive access for this key
   *   await performOperation();
   * } finally {
   *   release();  // Always release in finally block
   * }
   * ```
   */
  async acquire(key: K): Promise<() => void> {
    const requestedAt = Date.now();

    try {
      this.beforeAcquire(key);
    } catch {
      // hook errors must not interrupt acquisition
    }

    // If lock not held, acquire immediately
    if (!this.locks.has(key)) {
      return this.acquireImmediate(key, requestedAt);
    }

    // Lock is held, check queue size limit
    const queue = this.queues.get(key) ?? [];

    this.validateQueueSize(key, queue);

    try {
      this.onContended(key, queue.length);
    } catch {
      // hook errors must not interrupt acquisition
    }

    return await this.createQueuedAcquisition(key, queue, requestedAt);
  }

  /**
   * Acquire a disposable lock for use with `await using` syntax (Node.js 24+)
   *
   * Returns a MutexLockInterface that automatically releases when the scope exits.
   * This eliminates the need for try/finally blocks.
   *
   * @param key - The key to lock on
   * @returns Promise that resolves to a MutexLockInterface with automatic disposal
   * @throws {QueueSizeExceededError} If maxQueueSize is exceeded
   * @throws {LockTimeoutError} If timeout is exceeded
   *
   * @example
   * ```typescript
   * // Automatic cleanup with await using (Node.js 24+)
   * await using lock = await mutex.acquireDisposable('user1');
   * // Critical section - guaranteed exclusive access
   * await performOperation();
   * // Lock automatically released when scope exits
   * ```
   *
   * @example
   * ```typescript
   * // Also supports manual release if needed
   * const lock = await mutex.acquireDisposable('user1');
   * try {
   *   await performOperation();
   * } finally {
   *   lock.release();
   * }
   * ```
   */
  async acquireDisposable(key: K): Promise<MutexLockInterface> {
    const release = await this.acquire(key);
    let released = false;

    const doRelease = (): void => {
      if (!released) {
        released = true;
        release();
      }
    };

    const lockBase: Record<string, unknown> = {
      'key': key,
      'release': doRelease
    };
    (lockBase as Record<symbol, unknown>)[Symbol.asyncDispose] = async (): Promise<void> => {
      // Async disposal pattern - ensure proper Promise resolution
      await Promise.resolve();

      if (!released) {
        released = true;
        release();
      }
    };
    return lockBase as unknown as MutexLockInterface;
  }

  /**
   * Fires before a lock is acquired (immediately or queued).
   * Override in a subclass to add pre-acquisition observability.
   */
  protected beforeAcquire(_key: K): void {}

  /**
   * Fires after a lock is acquired, with wait time in ms.
   * Override in a subclass to record wait-time metrics.
   */
  protected afterAcquire(_key: K, _waitTimeMs: number): void {}

  /**
   * Fires when acquiring a lock finds contention (key is already locked).
   * Override in a subclass to track queue depth at contention time.
   */
  protected onContended(_key: K, _queueSize: number): void {}

  /**
   * Fires before a lock is released, with hold time in ms.
   * Override in a subclass to record hold-time metrics.
   */
  protected beforeRelease(_key: K, _holdTimeMs: number): void {}

  /**
   * Fires after a lock is fully released (queue processed or lock dropped).
   * Override in a subclass to react to the lock becoming free.
   */
  protected afterRelease(_key: K): void {}

  /**
   * Fires when lock acquisition times out.
   * Override in a subclass to record timeout events.
   */
  protected onTimeout(_key: K, _timeoutMs: number): void {}

  /**
   * Fires only when a queued waiter finally acquires the lock (never fires for immediate grants).
   * Override in a subclass to measure per-caller queue wait times.
   */
  protected onAcquireWait(_key: K, _waitTimeMs: number): void {}

  /**
   * Fires on every lock release by its holder, before any handoff or drop.
   * Override in a subclass to observe every release regardless of queue state.
   */
  protected onRelease(_key: K): void {}

  /**
   * Fires when the last waiter for a key leaves the queue (by acquiring or timing out).
   * Override in a subclass to react when contention for a key fully clears.
   */
  protected onQueueDrain(_key: K): void {}

  // ── Per-key FSM ──────────────────────────────────────────────────────────

  /**
   * Transition the per-key FSM to `to`.
   *
   * When `key` is absent from `#keyStates` it is treated as `'unlocked'`.
   * Throws if `guardKey` rejects the edge.
   */
  protected transitionKey(key: K, to: MutexKeyStateType): void {
    const from = this.#keyStates.get(key) ?? 'unlocked';

    if (!this.guardKey(from, to)) {
      throw new Error(`Illegal state transition: ${from} → ${to} for key ${String(key)}`);
    }

    this.#keyStates.set(key, to);
    this.#invokeHook(() => {
      this.onEnterKey(key, to, from);
    });
  }

  /**
   * Returns true if the `from → to` edge is legal for per-key FSM.
   *
   * Legal edges:
   * - `unlocked → locked`
   * - `locked → queued`
   * - `queued → locked`
   * - `locked → unlocked`
   */
  protected guardKey(from: MutexKeyStateType, to: MutexKeyStateType): boolean {
    if (from === 'unlocked' && to === 'locked') {return true;}
    if (from === 'locked' && to === 'queued') {return true;}
    if (from === 'queued' && to === 'locked') {return true;}
    if (from === 'locked' && to === 'unlocked') {return true;}

    return false;
  }

  /**
   * Hook called when the per-key FSM enters a new state.
   * Override in a subclass to observe or react to per-key state changes.
   */
  protected onEnterKey(_key: K, _to: MutexKeyStateType, _from: MutexKeyStateType): void {}

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Handle immediate lock acquisition when lock is not held
   */
  private acquireImmediate(key: K, requestedAt: number): () => void {
    this.locks.add(key);
    this.transitionKey(key, 'locked');
    const acquiredAt = Date.now();

    this.lockMetrics.set(key, { 'acquiredAt': acquiredAt });
    this.totalExecuted++;

    const waitTimeMs = acquiredAt - requestedAt;

    try {
      this.afterAcquire(key, waitTimeMs);
    } catch {
      // hook errors must not interrupt acquisition
    }

    return this.createReleaseFunction(key);
  }

  /**
   * Clear all locks (use with caution!)
   *
   * This forcibly clears all locks without releasing them properly.
   * Should only be used in error recovery or shutdown scenarios.
   *
   * @example
   * ```typescript
   * // Emergency cleanup
   * mutex.clear();
   * ```
   */
  clear(): void {
    for (const queue of this.queues.values()) {
      const queueLen = queue.length;
      for (let i = 0; i < queueLen; i += 1) {
        const entry = queue[i]!;
        if (entry.timeoutId !== undefined) {
          clearTimeout(entry.timeoutId);
        }
        entry.reject(new Error('Mutex cleared - all pending operations rejected'));
      }
    }

    // FSM: force all active per-key machines to unlocked before wiping state
    for (const [key, keyState] of this.#keyStates) {
      if (keyState !== 'unlocked') {
        this.#keyStates.set(key, 'unlocked');
        this.#invokeHook(() => {
          this.onEnterKey(key, 'unlocked', keyState);
        });
      }
    }

    this.#keyStates.clear();
    this.locks.clear();
    this.queues.clear();
    this.lockMetrics.clear();
    this.inFlightOperations.clear();
  }

  /**
   * Wait for all active and queued operations to complete
   *
   * Returns a promise that resolves when the mutex becomes idle
   * (no active locks and empty queues).
   *
   * @returns Promise that resolves when the mutex is idle
   *
   * @example Wait for completion in tests
   * ```typescript
   * await Promise.all(operations);
   * await mutex.completeQueue();  // Ensure mutex is fully idle
   * ```
   *
   * @example Wait for completion before shutdown
   * ```typescript
   * const operations = keys.map(key => mutex.runExclusive(key, () => processKey(key)));
   * await Promise.all(operations);
   * await mutex.completeQueue();  // Wait for internal state to settle
   * console.log('All operations complete');
   * ```
   */
  completeQueue(): Promise<void> {
    if (this.isComplete()) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.observers.push(resolve);
    });
  }

  /**
   * Handle resolution of a queued acquisition
   */
  private handleQueuedResolution(
    releaseFunction: () => void,
    key: K,
    requestedAt: number,
    resolve: (value: () => void) => void
  ): void {
    const acquiredAt = Date.now();

    this.lockMetrics.set(key, { 'acquiredAt': acquiredAt });
    this.totalExecuted++;

    const waitTimeMs = acquiredAt - requestedAt;

    try {
      this.afterAcquire(key, waitTimeMs);
    } catch {
      // hook errors must not interrupt acquisition
    }

    resolve(releaseFunction);

    this.#invokeHook(() => {
      this.onAcquireWait(key, waitTimeMs);
    });
  }

  /**
   * Create queued lock acquisition with optional timeout
   */
  private createQueuedAcquisition(
    key: K,
    queue: QueueEntryType[],
    requestedAt: number
  ): Promise<() => void> {
    const result = new Promise<() => void>((resolve, reject) => {
      const timeoutId = this.setupAcquisitionTimeout(key, reject);

      const handleResolve = (releaseFunction: () => void): void => {
        this.handleQueuedResolution(releaseFunction, key, requestedAt, resolve);
      };
      const entry: QueueEntryType = {
        'queuedAt': requestedAt,
        'reject': reject,
        'resolve': handleResolve,
        'timeoutId': timeoutId
      };

      queue.push(entry);
      this.queues.set(key, queue);

      // FSM: locked → queued (first waiter queued; subsequent waiters keep it queued)
      const currentState = this.#keyStates.get(key) ?? 'unlocked';

      if (currentState === 'locked') {
        this.transitionKey(key, 'queued');
      }
    });
    return result;
  }

  /**
   * Create release function with key captured in closure
   * Guards against double-release by checking lock existence before releasing
   */
  private createReleaseFunction(key: K): () => void {
    return (): void => {
      if (this.locks.has(key)) {
        this.release(key);
      }
    };
  }

  /**
   * Execute a coalesced operation - acquires lock, runs function, resolves/rejects deferred
   * This is called without awaiting to avoid blocking the synchronous path
   */
  private async executeCoalescedOperation<T>(
    key: K,
    fn: () => Promise<T> | T,
    resolveDeferred: (value: T) => void,
    rejectDeferred: (error: Error) => void
  ): Promise<void> {
    let release: (() => void) | undefined;

    try {
      release = await this.acquire(key);

      const result = await fn();

      resolveDeferred(result);
    } catch (error) {
      rejectDeferred(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.inFlightOperations.delete(key);

      if (release !== undefined) {
        release();
      }
    }
  }

  /**
   * Get the current configuration
   *
   * @returns Current configuration object
   *
   * @example
   * ```typescript
   * const config = mutex.getConfig();
   * console.log(`Max queue size: ${config.maxQueueSize}`);
   * ```
   */
  getConfig(): Readonly<MutexConfigEntity.Type> {
    const config: MutexConfigEntity.Type = { ...this.config };
    return config;
  }

  /**
   * Get current mutex statistics
   *
   * @returns Mutex statistics object
   * @returns stats.activeLocksCount - Currently held locks
   * @returns stats.queuedCount - Operations waiting in queues across all keys
   * @returns stats.totalExecuted - Total locks acquired since creation
   * @returns stats.maxQueueSize - Maximum queue size per key (0 = unlimited)
   * @returns stats.timeout - Lock acquisition timeout in ms (0 = no timeout)
   *
   * @example Monitor mutex state
   * ```typescript
   * const stats = mutex.getStats();
   * console.log(`Active locks: ${stats.activeLocksCount}`);
   * console.log(`Queued: ${stats.queuedCount}`);
   * console.log(`Total executed: ${stats.totalExecuted}`);
   * ```
   */
  getStats(): MutexStatsEntity.Type {
    const stats: MutexStatsEntity.Type = {
      'activeLocksCount': this.locks.size,
      'coalescedCount': this.coalescedCount,
      'maxQueueSize': this.config.maxQueueSize,
      'queuedCount': this.getTotalQueuedCount(),
      'timeout': this.config.timeout,
      'totalExecuted': this.totalExecuted
    };
    return stats;
  }

  /**
   * Get total number of queued operations across all keys
   *
   * @returns Total queued count
   */
  private getTotalQueuedCount(): number {
    let total = INITIAL_COUNTER;

    for (const queue of this.queues.values()) {
      total += queue.length;
    }

    return total;
  }

  /**
   * Handle lock acquisition timeout
   */
  private handleAcquisitionTimeout(
    key: K,
    timeoutId: ReturnType<typeof setTimeout>,
    reject: (error: Error) => void
  ): void {
    const timeoutQueue = this.queues.get(key);

    if (timeoutQueue !== undefined) {
      const index = timeoutQueue.findIndex((entry) => {
        return entry.timeoutId === timeoutId;
      });

      if (index !== NOT_FOUND_INDEX) {
        timeoutQueue.splice(index, INCREMENT_BY_ONE);

        if (timeoutQueue.length === EMPTY_LENGTH) {
          this.queues.delete(key);
          this.#invokeHook(() => {
            this.onQueueDrain(key);
          });
          // FSM: the last waiter timed out; holder still holds the lock but queue is
          // now empty — transition queued → locked to reflect the unchallenged holder.
          const currentState = this.#keyStates.get(key) ?? 'unlocked';

          if (currentState === 'queued') {
            this.transitionKey(key, 'locked');
          }
        }
      }
    }

    this.#invokeHook(() => {
      this.onTimeout(key, this.config.timeout);
    });

    reject(new LockTimeoutError(key, this.config.timeout));
  }

  /**
   * Check if the mutex has completed all operations
   *
   * @returns True if no operations are active or queued
   *
   * @example
   * ```typescript
   * if (mutex.isComplete()) {
   *   console.log('Mutex has no pending work');
   * }
   * ```
   */
  isComplete(): boolean {
    return this.locks.size === EMPTY_LENGTH && this.queues.size === EMPTY_LENGTH;
  }

  /**
   * Check if a key is currently locked
   *
   * Semantic API method providing meaningful abstraction over internal state.
   * Validates key type and checks lock state in single operation.
   *
   * @param key - The key to check
   * @returns True if the key is locked, false otherwise
   *
   * @example
   * ```typescript
   * if (mutex.isLocked('user1')) {
   *   console.log('user1 is being processed');
   * }
   * ```
   */
  isLocked(key: K): boolean {
    const result = this.locks.has(key);
    return result;
  }

  /**
   * Join an existing in-flight operation
   */
  private joinInFlightOperation<T>(_key: K, inFlight: InFlightOperationType): Promise<T> {
    inFlight.waitersCount++;
    this.coalescedCount++;

    return inFlight.promise as Promise<T>;
  }

  /**
   * Notify all observers that the mutex is now idle
   */
  private notifyObservers(): void {
    const length = this.observers.length;

    for (let index = FIRST_ARRAY_INDEX; index < length; index++) {
      const observer = this.observers[index];

      if (observer !== undefined) {
        observer();
      }
    }
    this.observers.length = EMPTY_LENGTH;
  }

  /**
   * Process the next operation waiting in queue
   */
  private processNextInQueue(key: K, queue: QueueEntryType[]): void {
    const next = queue.shift();

    if (next !== undefined) {
      if (next.timeoutId !== undefined) {
        clearTimeout(next.timeoutId);
      }

      // FSM: queued → locked (next waiter takes the lock)
      this.transitionKey(key, 'locked');

      // If more waiters remain, key is still contended: locked → queued
      if (queue.length > EMPTY_LENGTH) {
        this.transitionKey(key, 'queued');
      }

      const releaseLock = (): void => { this.release(key); };

      next.resolve(releaseLock);
    }

    if (queue.length === EMPTY_LENGTH) {
      this.queues.delete(key);
      this.#invokeHook(() => {
        this.onQueueDrain(key);
      });
    }
  }

  /**
   * Get the queue size for a specific key
   *
   * @param key - The key to check
   * @returns Number of operations waiting in queue for this key
   *
   * @example
   * ```typescript
   * console.log(`Queue size for user1: ${mutex.queueSize('user1')}`);
   * ```
   */
  queueSize(key: K): number {
    const queue = this.queues.get(key);

    return queue !== undefined ? queue.length : EMPTY_LENGTH;
  }

  /**
   * Record metrics when lock is released and fire beforeRelease hook
   */
  private recordLockReleaseMetrics(key: K): void {
    const metrics = this.lockMetrics.get(key);
    const releasedAt = Date.now();

    if (metrics !== undefined) {
      const holdTimeMs = releasedAt - metrics.acquiredAt;

      try {
        this.beforeRelease(key, holdTimeMs);
      } catch {
        // hook errors must not interrupt release
      }
    }
  }

  /**
   * Release the lock for a key and process next in queue
   *
   * @param key - The key to release
   */
  private release(key: K): void {
    this.recordLockReleaseMetrics(key);

    this.#invokeHook(() => {
      this.onRelease(key);
    });

    const queue = this.queues.get(key);

    if (queue !== undefined && queue.length > EMPTY_LENGTH) {
      this.processNextInQueue(key, queue);
    } else {
      this.releaseLockCompletely(key);
    }
  }

  /**
   * Release lock completely when no one is waiting
   */
  private releaseLockCompletely(key: K): void {
    // FSM: locked → unlocked; then remove per-key entry (key no longer active)
    this.transitionKey(key, 'unlocked');
    this.#keyStates.delete(key);

    this.locks.delete(key);
    this.lockMetrics.delete(key);

    try {
      this.afterRelease(key);
    } catch {
      // hook errors must not interrupt release
    }

    if (this.locks.size === EMPTY_LENGTH && this.queues.size === EMPTY_LENGTH) {
      this.notifyObservers();
    }
  }

  /**
   * Execute a function with exclusive access to the given key
   *
   * Automatically acquires the lock, executes the function, and releases the lock.
   * Handles errors properly and ensures lock is always released.
   *
   * When coalescing is enabled, concurrent calls with the same key will share the
   * result of the first in-flight operation instead of queueing serially.
   *
   * @param key - The key to lock on
   * @param fn - The function to execute exclusively
   * @returns Promise that resolves to the function's return value
   * @throws {QueueSizeExceededError} If maxQueueSize is exceeded
   * @throws {LockTimeoutError} If timeout is exceeded
   *
   * @example
   * ```typescript
   * const result = await mutex.runExclusive('user1', async () => {
   *   // This code has exclusive access for key 'user1'
   *   return await resolveEntity('user1');
   * });
   * ```
   */
  async runExclusive<T>(key: K, fn: () => Promise<T> | T): Promise<T> {
    if (this.config.enableCoalescing) {
      return await this.runExclusiveCoalesced(key, fn);
    }

    return await this.runExclusiveStandard(key, fn);
  }

  /**
   * Execute with coalescing - concurrent calls share the result
   */
  private runExclusiveCoalesced<T>(key: K, fn: () => Promise<T> | T): Promise<T> {
    const inFlight = this.inFlightOperations.get(key);

    if (inFlight !== undefined) {
      return this.joinInFlightOperation<T>(key, inFlight);
    }

    return this.startCoalescedOperation(key, fn);
  }

  /**
   * Execute without coalescing - standard acquire/release pattern
   */
  private async runExclusiveStandard<T>(key: K, fn: () => Promise<T> | T): Promise<T> {
    const release = await this.acquire(key);

    return await Promise.resolve(fn()).then(
      (result) => {
        release();
        return result;
      },
      (error) => {
        release();
        throw error;
      }
    );
  }

  /**
   * Setup timeout for queued lock acquisition
   * Returns undefined if no timeout configured
   */
  private setupAcquisitionTimeout(
    key: K,
    reject: (error: Error) => void
  ): ReturnType<typeof setTimeout> | undefined {
    if (this.config.timeout <= INITIAL_COUNTER) {
      return undefined;
    }

    const onTimeout = (): void => { this.handleAcquisitionTimeout(key, timeoutHandle, reject); };
    const timeoutHandle = setTimeout(onTimeout, this.config.timeout);

    return timeoutHandle;
  }

  /**
   * Get the number of currently active locks
   *
   * Useful for monitoring and debugging.
   *
   * @returns Number of active locks
   *
   * @example
   * ```typescript
   * console.log(`Active locks: ${mutex.size()}`);
   * ```
   */
  size(): number {
    const result = this.locks.size;
    return result;
  }

  /**
   * Start a new coalesced operation
   */
  private startCoalescedOperation<T>(key: K, fn: () => Promise<T> | T): Promise<T> {
    let deferredResolve!: (value: T) => void;
    let deferredReject!: (error: Error) => void;
    const deferredPromise = new Promise<T>((resolve, reject) => {
      deferredResolve = resolve;
      deferredReject = reject;
    });

    this.inFlightOperations.set(key, {
      'promise': deferredPromise,
      'waitersCount': INCREMENT_BY_ONE
    });

    void this.executeCoalescedOperation(key, fn, deferredResolve, deferredReject);

    return deferredPromise;
  }

  /**
   * Validate queue size and throw if limit exceeded
   */
  private validateQueueSize(key: K, queue: QueueEntryType[]): void {
    if (this.config.maxQueueSize > UNLIMITED_QUEUE_SIZE && queue.length >= this.config.maxQueueSize) {
      throw new QueueSizeExceededError(key, this.config.maxQueueSize);
    }
  }

}
