import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, afterEach, describe, it } from 'node:test';

import type { FileSystemInterface } from '@studnicky/virtual-fs/node';
import type { StatResultInterface } from '@studnicky/virtual-fs/interfaces';

import { FileLock, FileLockConfigError, FileLockTimeoutError } from '../../src/node/index.js';
import { FileLockScenarioCaseEntity } from './entities/FileLockScenarioCaseEntity.js';
import scenarioGroups from './FileLock.scenarios.json' with { type: 'json' };

type ScenarioCase = FileLockScenarioCaseEntity.Type;
type ScenarioShape = ScenarioCase['shape'];
type ScenarioRunner<Shape extends ScenarioShape> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => Promise<void>;
type ScenarioRunnerMap = { readonly [Shape in ScenarioShape]: ScenarioRunner<Shape> };

/** The `pollMs`/`timeoutMs` override every contended-acquire branch carries under `input.fileLock`. */
type FileLockPollTimeoutConfig = { pollMs?: number; timeoutMs?: number };

/** The `{ code, message }` pair `genuine-fs-error-routes-to-onError` uses to script a thrown `FaultyFileSystem` failure. */
type FaultyFileSystemConfig = Extract<ScenarioCase, { shape: 'genuine-fs-error-routes-to-onError' }>['input']['fileSystemError'];

const fileIntake = ScenarioFileCompiler.compileIntake(FileLockScenarioCaseEntity.Schema, FileLockScenarioCaseEntity.Node);

let TEST_DIR = '';

class FileLockTestHelpers {
  public static makePath(name: string): string {
    return join(TEST_DIR, name);
  }
}

/** A filesystem failure carrying a Node-style `code`: only `code` and `message` matter to `FileRenameLock`'s `'code' in error` check. */
class FaultyFileSystemError extends BaseError {
  public override readonly name: string = 'FaultyFileSystemError';

  public constructor(code: string, message: string) {
    super({ 'code': code, 'message': message });
  }
}

class FaultyFileSystem implements FileSystemInterface {
  public constructor(private readonly config: FaultyFileSystemConfig) {}

  existsSync(): boolean { return true; }
  mkdirSync(): void {}
  readdirSync(): string[] { return []; }
  readFileSync(): string { return ''; }
  renameSync(): void {
    throw new FaultyFileSystemError(this.config.code, this.config.message);
  }
  statSync(): StatResultInterface {
    return { isDirectory: () => false, isFile: () => true, mtimeMs: 0 };
  }
  unlinkSync(): void {}
  writeFileSync(): void {}
}

function getFileLockConfig<TCase extends { input: { fileLock?: FileLockPollTimeoutConfig } }>(scenarioCase: TCase): FileLockPollTimeoutConfig {
  return scenarioCase.input.fileLock ?? {};
}

