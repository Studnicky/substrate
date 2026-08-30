import type { FileSystemInterface } from '@studnicky/virtual-fs';

import { type ClockProviderInterface, RealTimeClockProvider } from '@studnicky/clock';
import { type HookInvocationError, HookInvoker, RuntimeError } from '@studnicky/errors';
import { Delay, RealTimeScheduler, type SchedulerProviderInterface } from '@studnicky/scheduler';
import { Predicates } from '@studnicky/types';

import type { FileLockPathStateEntity } from './entities/FileLockPathStateEntity.js';
import type { FileLockStateInterface } from './FileLockStateInterface.js';
import type { FileLockCreateOptionsInterface, LockInterface, OwnerTokenInterface } from './interfaces/index.js';

import { FileLockOptionsEntity } from './entities/FileLockOptionsEntity.js';
import { FileLockConfigError } from './errors/FileLockConfigError.js';
import { FileLockContentionError } from './errors/FileLockContentionError.js';
import { FileLockMachine } from './FileLockMachine.js';
import { FileLockTimeoutError } from './FileLockTimeoutError.js';
import { FileRenameLock } from './FileRenameLock.js';
import { LockPathHelpers } from './LockPathHelpers.js';
import { NodeFileSystem } from './NodeFileSystem.js';
import { NodeOwnerToken } from './NodeOwnerToken.js';

interface FileLockInternalOptionsInterface {
  readonly 'clock': ClockProviderInterface;
  readonly 'fs': FileSystemInterface;
  readonly 'lockPath': FileLockPathStateEntity.Type['lockPath'];
  readonly 'originalPath': FileLockPathStateEntity.Type['originalPath'];
  readonly 'renameLock': FileRenameLock;
  readonly 'scheduler': SchedulerProviderInterface;
}

interface FileLockSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

/**
 * `Symbol.dispose` support for a constructed lock. A symbol-keyed class
 * member is always a computed `PropertyDefinition`/`MethodDefinition` —
 * forbidden by `@studnicky/v8/computed-class-properties` regardless of how
 * it's written — so this is declared as a standalone interface instead, and
 * `FileLock.create()` attaches the implementation onto the instance at
 * runtime via `Reflect.set` (not a bracket `MemberExpression`, so
 * `dynamicPropertyAccess` doesn't apply; not `Object.defineProperty`/
 * `Reflect.defineProperty` or a `.prototype` target, so `defineProperty` and
 * `prototypeModification` don't apply either).
 */
interface FileLockDisposableInterface {
  [Symbol.dispose](): void;
}

class FileLockInstance {
  static belongsTo<TInstance extends object>(
    constructor: FileLockSubclassInterface<TInstance>,
    value: object
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }

  static hasDispose(value: object): value is FileLockDisposableInterface {
    const result = Symbol.dispose in value;
    return result;
  }
}

/**
 * Process-level advisory file lock using atomic rename.
 *
 * Acquire a lock via `FileLock.create`. While held,
 * the target file is renamed to a PID-scoped lock path. Call `release()` (or
 * `using`) to rename it back.
 *
 * The bare class performs NO observability of its own — it exposes protected
 * lifecycle hooks (`onAcquireStart`, `onAcquireWait`, `onContended`,
 * `onAcquire`, `onRelease`, `onTimeout`, `onError`) that a consumer overrides to add logging/timing/metrics. Hook
 * overrides must not throw or block.
 *
 * @example Subclass with logging
 * ```typescript
 * class LoggedLock extends FileLock {
 *   protected override onAcquireWait(path: string, attempt: number): void {
 *     console.log(`[file-lock] waiting attempt=${attempt} path=${path}`);
 *   }
 * }
 * const lock = await LoggedLock.create({ path: '/tmp/queue.json' });
 * ```
 */
