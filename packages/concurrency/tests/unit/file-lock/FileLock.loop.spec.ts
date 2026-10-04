import type { StatResultInterface } from '@studnicky/virtual-fs/interfaces';
import type { FileSystemInterface } from '@studnicky/virtual-fs/node';

import { RuntimeError } from '@studnicky/errors/node';
import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite, TestWorkspace } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import {
  FileLock,
  FileLockConfigError,
  FileLockTimeoutError
} from '../../../src/file-lock/node/index.js';
import { FileLockScenarioCaseEntity } from './entities/FileLockScenarioCaseEntity.js';
import scenarioGroups from './FileLock.scenarios.json' with { 'type': 'json' };

/** A filesystem failure carrying a Node-style `code`: only `code` and `message` matter to `FileRenameLock`'s `'code' in error` check. */
class FaultyFileSystemError extends BaseError {
  public override readonly name: string = 'FaultyFileSystemError';

  public constructor(code: string, message: string) {
    super({
      'code': code,
      'message': message,
      'retryable': false
    });
  }
}

/** The stat result every `FaultyFileSystem` path reports: a regular file. */
class RegularFileStat implements StatResultInterface {
  public readonly mtimeMs: number = 0;

  public isDirectory(): boolean {
    return false;
  }

  public isFile(): boolean {
    return true;
  }
}

class FaultyFileSystem implements FileSystemInterface {
  readonly #code: string;
  readonly #message: string;

  public constructor(code: string, message: string) {
    this.#code = code;
    this.#message = message;
  }

  existsSync(): boolean {
    return true;
  }
  mkdirSync(): void {}
  readdirSync(): string[] {
    return [];
  }
  readFileSync(): string {
    return '';
  }
  renameSync(): void {
    throw new FaultyFileSystemError(this.#code, this.#message);
  }
  statSync(): StatResultInterface {
    return new RegularFileStat();
  }
  unlinkSync(): void {}
  writeFileSync(): void {}
}

class RecordingFileLock extends FileLock {
  readonly events: { 'extra'?: number | string; 'hook': string; 'path': string }[] = [];

  protected override onAcquireStart(path: string): void {
    this.events.push({ 'hook': 'onAcquireStart', 'path': path });
  }

  protected override onAcquireWait(path: string, attempt: number): void {
    this.events.push({ 'extra': attempt, 'hook': 'onAcquireWait', 'path': path });
  }

  protected override onContended(path: string): void {
    this.events.push({ 'hook': 'onContended', 'path': path });
  }

  protected override onAcquire(path: string): void {
    this.events.push({ 'hook': 'onAcquire', 'path': path });
  }

  protected override onRelease(path: string): void {
    this.events.push({ 'hook': 'onRelease', 'path': path });
  }

  protected override onTimeout(path: string): void {
    this.events.push({ 'hook': 'onTimeout', 'path': path });
  }

  protected override onError(path: string, error: Error): void {
    this.events.push({ 'extra': error.message, 'hook': 'onError', 'path': path });
  }
}

/** A lock that records every hook name it fires, in order. */
class HookNameRecordingFileLock extends FileLock {
  static readonly recorded: string[] = [];

  protected override onAcquireStart(): void {
    HookNameRecordingFileLock.recorded.push('onAcquireStart');
  }

  protected override onAcquireWait(): void {
    HookNameRecordingFileLock.recorded.push('onAcquireWait');
  }

  protected override onContended(): void {
    HookNameRecordingFileLock.recorded.push('onContended');
  }

  protected override onTimeout(): void {
    HookNameRecordingFileLock.recorded.push('onTimeout');
  }
}

/** A lock whose `onAcquire` hook throws a message derived from the locked path. */
class IsolatedFailureLock extends FileLock {
  protected override onAcquire(path: string): void {
    throw RuntimeError.create(`hook failure for ${path}`);
  }
}

/** A lock whose `onAcquire` hook throws a fixed, scenario-supplied message. */
class ThrowingAcquireHookLock extends FileLock {
  static message = 'hook boom';

