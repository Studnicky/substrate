import type { FileSystemInterface } from '@studnicky/virtual-fs';

import type { FileLockCreateOptionsType } from './FileLockCreateOptionsType.js';
import type { OwnerTokenInterface } from './OwnerTokenInterface.js';

import { DEFAULT_POLL_MS, DEFAULT_TIMEOUT_MS } from './constants/FileLockDefaults.js';
import { FileLockOptionsEntity } from './entities/FileLockOptionsEntity.js';
import { FileLockConfigError } from './errors/FileLockConfigError.js';
import { FileLockBuilder } from './FileLockBuilder.js';
import { FileLockTimeoutError } from './FileLockTimeoutError.js';
import { LockPathHelpers } from './LockPathHelpers.js';
import { NodeFileSystem } from './NodeFileSystem.js';
import { NodeOwnerToken } from './NodeOwnerToken.js';

// json-schema-uninexpressible: `fs` is a FileSystemInterface — a behavioral interface of methods (existsSync, readFileSync, etc.), not plain data
type FileLockInternalOptions = {
  readonly 'fs': FileSystemInterface;
  readonly 'lockPath': string;
  readonly 'originalPath': string;
};

/**
 * Process-level advisory file lock using atomic rename.
 *
 * Acquire a lock via `FileLock.create` or `FileLock.builder()`. While held,
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
  static builder(): FileLockBuilder {
    // Factory closure so `create` retains its `this` binding when the builder calls it.
    const result = FileLockBuilder.create((options) => {
      const lock = FileLock.create(options);
      return lock;
    });
    return result;
  }

  static async create(options: FileLockCreateOptionsType): Promise<FileLock> {
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

  /**
   * Alias for `FileLock.create({ path, ...options })`.
   * Uses `this.create()` so subclasses retain their prototype through this alias.
   */
  // json-schema-uninexpressible: `fileSystem`/`ownerToken` are behavioral interfaces (methods like existsSync, get), not plain data
  static async acquire(
    path: string,
    options?: {
      'fileSystem'?: FileSystemInterface;
      'ownerToken'?: OwnerTokenInterface;
      'pollMs'?: number;
      'timeoutMs'?: number;
    }
  ): Promise<FileLock> {
    const result = await this.create({ 'path': path, ...options });
    return result;
  }

  readonly #fs: FileSystemInterface;
  readonly #lockPath: string;
  readonly #originalPath: string;
  #released = false;

  protected constructor(options: FileLockInternalOptions) {
    this.#fs = options.fs;
    this.#originalPath = options.originalPath;
    this.#lockPath = options.lockPath;
  }

  // ---------------------------------------------------------------------------
  // Internal acquisition loop (replaces the inline Promise body in create).
  // Runs on the constructed instance so all hooks fire as `this`.
  // ---------------------------------------------------------------------------

  async #acquire(path: string, lockPath: string, pollMs: number, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let attempt = 0;

    this.#invokeHook(() => { this.onAcquireStart(path); });

    // Pre-flight: if the file has never been created (neither the target path nor any
    // lock variant exists), bail immediately rather than waiting the full timeout.
    // When a holder has the file, they renamed it to a `.lock.<pid>` path, so `path`
    // is absent but the file still exists as a lock — polling makes sense.
    if (!this.#fs.existsSync(path) && !this.#anyLockExists(path)) {
      this.#invokeHook(() => { this.onTimeout(path); });
      return await Promise.reject(new FileLockTimeoutError(path, timeoutMs));
    }

    return await new Promise<void>((resolve, reject) => {
      const poll = (): void => {
        try {
          this.#fs.renameSync(path, lockPath);
          this.#invokeHook(() => { this.onAcquire(path); });
          resolve();
        } catch (error: unknown) {
          if (Date.now() >= deadline) {
            this.#invokeHook(() => { this.onTimeout(path); });
            reject(new FileLockTimeoutError(path, timeoutMs));
            return;
          }

          // Rename failed — another holder has the file (it was renamed to a lock path,
          // making our source ENOENT) or a transient filesystem error.
          if (error instanceof Error) {
            this.#invokeHook(() => { this.onContended(path); });
          } else {
            this.#invokeHook(() => { this.onError(path, new Error(String(error))); });
          }

          attempt += 1;
          this.#invokeHook(() => { this.onAcquireWait(path, attempt); });
          setTimeout(poll, pollMs);
        }
      };
      poll();
    });
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
    this.#invokeHook(() => { this.onRelease(this.#originalPath); });
  }

  #invokeHook(hook: () => void): void {
    try {
      hook();
    } catch {}
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
   * Fires immediately when a rename attempt fails because another holder
   * has the lock (ENOENT on lock path, EBUSY, ENOTEMPTY, etc.).
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
   * Fires when a filesystem error that is neither a contention-related errno
   * nor an ENOENT is caught during an acquisition attempt.
   */
  protected onError(_path: string, _error: Error): void {}
}
