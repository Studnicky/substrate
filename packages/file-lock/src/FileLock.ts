import type { FileSystemInterface } from '@studnicky/virtual-fs';

import { type HookInvocationError, HookInvoker } from '@studnicky/errors';

import type { FileLockPathStateEntity } from './entities/FileLockPathStateEntity.js';
import type { FileLockCreateOptionsInterface } from './FileLockCreateOptionsInterface.js';
import type { OwnerTokenInterface } from './OwnerTokenInterface.js';

import { DEFAULT_POLL_MS, DEFAULT_TIMEOUT_MS } from './constants/FileLockDefaults.js';
import { FileLockOptionsEntity } from './entities/FileLockOptionsEntity.js';
import { FileLockConfigError } from './errors/FileLockConfigError.js';
import { FileLockTimeoutError } from './FileLockTimeoutError.js';
import { LockPathHelpers } from './LockPathHelpers.js';
import { NodeFileSystem } from './NodeFileSystem.js';
import { NodeOwnerToken } from './NodeOwnerToken.js';

interface FileLockInternalOptionsInterface {
  readonly 'fs': FileSystemInterface;
  readonly 'lockPath': FileLockPathStateEntity.Type['lockPath'];
  readonly 'originalPath': FileLockPathStateEntity.Type['originalPath'];
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
 * `onAcquire`, `onRelease`, `onStaleDetected`, `onStaleBreak`, `onTimeout`,
 * `onError`) that a consumer overrides to add logging/timing/metrics. Hook
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
export class FileLock {
  /** Swallows hook failures after the composed invoker records them. */
  static readonly #OwnedHookInvoker = class FileLockHookInvoker extends HookInvoker {
    protected override onHookError(_hookName: string, _cause: unknown): void {}
  };

  static async create(options: FileLockCreateOptionsInterface): Promise<FileLock> {
    const schemaOptions: FileLockOptionsEntity.Type = {
      'path': options.path,
      ...(options.pollMs !== undefined ? { 'pollMs': options.pollMs } : {}),
      ...(options.timeoutMs !== undefined ? { 'timeoutMs': options.timeoutMs } : {})
    };

    if (!FileLockOptionsEntity.validate(schemaOptions)) {
      const messages = (FileLockOptionsEntity.validate.errors ?? [])
        .map((e) => {
          return e.message ?? String(e);
        })
        .join('; ');
      return await Promise.reject(new FileLockConfigError(messages.length > 0 ? messages : 'invalid options'));
    }

    const { path, pollMs = DEFAULT_POLL_MS, timeoutMs = DEFAULT_TIMEOUT_MS } = schemaOptions;

    const fs: FileSystemInterface = options.fileSystem ?? new NodeFileSystem();
    const ownerToken: OwnerTokenInterface = options.ownerToken ?? new NodeOwnerToken();
    const lockPath = `${path}.lock.${ownerToken.get()}`;

    // Construct instance first so protected hooks can fire during acquisition.
    const instance = new this({ 'fs': fs, 'lockPath': lockPath, 'originalPath': path });
    await instance.#acquire(path, lockPath, pollMs, timeoutMs);
    return instance;
  }

  readonly #fs: FileSystemInterface;
  readonly #lockPath: string;
  readonly #originalPath: string;
  #released = false;

  protected readonly hooks: HookInvoker;

  protected constructor(options: FileLockInternalOptionsInterface) {
    this.#fs = options.fs;
    this.#originalPath = options.originalPath;
    this.#lockPath = options.lockPath;
    this.hooks = new FileLock.#OwnedHookInvoker();
  }

  // ---------------------------------------------------------------------------
  // Internal acquisition loop (replaces the inline Promise body in create).
  // Runs on the constructed instance so all hooks fire as `this`.
  // ---------------------------------------------------------------------------

  async #acquire(path: string, lockPath: string, pollMs: number, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
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
      return await Promise.reject(new FileLockTimeoutError(path, timeoutMs));
    }

    return await new Promise<void>((resolve, reject) => {
      const poll = (): void => {
        try {
          this.#fs.renameSync(path, lockPath);
          this.hooks.invoke('onAcquire', () => {
            const result = this.onAcquire(path);
            return result;
          });
          resolve();
        } catch (error: unknown) {
          // Rename failed. ENOENT means another holder already renamed `path` away
          // (expected contention for this lock's race); any other code (or no code
          // at all) is a genuine filesystem failure that must fail fast.
          if (!FileLock.#isContentionError(error)) {
            const actualError = error instanceof Error ? error : new Error(String(error));
            this.hooks.invoke('onError', () => {
              const result = this.onError(path, actualError);
              return result;
            });
            reject(actualError);
            return;
          }

          if (Date.now() >= deadline) {
            this.hooks.invoke('onTimeout', () => {
              const result = this.onTimeout(path);
              return result;
            });
            reject(new FileLockTimeoutError(path, timeoutMs));
            return;
          }

          this.hooks.invoke('onContended', () => {
            const result = this.onContended(path);
            return result;
          });

          attempt += 1;
          this.hooks.invoke('onAcquireWait', () => {
            const result = this.onAcquireWait(path, attempt);
            return result;
          });
          setTimeout(poll, pollMs);
        }
      };
      poll();
    });
  }

  /**
   * True when `error` represents ENOENT — the source path is gone because
   * another holder already renamed it to its own lock path. Checks the real
   * `NodeJS.ErrnoException.code` (native `fs`) and falls back to the
   * conventional `ENOENT: ...` message prefix (fakes that model an errno in
   * text, e.g. `@studnicky/virtual-fs`, without a matching `.code`).
   */
  static #isContentionError(error: unknown): boolean {
    if (!(error instanceof Error)) { return false; }
    if ('code' in error && error.code === 'ENOENT') { return true; }
    return error.message.startsWith('ENOENT');
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
      for (const entry of entries) {
        if (entry.startsWith(lockPrefix)) { return true; }
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
    if (this.#released) { return; }
    this.#released = true;
    this.#fs.renameSync(this.#lockPath, this.#originalPath);
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
    const result = this.hooks.getHookErrors();
    return result;
  }

  [Symbol.dispose](): void {
    this.release();
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

  /**
   * Fires when a stale lock file is detected (e.g. from a dead PID).
   * Not triggered automatically by the base class because stale detection
   * requires caller-supplied heuristics. Override together with `onStaleBreak`
   * in a subclass that adds stale-lock recovery logic.
   */
  protected onStaleDetected(_path: string): void {}

  /**
   * Fires after a stale lock file has been broken (removed / renamed away).
   * Not triggered by the base class; intended for subclasses that implement
   * stale-lock recovery on top of the base acquisition loop.
   */
  protected onStaleBreak(_path: string): void {}

  /** Fires when the deadline elapses and acquisition is abandoned. */
  protected onTimeout(_path: string): void {}

  /**
   * Fires when a rename attempt fails with any code other than ENOENT (e.g.
   * ENOSPC, EACCES, EROFS, EPERM). The acquisition rejects immediately with
   * this same error rather than continuing to poll.
   */
  protected onError(_path: string, _error: Error): void {}
}