beforeEach(() => {
  TEST_DIR = mkdtempSync(join(tmpdir(), 'file-lock-tests-'));
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

class RecordingFileLock extends FileLock {
  readonly events: Array<{ hook: string; path: string; extra?: number | string }> = [];

  protected override onAcquireStart(path: string): void {
    this.events.push({ hook: 'onAcquireStart', path });
  }

  protected override onAcquireWait(path: string, attempt: number): void {
    this.events.push({ hook: 'onAcquireWait', path, extra: attempt });
  }

  protected override onContended(path: string): void {
    this.events.push({ hook: 'onContended', path });
  }

  protected override onAcquire(path: string): void {
    this.events.push({ hook: 'onAcquire', path });
  }

  protected override onRelease(path: string): void {
    this.events.push({ hook: 'onRelease', path });
  }

  protected override onTimeout(path: string): void {
    this.events.push({ hook: 'onTimeout', path });
  }

  protected override onError(path: string, error: Error): void {
    this.events.push({ hook: 'onError', path, extra: error.message });
  }
}

const runnerMap: ScenarioRunnerMap = {
  'timeout-missing-file': async (scenarioCase) => {
    await assert.rejects(
      FileLock.create({
        path: FileLockTestHelpers.makePath(scenarioCase.input.path),
        ...getFileLockConfig(scenarioCase)
      }),
      (error: Error) => Boolean(scenarioCase.expected.timedOut) && error instanceof FileLockTimeoutError
    );
  },
  'acquire-success-restores-path': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path);
    writeFileSync(path, scenarioCase.input.content);
    const lock = await FileLock.create({ path });
    assert.equal(existsSync(path), scenarioCase.expected.existedDuringLock);
    lock.release();
    assert.equal(existsSync(path), scenarioCase.expected.existedAfterRelease);
  },
  'contention-times-out': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path);
    writeFileSync(path, scenarioCase.input.content);
    const lock = await FileLock.create({ path });
    await assert.rejects(
      FileLock.create({ path, ...getFileLockConfig(scenarioCase) }),
      (error: Error) => Boolean(scenarioCase.expected.timedOut) && error instanceof FileLockTimeoutError
    );
    lock.release();
  },
  'read-after-create': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path);
    writeFileSync(path, scenarioCase.input.content);
    const lock = await FileLock.create({ path });
    assert.strictEqual(lock.read(), scenarioCase.expected.content);
    lock.release();
  },
  'write-then-release-restores-new-content': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path);
    writeFileSync(path, scenarioCase.input.originalContent);
    const lock = await FileLock.create({ path });
    lock.write(scenarioCase.input.updatedContent);
    lock.release();
    assert.ok(existsSync(path));
    assert.strictEqual(readFileSync(path, 'utf8'), scenarioCase.expected.content);
  },
  'release-idempotent': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path);
    writeFileSync(path, scenarioCase.input.content);
    const lock = await FileLock.create({ path });
    lock.release();
    lock.release();
  },
  'symbol-dispose-releases': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path);
    writeFileSync(path, scenarioCase.input.content);
    const lock = await FileLock.create({ path });
    assert.equal(existsSync(path), scenarioCase.expected.existedDuringLock);
    lock[Symbol.dispose]();
    assert.equal(existsSync(path), scenarioCase.expected.existedAfterDispose);
  },
  'poll-and-timeout-options': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path);
    writeFileSync(path, scenarioCase.input.content);
    const firstLock = await FileLock.create({ path });
    await assert.rejects(
      FileLock.create({ path, ...getFileLockConfig(scenarioCase) }),
      (error: Error) => Boolean(scenarioCase.expected.timedOut) && error instanceof FileLockTimeoutError
    );
    firstLock.release();
  },
  'hook-acquire-start-and-acquire': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path);
    writeFileSync(path, scenarioCase.input.content);
    const lock = await RecordingFileLock.create({ path });
    const starts = lock.events.filter((e) => e.hook === 'onAcquireStart');
    const acquires = lock.events.filter((e) => e.hook === 'onAcquire');
    assert.strictEqual(starts.length, scenarioCase.expected.startCount);
    assert.strictEqual(starts[0]?.path, path);
    assert.strictEqual(acquires.length, scenarioCase.expected.acquireCount);
    assert.strictEqual(acquires[0]?.path, path);
    assert.ok(lock.events.findIndex((e) => e.hook === 'onAcquireStart') < lock.events.findIndex((e) => e.hook === 'onAcquire'));
    lock.release();
  },
  'hook-release-original-path': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path);
    writeFileSync(path, scenarioCase.input.content);
    const lock = await RecordingFileLock.create({ path });
    lock.release();
    const releases = lock.events.filter((e) => e.hook === 'onRelease');
    assert.strictEqual(releases.length, scenarioCase.expected.releaseCount);
    assert.strictEqual(releases[0]?.path, path);
  },
  'hook-idempotent-release': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path);
    writeFileSync(path, scenarioCase.input.content);
    const lock = await RecordingFileLock.create({ path });
    lock.release();
    lock.release();
    const releases = lock.events.filter((e) => e.hook === 'onRelease');
    assert.strictEqual(releases.length, scenarioCase.expected.releaseCount);
  },
  'hook-timeout': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path);
    let lock: RecordingFileLock | undefined;
    let caughtError: unknown;
    try {
      lock = await RecordingFileLock.create({ path, ...getFileLockConfig(scenarioCase) });
    } catch (error) {
      caughtError = error;
    }
    assert.equal(caughtError instanceof FileLockTimeoutError, Boolean(scenarioCase.expected.timedOut));
    assert.ok(lock === undefined);
  },
  'hook-contention-wait-and-timeout': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path);
    writeFileSync(path, scenarioCase.input.content);
    const first = await RecordingFileLock.create({ path });
    const capturedEvents: Array<{ hook: string; path: string; extra?: number | string }> = [];
    class CapturingFileLock extends FileLock {
      protected override onAcquireStart(p: string): void { capturedEvents.push({ hook: 'onAcquireStart', path: p }); }
      protected override onAcquireWait(p: string, attempt: number): void { capturedEvents.push({ hook: 'onAcquireWait', path: p, extra: attempt }); }
      protected override onContended(p: string): void { capturedEvents.push({ hook: 'onContended', path: p }); }
      protected override onTimeout(p: string): void { capturedEvents.push({ hook: 'onTimeout', path: p }); }
    }
    let contendedLock: CapturingFileLock | undefined;
    let caughtError: unknown;
    try {
      contendedLock = await CapturingFileLock.create({ path, ...getFileLockConfig(scenarioCase) });
    } catch (error) {
      caughtError = error;
    }
    assert.ok(caughtError instanceof FileLockTimeoutError);
    assert.ok(contendedLock === undefined);
    const contentions = capturedEvents.filter((e) => e.hook === 'onContended');
    const waits = capturedEvents.filter((e) => e.hook === 'onAcquireWait');
    const timeouts = capturedEvents.filter((e) => e.hook === 'onTimeout');
    assert.ok(contentions.length >= scenarioCase.expected.minimumContentions);
    assert.ok(waits.length >= scenarioCase.expected.minimumWaits);
    assert.strictEqual(timeouts.length, scenarioCase.expected.timeoutCount);
    assert.ok(contentions.length === waits.length);
    for (let i = 0; i < waits.length; i++) {
      assert.strictEqual(waits[i]?.extra, i + 1);
    }
    first.release();
  },
  'hook-order': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path);
    writeFileSync(path, scenarioCase.input.content);
    const holder = await FileLock.create({ path });
    const capturedHooks: string[] = [];
    class OrderingFileLock extends FileLock {
      protected override onAcquireStart(): void { capturedHooks.push('onAcquireStart'); }
      protected override onAcquireWait(): void { capturedHooks.push('onAcquireWait'); }
      protected override onContended(): void { capturedHooks.push('onContended'); }
      protected override onTimeout(): void { capturedHooks.push('onTimeout'); }
    }
    await assert.rejects(
      OrderingFileLock.create({ path, ...getFileLockConfig(scenarioCase) }),
      (error: Error) => error instanceof FileLockTimeoutError
    );
    const order = scenarioCase.expected.order;
    const distinctOrder = capturedHooks.filter((hook, index) => capturedHooks.indexOf(hook) === index);
    assert.deepEqual(distinctOrder, order);
    holder.release();
  },
  'throwing-onAcquire-does-not-orphan-lock': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path);
    writeFileSync(path, scenarioCase.input.content);
    const hookErrorMessage = scenarioCase.input.hookErrorMessage;
    class ThrowingAcquireHookLock extends FileLock {
      protected override onAcquire(): void {
        throw RuntimeError.create(hookErrorMessage);
      }
    }
    const lock = await ThrowingAcquireHookLock.create({ path });
    assert.ok(!existsSync(path));
    lock.release();
    assert.equal(existsSync(path), !scenarioCase.expected.orphaned);
  },
  'async-rejecting-onAcquire-guarded': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path);
    writeFileSync(path, scenarioCase.input.content);
    const hookCauseMessage = scenarioCase.expected.hookCauseMessage;
    class AsyncRejectingAcquireLock extends FileLock {
      static readonly hookCause = RuntimeError.create(hookCauseMessage, { cause: { details: { attempt: 1 } } });
      protected override onAcquire(): Promise<void> {
        return Promise.reject(AsyncRejectingAcquireLock.hookCause);
      }
    }
    const rejectionEvents: Error[] = [];
    const onUnhandledRejection = (reason: Error): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const lock = await AsyncRejectingAcquireLock.create({ path });
      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.strictEqual(rejectionEvents.length, 0);
      assert.strictEqual(lock.hookErrorCount, 1);
      const firstDiagnostic = lock.getHookErrors()[0];
      const secondDiagnostic = lock.getHookErrors()[0];
      assert.strictEqual(firstDiagnostic?.hookName, 'onAcquire');
      assert.ok(firstDiagnostic?.cause instanceof Error);
      assert.ok(secondDiagnostic?.cause instanceof Error);
      assert.ok(firstDiagnostic !== secondDiagnostic);
      assert.ok(firstDiagnostic.cause !== AsyncRejectingAcquireLock.hookCause);
      assert.ok(firstDiagnostic.cause !== secondDiagnostic.cause);
      firstDiagnostic.cause.message = 'mutated projection';
      assert.strictEqual(secondDiagnostic.cause.message, scenarioCase.expected.hookCauseMessage);
      assert.strictEqual(lock.hookErrorCount, 1);
      lock.release();
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },
  'hook-errors-isolated-per-instance': async (scenarioCase) => {
    const firstPath = FileLockTestHelpers.makePath(scenarioCase.input.first.path);
    const secondPath = FileLockTestHelpers.makePath(scenarioCase.input.second.path);
    writeFileSync(firstPath, scenarioCase.input.first.content);
    writeFileSync(secondPath, scenarioCase.input.second.content);
    class IsolatedFailureLock extends FileLock {
      protected override onAcquire(path: string): void {
        throw RuntimeError.create(`hook failure for ${path}`);
      }
    }
    const first = await IsolatedFailureLock.create({ path: firstPath });
    const second = await IsolatedFailureLock.create({ path: secondPath });
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
  },
  'symbol-dispose-hook': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path);
    writeFileSync(path, scenarioCase.input.content);
    const lock = await RecordingFileLock.create({ path });
    lock[Symbol.dispose]();
    const releases = lock.events.filter((e) => e.hook === 'onRelease');
    assert.strictEqual(releases.length, 1);
  },
  'bare-relative-filename-contention': async (scenarioCase) => {
    const originalCwd = process.cwd();
    process.chdir(TEST_DIR);
    try {
      writeFileSync(scenarioCase.input.filename, scenarioCase.input.content);
      const holder = await FileLock.create({ path: scenarioCase.input.filename });
      assert.equal(existsSync(scenarioCase.input.filename), scenarioCase.expected.existedDuringLock);
      await assert.rejects(
        FileLock.create({ path: scenarioCase.input.filename, ...getFileLockConfig(scenarioCase) }),
        (error: Error) => error instanceof FileLockTimeoutError
      );
      holder.release();
      assert.equal(existsSync(scenarioCase.input.filename), scenarioCase.expected.existedAfterRelease);
    } finally {
      process.chdir(originalCwd);
    }
  },
  'genuine-fs-error-routes-to-onError': async (scenarioCase) => {
    const errorEvents: Array<{ path: string; message: string }> = [];
    const contendedEvents: string[] = [];
    const fileSystemError = scenarioCase.input.fileSystemError;
    class ErrorRoutingFileLock extends FileLock {
      protected override onError(path: string, error: Error): void {
        errorEvents.push({ path, message: error.message });
      }
      protected override onContended(path: string): void {
        contendedEvents.push(path);
      }
    }
    const start = Date.now();
    await assert.rejects(
      ErrorRoutingFileLock.create({
        fileSystem: new FaultyFileSystem(fileSystemError),
        path: scenarioCase.input.path,
        ...getFileLockConfig(scenarioCase),
      }),
      (error: Error) => error.message.includes(scenarioCase.expected.errorMessageIncludes)
    );
    const elapsed = Date.now() - start;
    assert.strictEqual(errorEvents.length, scenarioCase.expected.errorCount);
    assert.strictEqual(errorEvents[0]?.path, scenarioCase.input.path);
    assert.ok(errorEvents[0]?.message.includes(scenarioCase.expected.errorMessageIncludes));
    assert.strictEqual(contendedEvents.length, scenarioCase.expected.contendedCount);
    assert.ok(elapsed < scenarioCase.input.fileLock.timeoutMs);
  },
};

function runCase<Shape extends ScenarioShape>(scenarioCase: Extract<ScenarioCase, { shape: Shape }>): Promise<void> {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('FileLock', () => {
  void it('rejects a non-callable Symbol.dispose member', async () => {
    class NonDisposableFileLock extends FileLock {}

    assert.equal(Reflect.defineProperty(NonDisposableFileLock.prototype, Symbol.dispose, {
      'configurable': true,
      'value': 'not-callable',
      'writable': false
    }), true);

    await assert.rejects(
      NonDisposableFileLock.create({ 'path': FileLockTestHelpers.makePath('non-callable-dispose') }),
      FileLockConfigError
    );
  });

  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