  protected override onAcquire(): void {
    throw RuntimeError.create(ThrowingAcquireHookLock.message);
  }
}

/** A lock that captures the contention-path hooks with their arguments. */
class CapturingFileLock extends FileLock {
  static readonly captured: { 'extra'?: number | string; 'hook': string; 'path': string }[] = [];

  protected override onAcquireStart(path: string): void {
    CapturingFileLock.captured.push({ 'hook': 'onAcquireStart', 'path': path });
  }

  protected override onAcquireWait(path: string, attempt: number): void {
    CapturingFileLock.captured.push({ 'extra': attempt, 'hook': 'onAcquireWait', 'path': path });
  }

  protected override onContended(path: string): void {
    CapturingFileLock.captured.push({ 'hook': 'onContended', 'path': path });
  }

  protected override onTimeout(path: string): void {
    CapturingFileLock.captured.push({ 'hook': 'onTimeout', 'path': path });
  }
}

/** A lock that records filesystem-error and contention hook arguments. */
class ErrorRoutingFileLock extends FileLock {
  static readonly contendedEvents: string[] = [];
  static readonly errorEvents: { 'message': string; 'path': string }[] = [];

  protected override onError(path: string, error: Error): void {
    ErrorRoutingFileLock.errorEvents.push({ 'message': error.message, 'path': path });
  }

  protected override onContended(path: string): void {
    ErrorRoutingFileLock.contendedEvents.push(path);
  }
}

/** A lock whose `onAcquire` hook hands back a rejected promise carrying `hookCause`; the hook is installed once when the class is defined. */
class AsyncRejectingAcquireLock extends FileLock {
  static hookCause: RuntimeError = RuntimeError.create('unset hook cause');

  static {
    Object.assign(AsyncRejectingAcquireLock.prototype, {
      'onAcquire': () => {
        const rejection = Promise.reject(AsyncRejectingAcquireLock.hookCause);
        return rejection;
      }
    });
  }
}

/** A lock whose `Symbol.dispose` member is present, not callable, and read-only; the member is installed and frozen once when the class is defined. */
class NonDisposableFileLock extends FileLock {
  static {
    Object.assign(NonDisposableFileLock.prototype, { [Symbol.dispose]: 'not-callable' });
    Object.freeze(NonDisposableFileLock.prototype);
  }
}

class FileLockRunners {
  static async 'acquire-success-restores-path'(
    scenarioCase: ScenarioCaseOfType<
      FileLockScenarioCaseEntity.Type,
      'acquire-success-restores-path'
    >
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const path = workspace.write(scenarioCase.input.path, scenarioCase.input.content);
    const lock = await FileLock.create({ 'path': path });
    assert.equal(
      workspace.exists(scenarioCase.input.path),
      scenarioCase.expected.existedDuringLock
    );
    lock.release();
    assert.equal(
      workspace.exists(scenarioCase.input.path),
      scenarioCase.expected.existedAfterRelease
    );
  }

  static async 'async-rejecting-onAcquire-guarded'(
    scenarioCase: ScenarioCaseOfType<
      FileLockScenarioCaseEntity.Type,
      'async-rejecting-onAcquire-guarded'
    >
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const path = workspace.write(scenarioCase.input.path, scenarioCase.input.content);
    const hookCause = RuntimeError.create(scenarioCase.expected.hookCauseMessage, {
      'cause': { 'details': { 'attempt': 1 } }
    });
    AsyncRejectingAcquireLock.hookCause = hookCause;
    const rejectionEvents: unknown[] = [];
    const listener = (reason: unknown): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', listener);
    try {
      const lock = await AsyncRejectingAcquireLock.create({ 'path': path });
      await FileLockRunners.flushImmediate();
      await FileLockRunners.flushImmediate();
      assert.strictEqual(rejectionEvents.length, 0);
      assert.strictEqual(lock.hookErrorCount, 1);
      const firstDiagnostic = lock.getHookErrors()[0];
      const secondDiagnostic = lock.getHookErrors()[0];
      assert.strictEqual(firstDiagnostic?.hookName, 'onAcquire');
      assert.ok(firstDiagnostic?.cause instanceof Error);
      assert.ok(secondDiagnostic?.cause instanceof Error);
      assert.ok(firstDiagnostic !== secondDiagnostic);
      assert.ok(firstDiagnostic.cause !== hookCause);
      assert.ok(firstDiagnostic.cause !== secondDiagnostic.cause);
      firstDiagnostic.cause.message = 'mutated projection';
      assert.strictEqual(secondDiagnostic.cause.message, scenarioCase.expected.hookCauseMessage);
      assert.strictEqual(lock.hookErrorCount, 1);
      lock.release();
    } finally {
      process.off('unhandledRejection', listener);
    }
  }