export class FileLock implements LockInterface {
  /** Swallows hook failures after the composed invoker records them. */
  static readonly #OwnedHookInvoker = class FileLockHookInvoker extends HookInvoker {
    protected override onHookError(): void {}
  };

  static async create<TInstance extends FileLock = FileLock>(
    this: FileLockSubclassInterface<TInstance>,
    options: FileLockCreateOptionsInterface
  ): Promise<FileLockDisposableInterface & TInstance> {
    const schemaOptions = FileLockOptionsEntity.intake({
      'path': options.path,
      ...(options.pollMs !== undefined ? { 'pollMs': options.pollMs } : {}),
      ...(options.timeoutMs !== undefined ? { 'timeoutMs': options.timeoutMs } : {})
    });

    const { path, pollMs, timeoutMs } = schemaOptions;

    const fs: FileSystemInterface = options.fileSystem ?? new NodeFileSystem();
    const clock: ClockProviderInterface = options.clock ?? RealTimeClockProvider.create();
    const ownerToken: OwnerTokenInterface = options.ownerToken ?? new NodeOwnerToken();
    const scheduler: SchedulerProviderInterface = options.scheduler ?? RealTimeScheduler.create();
    const lockPath = `${path}.lock.${ownerToken.get()}`;
    const renameLock = FileRenameLock.create({ 'fileSystem': fs, 'ownerToken': ownerToken, 'path': path });

    const resolveSubclassConstructor = (): FileLockSubclassInterface<TInstance> => {
      return this;
    };

    // Construct instance first so protected hooks can fire during acquisition.
    const constructed: unknown = Reflect.construct(resolveSubclassConstructor(), [
      { 'clock': clock, 'fs': fs, 'lockPath': lockPath, 'originalPath': path, 'renameLock': renameLock, 'scheduler': scheduler }
    ]);
    if (!Predicates.isObjectLike(constructed) || !FileLockInstance.belongsTo(resolveSubclassConstructor(), constructed)) {
      throw new FileLockConfigError('FileLock.create() did not construct the requested subclass.');
    }

    const dispose = (): void => {
      constructed.release();
    };

    Reflect.set(constructed, Symbol.dispose, dispose);

    if (!FileLockInstance.hasDispose(constructed)) {
      throw new FileLockConfigError('FileLock.create() failed to attach Symbol.dispose');
    }

    await constructed.#acquire(path, pollMs, timeoutMs);
    return constructed;
  }

  static readonly #machine = new FileLockMachine();

  readonly #fs: FileSystemInterface;
  readonly #clock: ClockProviderInterface;
  readonly #lockPath: string;
  readonly #originalPath: string;
  readonly #renameLock: FileRenameLock;
  readonly #scheduler: SchedulerProviderInterface;
  #state: FileLockStateInterface;

  protected readonly hooks: HookInvoker;

  protected constructor(options: FileLockInternalOptionsInterface) {
    this.#clock = options.clock;
    this.#fs = options.fs;
    this.#originalPath = options.originalPath;
    this.#lockPath = options.lockPath;
    this.#renameLock = options.renameLock;
    this.#scheduler = options.scheduler;
    this.#state = FileLock.#machine.getInitialState();
    this.hooks = new FileLock.#OwnedHookInvoker();
  }

  // ---------------------------------------------------------------------------
  // Internal acquisition loop (replaces the inline Promise body in create).
  // Runs on the constructed instance so all hooks fire as `this`.
  // ---------------------------------------------------------------------------

  async #acquire(path: string, pollMs: number, timeoutMs: number): Promise<void> {
    const deadline = this.#clock.now() + timeoutMs;
    let attempt = 0;

    this.hooks.invoke('onAcquireStart', () => {
      const result = this.onAcquireStart(path);
      return result;
    });

    // Pre-flight: if the file has never been created (neither the target path nor any
    // lock variant exists), bail immediately rather than waiting the full timeout.
    // When a holder has the file, they renamed it to a `.lock.<pid>` path, so `path`
    // is absent but the file still exists as a lock — polling makes sense.
    if (!this.#fs.existsSync(path) && !this.#anyLockExists(path)) {
      this.hooks.invoke('onTimeout', () => {
        const result = this.onTimeout(path);
        return result;
      });
      throw new FileLockTimeoutError(path, timeoutMs);
    }

    let acquired = false;
    while (!acquired) {
      acquired = this.#attemptAcquire(path, deadline, timeoutMs);
      if (acquired) {
        continue;
      }

      attempt += 1;
      this.hooks.invoke('onAcquireWait', () => {
        const acquireWaitResult = this.onAcquireWait(path, attempt);
        return acquireWaitResult;
      });
      await Delay.sleep(pollMs, { 'clock': this.#clock, 'scheduler': this.#scheduler });
    }

    return;
  }

  #attemptAcquire(path: string, deadline: number, timeoutMs: number): boolean {
    try {
      this.#renameLock.acquire();
      this.#state = FileLock.#machine.transition(this.#state, { 'type': 'acquired' }).state;
      this.hooks.invoke('onAcquire', () => {
        const acquireResult = this.onAcquire(path);
        return acquireResult;
      });
      return true;
    } catch (error) {
      const actualError = Predicates.isError(error) ? error : RuntimeError.create(String(error));
      if (!(actualError instanceof FileLockContentionError)) {
        this.hooks.invoke('onError', () => {
          const errorResult = this.onError(path, actualError);
          return errorResult;
        });
        throw actualError;
      }

      if (this.#clock.now() >= deadline) {
        this.hooks.invoke('onTimeout', () => {
          const timeoutResult = this.onTimeout(path);
          return timeoutResult;
        });
        throw new FileLockTimeoutError(path, timeoutMs);
      }

      this.hooks.invoke('onContended', () => {
        const contendedResult = this.onContended(path);
        return contendedResult;
      });
      return false;
    }
  }

  /**
   * Check whether a `.lock.<token>` variant of the given path exists.
   * Used to detect contention pre-flight: if any process has renamed the file,
   * a lock variant will be present even when the original path is absent.
   */
  #anyLockExists(path: string): boolean {
    try {
      const dir = LockPathHelpers.dirname(path);
      const base = LockPathHelpers.basename(path);
      const entries = this.#fs.readdirSync(dir);
      const lockPrefix = `${base}.lock.`;
      const entriesLength = entries.length;
      for (let i = 0; i < entriesLength; i++) {
        if ((entries.at(i) ?? '').startsWith(lockPrefix)) { return true; }
      }
      return false;
    } catch {
      // If we can't read the directory, assume no lock file exists.
      return false;
    }
  }

  read(): string {
    const result = this.#fs.readFileSync(this.#lockPath, 'utf8');
    return result;
  }

  write(content: string): void {
    this.#fs.writeFileSync(this.#lockPath, content, 'utf8');
  }

  release(): void {
    if (this.#state.variant !== 'held') { return; }
    this.#state = FileLock.#machine.transition(this.#state, { 'type': 'released' }).state;
    this.#renameLock.release();
    this.hooks.invoke('onRelease', () => {
      const result = this.onRelease(this.#originalPath);
      return result;
    });
  }

  /** Count of hook failures recorded by `onHookError` since construction. */
  get hookErrorCount(): number {
    const result = this.hooks.hookErrorCount;
    return result;
  }

  /** Returns detached diagnostics for every hook failure recorded since construction. */
  getHookErrors(): readonly HookInvocationError[] {
    const result = [...this.hooks.getHookErrors()];
    return result;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. The bare class does NO observability;
  // override these to add logging/timing/metrics. Overrides must not throw or
  // block — they are called synchronously on the hot path.
  // ---------------------------------------------------------------------------

  /** Fires once when acquisition begins, before the first rename attempt. */
  protected onAcquireStart(_path: string): void {}

  /**
   * Fires before each poll sleep when the lock file is not yet available.
   * `attempt` is 1-based (first wait = 1).
   */
  protected onAcquireWait(_path: string, _attempt: number): void {}

  /**
   * Fires immediately when a rename attempt fails with ENOENT — another
   * holder has already renamed `path` away to its own lock path.
   * Called on every contended attempt, before the sleep.
   */
  protected onContended(_path: string): void {}

  /** Fires once the rename succeeds and the lock is held. */
  protected onAcquire(_path: string): void {}

  /** Fires after the file is renamed back to the original path on release. */
  protected onRelease(_path: string): void {}

  /** Fires when the deadline elapses and acquisition is abandoned. */
  protected onTimeout(_path: string): void {}

  /**
   * Fires when a rename attempt fails with any code other than ENOENT (e.g.
   * ENOSPC, EACCES, EROFS, EPERM). The acquisition rejects immediately with
   * this same error rather than continuing to poll.
   */
  protected onError(_path: string, _error: Error): void {}
}