  static async 'bare-relative-filename-contention'(
    scenarioCase: ScenarioCaseOfType<
      FileLockScenarioCaseEntity.Type,
      'bare-relative-filename-contention'
    >
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const originalCwd = process.cwd();
    process.chdir(workspace.root);
    try {
      workspace.write(scenarioCase.input.filename, scenarioCase.input.content);
      const holder = await FileLock.create({ 'path': scenarioCase.input.filename });
      assert.equal(
        workspace.exists(scenarioCase.input.filename),
        scenarioCase.expected.existedDuringLock
      );
      await assert.rejects(
        FileLock.create({ 'path': scenarioCase.input.filename, ...scenarioCase.input.fileLock }),
        FileLockTimeoutError
      );
      holder.release();
      assert.equal(
        workspace.exists(scenarioCase.input.filename),
        scenarioCase.expected.existedAfterRelease
      );
    } finally {
      process.chdir(originalCwd);
    }
  }

  static async 'contention-times-out'(
    scenarioCase: ScenarioCaseOfType<FileLockScenarioCaseEntity.Type, 'contention-times-out'>
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const path = workspace.write(scenarioCase.input.path, scenarioCase.input.content);
    const lock = await FileLock.create({ 'path': path });
    await assert.rejects(
      FileLock.create({ 'path': path, ...scenarioCase.input.fileLock }),
      (thrown) => {
        const error: unknown = thrown;
        const matches =
          Boolean(scenarioCase.expected.timedOut) && error instanceof FileLockTimeoutError;
        return matches;
      }
    );
    lock.release();
  }

  static async 'genuine-fs-error-routes-to-onError'(
    scenarioCase: ScenarioCaseOfType<
      FileLockScenarioCaseEntity.Type,
      'genuine-fs-error-routes-to-onError'
    >
  ): Promise<void> {
    ErrorRoutingFileLock.errorEvents.length = 0;
    ErrorRoutingFileLock.contendedEvents.length = 0;
    const fileSystemError = scenarioCase.input.fileSystemError;
    const start = Date.now();
    await assert.rejects(
      ErrorRoutingFileLock.create({
        'fileSystem': new FaultyFileSystem(fileSystemError.code, fileSystemError.message),
        'path': scenarioCase.input.path,
        ...scenarioCase.input.fileLock
      }),
      (thrown) => {
        const error: unknown = thrown;
        const matches =
          error instanceof Error &&
          error.message.includes(scenarioCase.expected.errorMessageIncludes);
        return matches;
      }
    );
    const elapsed = Date.now() - start;
    assert.strictEqual(ErrorRoutingFileLock.errorEvents.length, scenarioCase.expected.errorCount);
    assert.strictEqual(ErrorRoutingFileLock.errorEvents[0]?.path, scenarioCase.input.path);
    assert.ok(
      ErrorRoutingFileLock.errorEvents[0]?.message.includes(
        scenarioCase.expected.errorMessageIncludes
      )
    );
    assert.strictEqual(
      ErrorRoutingFileLock.contendedEvents.length,
      scenarioCase.expected.contendedCount
    );
    assert.ok(elapsed < scenarioCase.input.fileLock.timeoutMs);
  }

  static async 'hook-acquire-start-and-acquire'(
    scenarioCase: ScenarioCaseOfType<
      FileLockScenarioCaseEntity.Type,
      'hook-acquire-start-and-acquire'
    >
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const path = workspace.write(scenarioCase.input.path, scenarioCase.input.content);
    const lock = await RecordingFileLock.create({ 'path': path });
    const starts = FileLockRunners.eventsNamed(lock.events, 'onAcquireStart');
    const acquires = FileLockRunners.eventsNamed(lock.events, 'onAcquire');
    assert.strictEqual(starts.length, scenarioCase.expected.startCount);
    assert.strictEqual(starts[0]?.path, path);
    assert.strictEqual(acquires.length, scenarioCase.expected.acquireCount);
    assert.strictEqual(acquires[0]?.path, path);
    assert.ok(
      FileLockRunners.firstIndexOf(lock.events, 'onAcquireStart') <
        FileLockRunners.firstIndexOf(lock.events, 'onAcquire')
    );
    lock.release();
  }

  static async 'hook-contention-wait-and-timeout'(
    scenarioCase: ScenarioCaseOfType<
      FileLockScenarioCaseEntity.Type,
      'hook-contention-wait-and-timeout'
    >
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const path = workspace.write(scenarioCase.input.path, scenarioCase.input.content);
    const first = await RecordingFileLock.create({ 'path': path });
    CapturingFileLock.captured.length = 0;
    let contendedLock: CapturingFileLock | undefined;
    let caughtError: unknown;
    try {
      contendedLock = await CapturingFileLock.create({
        'path': path,
        ...scenarioCase.input.fileLock
      });
    } catch (error) {
      caughtError = error;
    }
    assert.ok(caughtError instanceof FileLockTimeoutError);
    assert.ok(contendedLock === undefined);
    const contentions = FileLockRunners.eventsNamed(CapturingFileLock.captured, 'onContended');
    const waits = FileLockRunners.eventsNamed(CapturingFileLock.captured, 'onAcquireWait');
    const timeouts = FileLockRunners.eventsNamed(CapturingFileLock.captured, 'onTimeout');
    assert.ok(contentions.length >= scenarioCase.expected.minimumContentions);
    assert.ok(waits.length >= scenarioCase.expected.minimumWaits);
    assert.strictEqual(timeouts.length, scenarioCase.expected.timeoutCount);
    assert.ok(contentions.length === waits.length);
    for (let index = 0; index < waits.length; index += 1) {
      assert.strictEqual(waits[index]?.extra, index + 1);
    }
    first.release();
  }

  static async 'hook-errors-isolated-per-instance'(
    scenarioCase: ScenarioCaseOfType<
      FileLockScenarioCaseEntity.Type,
      'hook-errors-isolated-per-instance'
    >
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const firstPath = workspace.write(
      scenarioCase.input.first.path,
      scenarioCase.input.first.content
    );
    const secondPath = workspace.write(
      scenarioCase.input.second.path,
      scenarioCase.input.second.content
    );
    const first = await IsolatedFailureLock.create({ 'path': firstPath });
    const second = await IsolatedFailureLock.create({ 'path': secondPath });
    try {
      const firstError = first.getHookErrors()[0];
      const secondError = second.getHookErrors()[0];
      assert.strictEqual(first.hookErrorCount, 1);
      assert.strictEqual(second.hookErrorCount, 1);
      assert.strictEqual(firstError?.hookName, 'onAcquire');
      assert.strictEqual(secondError?.hookName, 'onAcquire');
      assert.ok(firstError?.cause instanceof Error);
      assert.ok(secondError?.cause instanceof Error);
      assert.strictEqual(firstError.cause.message, `hook failure for ${firstPath}`);
      assert.strictEqual(secondError.cause.message, `hook failure for ${secondPath}`);
    } finally {
      first.release();
      second.release();
    }
  }

  static async 'hook-idempotent-release'(
    scenarioCase: ScenarioCaseOfType<FileLockScenarioCaseEntity.Type, 'hook-idempotent-release'>
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const path = workspace.write(scenarioCase.input.path, scenarioCase.input.content);
    const lock = await RecordingFileLock.create({ 'path': path });
    lock.release();
    lock.release();
    const releases = FileLockRunners.eventsNamed(lock.events, 'onRelease');
    assert.strictEqual(releases.length, scenarioCase.expected.releaseCount);
  }

  static async 'hook-order'(
    scenarioCase: ScenarioCaseOfType<FileLockScenarioCaseEntity.Type, 'hook-order'>
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const path = workspace.write(scenarioCase.input.path, scenarioCase.input.content);
    const holder = await FileLock.create({ 'path': path });
    HookNameRecordingFileLock.recorded.length = 0;
    await assert.rejects(
      HookNameRecordingFileLock.create({ 'path': path, ...scenarioCase.input.fileLock }),
      FileLockTimeoutError
    );
    const distinctOrder: string[] = [];
    const seen = new Set<string>();
    for (let index = 0; index < HookNameRecordingFileLock.recorded.length; index += 1) {
      const hook = String(HookNameRecordingFileLock.recorded[index]);
      if (seen.has(hook) === false) {
        seen.add(hook);
        distinctOrder.push(hook);
      }
    }
    assert.deepEqual(distinctOrder, scenarioCase.expected.order);
    holder.release();
  }

  static async 'hook-release-original-path'(
    scenarioCase: ScenarioCaseOfType<FileLockScenarioCaseEntity.Type, 'hook-release-original-path'>
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const path = workspace.write(scenarioCase.input.path, scenarioCase.input.content);
    const lock = await RecordingFileLock.create({ 'path': path });
    lock.release();
    const releases = FileLockRunners.eventsNamed(lock.events, 'onRelease');
    assert.strictEqual(releases.length, scenarioCase.expected.releaseCount);
    assert.strictEqual(releases[0]?.path, path);
  }

  static async 'hook-timeout'(
    scenarioCase: ScenarioCaseOfType<FileLockScenarioCaseEntity.Type, 'hook-timeout'>
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const path = workspace.resolve(scenarioCase.input.path);
    let lock: RecordingFileLock | undefined;
    let caughtError: unknown;
    try {
      lock = await RecordingFileLock.create({ 'path': path, ...scenarioCase.input.fileLock });
    } catch (error) {
      caughtError = error;
    }
    assert.equal(
      caughtError instanceof FileLockTimeoutError,
      Boolean(scenarioCase.expected.timedOut)
    );
    assert.ok(lock === undefined);
  }

  static async 'poll-and-timeout-options'(
    scenarioCase: ScenarioCaseOfType<FileLockScenarioCaseEntity.Type, 'poll-and-timeout-options'>
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const path = workspace.write(scenarioCase.input.path, scenarioCase.input.content);
    const firstLock = await FileLock.create({ 'path': path });
    await assert.rejects(
      FileLock.create({ 'path': path, ...scenarioCase.input.fileLock }),
      (thrown) => {
        const error: unknown = thrown;
        const matches =
          Boolean(scenarioCase.expected.timedOut) && error instanceof FileLockTimeoutError;
        return matches;
      }
    );
    firstLock.release();
  }

  static async 'read-after-create'(
    scenarioCase: ScenarioCaseOfType<FileLockScenarioCaseEntity.Type, 'read-after-create'>
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const path = workspace.write(scenarioCase.input.path, scenarioCase.input.content);
    const lock = await FileLock.create({ 'path': path });
    assert.strictEqual(lock.read(), scenarioCase.expected.content);
    lock.release();
  }

  static async 'release-idempotent'(
    scenarioCase: ScenarioCaseOfType<FileLockScenarioCaseEntity.Type, 'release-idempotent'>
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const path = workspace.write(scenarioCase.input.path, scenarioCase.input.content);
    const lock = await FileLock.create({ 'path': path });
    lock.release();
    lock.release();
  }

  static async 'symbol-dispose-hook'(
    scenarioCase: ScenarioCaseOfType<FileLockScenarioCaseEntity.Type, 'symbol-dispose-hook'>
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const path = workspace.write(scenarioCase.input.path, scenarioCase.input.content);
    const lock = await RecordingFileLock.create({ 'path': path });
    lock[Symbol.dispose]();
    const releases = FileLockRunners.eventsNamed(lock.events, 'onRelease');
    assert.strictEqual(releases.length, 1);
  }

  static async 'symbol-dispose-releases'(
    scenarioCase: ScenarioCaseOfType<FileLockScenarioCaseEntity.Type, 'symbol-dispose-releases'>
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const path = workspace.write(scenarioCase.input.path, scenarioCase.input.content);
    const lock = await FileLock.create({ 'path': path });
    assert.equal(
      workspace.exists(scenarioCase.input.path),
      scenarioCase.expected.existedDuringLock
    );
    lock[Symbol.dispose]();
    assert.equal(
      workspace.exists(scenarioCase.input.path),
      scenarioCase.expected.existedAfterDispose
    );
  }

  static async 'throwing-onAcquire-does-not-orphan-lock'(
    scenarioCase: ScenarioCaseOfType<
      FileLockScenarioCaseEntity.Type,
      'throwing-onAcquire-does-not-orphan-lock'
    >
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const path = workspace.write(scenarioCase.input.path, scenarioCase.input.content);
    ThrowingAcquireHookLock.message = scenarioCase.input.hookErrorMessage;
    const lock = await ThrowingAcquireHookLock.create({ 'path': path });
    assert.ok(workspace.exists(scenarioCase.input.path) === false);
    lock.release();
    assert.equal(workspace.exists(scenarioCase.input.path), !scenarioCase.expected.orphaned);
  }

  static async 'timeout-missing-file'(
    scenarioCase: ScenarioCaseOfType<FileLockScenarioCaseEntity.Type, 'timeout-missing-file'>
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    await assert.rejects(
      FileLock.create({
        'path': workspace.resolve(scenarioCase.input.path),
        ...scenarioCase.input.fileLock
      }),
      (thrown) => {
        const error: unknown = thrown;
        const matches =
          Boolean(scenarioCase.expected.timedOut) && error instanceof FileLockTimeoutError;
        return matches;
      }
    );
  }

  static async 'write-then-release-restores-new-content'(
    scenarioCase: ScenarioCaseOfType<
      FileLockScenarioCaseEntity.Type,
      'write-then-release-restores-new-content'
    >
  ): Promise<void> {
    using workspace = TestWorkspace.create('file-lock-tests-');
    const path = workspace.write(scenarioCase.input.path, scenarioCase.input.originalContent);
    const lock = await FileLock.create({ 'path': path });
    lock.write(scenarioCase.input.updatedContent);
    lock.release();
    assert.ok(workspace.exists(scenarioCase.input.path));
    assert.strictEqual(workspace.read(scenarioCase.input.path), scenarioCase.expected.content);
  }

  static declaresNonCallableDispose(): void {
    void it('rejects a non-callable Symbol.dispose member', async () => {
      using workspace = TestWorkspace.create('file-lock-tests-');
      await assert.rejects(
        NonDisposableFileLock.create({ 'path': workspace.resolve('non-callable-dispose') }),
        FileLockConfigError
      );
    });
  }

  private static eventsNamed(
    events: readonly { 'extra'?: number | string; 'hook': string; 'path': string }[],
    hookName: string
  ): { 'extra'?: number | string; 'hook': string; 'path': string }[] {
    const named: { 'extra'?: number | string; 'hook': string; 'path': string }[] = [];
    for (let index = 0; index < events.length; index += 1) {
      const event = events[index];
      if (event?.hook === hookName) {
        named.push(event);
      }
    }
    return named;
  }

  private static firstIndexOf(events: readonly { 'hook': string }[], hookName: string): number {
    let found = -1;
    for (let index = 0; index < events.length && found === -1; index += 1) {
      if (events[index]?.hook === hookName) {
        found = index;
      }
    }
    return found;
  }

  private static flushImmediate(): Promise<void> {
    const flushed = new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    return flushed;
  }
}

ScenarioSuite.register({
  'entity': FileLockScenarioCaseEntity,
  'extraTests': FileLockRunners.declaresNonCallableDispose,
  'file': scenarioGroups,
  'name': 'FileLock',
  'runners': FileLockRunners
});
