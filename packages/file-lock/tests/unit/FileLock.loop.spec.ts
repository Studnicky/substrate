import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, afterEach, describe, it } from 'node:test';

import type { FileSystemInterface, StatResultInterface } from '@studnicky/virtual-fs';

import { FileLock, FileLockTimeoutError } from '../../src/index.js';
import scenarioGroups from './FileLock.scenarios.json';

type ScenarioCaseBase = {
  description: string;
  expected: Record<string, unknown>;
  input: Record<string, unknown>;
  name: string;
};

type ScenarioCase =
  | (ScenarioCaseBase & { shape: 'timeout-missing-file' })
  | (ScenarioCaseBase & { shape: 'acquire-success-restores-path' })
  | (ScenarioCaseBase & { shape: 'contention-times-out' })
  | (ScenarioCaseBase & { shape: 'read-after-create' })
  | (ScenarioCaseBase & { shape: 'write-then-release-restores-new-content' })
  | (ScenarioCaseBase & { shape: 'release-idempotent' })
  | (ScenarioCaseBase & { shape: 'symbol-dispose-releases' })
  | (ScenarioCaseBase & { shape: 'poll-and-timeout-options' })
  | (ScenarioCaseBase & { shape: 'hook-acquire-start-and-acquire' })
  | (ScenarioCaseBase & { shape: 'hook-release-original-path' })
  | (ScenarioCaseBase & { shape: 'hook-idempotent-release' })
  | (ScenarioCaseBase & { shape: 'hook-timeout' })
  | (ScenarioCaseBase & { shape: 'hook-contention-wait-and-timeout' })
  | (ScenarioCaseBase & { shape: 'hook-order' })
  | (ScenarioCaseBase & { shape: 'throwing-onAcquire-does-not-orphan-lock' })
  | (ScenarioCaseBase & { shape: 'async-rejecting-onAcquire-guarded' })
  | (ScenarioCaseBase & { shape: 'hook-errors-isolated-per-instance' })
  | (ScenarioCaseBase & { shape: 'symbol-dispose-hook' })
  | (ScenarioCaseBase & { shape: 'bare-relative-filename-contention' })
  | (ScenarioCaseBase & { shape: 'genuine-fs-error-routes-to-onError' });

type ScenarioShape = ScenarioCase['shape'];
type ScenarioRunner<Shape extends ScenarioShape> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => Promise<void>;
type ScenarioRunnerMap = { readonly [Shape in ScenarioShape]: ScenarioRunner<Shape> };

type FileLockScenarioConfig = {
  pollMs?: number;
  timeoutMs?: number;
};

type FaultyFileSystemConfig = {
  code: string;
  message: string;
};

let TEST_DIR = '';

class FileLockTestHelpers {
  public static makePath(name: string): string {
    return join(TEST_DIR, name);
  }
}

class FaultyFileSystem implements FileSystemInterface {
  public constructor(private readonly config: FaultyFileSystemConfig) {}

  existsSync(): boolean { return true; }
  mkdirSync(): void {}
  readdirSync(): string[] { return []; }
  readFileSync(): string { return ''; }
  renameSync(): void {
    const error = new Error(this.config.message) as NodeJS.ErrnoException;
    error.code = this.config.code;
    throw error;
  }
  statSync(): StatResultInterface {
    return { isDirectory: () => false, isFile: () => true, mtimeMs: 0 };
  }
  unlinkSync(): void {}
  writeFileSync(): void {}
}

function getFileLockConfig(scenarioCase: ScenarioCase): FileLockScenarioConfig {
  return (scenarioCase.input.fileLock ?? {}) as FileLockScenarioConfig;
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
        path: FileLockTestHelpers.makePath(scenarioCase.input.path as string),
        timeoutMs: getFileLockConfig(scenarioCase).timeoutMs
      }),
      (error: unknown) => error instanceof FileLockTimeoutError
    );
  },
  'acquire-success-restores-path': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path as string);
    writeFileSync(path, scenarioCase.input.content as string);
    const lock = await FileLock.create({ path });
    assert.equal(existsSync(path), scenarioCase.expected.existedDuringLock as boolean);
    lock.release();
    assert.equal(existsSync(path), scenarioCase.expected.existedAfterRelease as boolean);
  },
  'contention-times-out': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path as string);
    writeFileSync(path, scenarioCase.input.content as string);
    const lock = await FileLock.create({ path });
    await assert.rejects(
      FileLock.create({ path, timeoutMs: getFileLockConfig(scenarioCase).timeoutMs }),
      (error: unknown) => error instanceof FileLockTimeoutError
    );
    lock.release();
  },
  'read-after-create': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path as string);
    writeFileSync(path, scenarioCase.input.content as string);
    const lock = await FileLock.create({ path });
    assert.strictEqual(lock.read(), scenarioCase.expected.content as string);
    lock.release();
  },
  'write-then-release-restores-new-content': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path as string);
    writeFileSync(path, scenarioCase.input.originalContent as string);
    const lock = await FileLock.create({ path });
    lock.write(scenarioCase.input.updatedContent as string);
    lock.release();
    assert.ok(existsSync(path));
    assert.strictEqual(readFileSync(path, 'utf8'), scenarioCase.expected.content as string);
  },
  'release-idempotent': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path as string);
    writeFileSync(path, scenarioCase.input.content as string);
    const lock = await FileLock.create({ path });
    lock.release();
    lock.release();
  },
  'symbol-dispose-releases': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path as string);
    writeFileSync(path, scenarioCase.input.content as string);
    const lock = await FileLock.create({ path });
    assert.equal(existsSync(path), scenarioCase.expected.existedDuringLock as boolean);
    lock[Symbol.dispose]();
    assert.equal(existsSync(path), scenarioCase.expected.existedAfterDispose as boolean);
  },
  'poll-and-timeout-options': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path as string);
    writeFileSync(path, scenarioCase.input.content as string);
    const firstLock = await FileLock.create({ path });
    await assert.rejects(
      FileLock.create({ path, ...getFileLockConfig(scenarioCase) }),
      (error: unknown) => error instanceof FileLockTimeoutError
    );
    firstLock.release();
  },
  'hook-acquire-start-and-acquire': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path as string);
    writeFileSync(path, scenarioCase.input.content as string);
    const lock = await RecordingFileLock.create({ path });
    const starts = lock.events.filter((e) => e.hook === 'onAcquireStart');
    const acquires = lock.events.filter((e) => e.hook === 'onAcquire');
    assert.strictEqual(starts.length, scenarioCase.expected.startCount as number);
    assert.strictEqual(starts[0]?.path, path);
    assert.strictEqual(acquires.length, scenarioCase.expected.acquireCount as number);
    assert.strictEqual(acquires[0]?.path, path);
    assert.ok(lock.events.findIndex((e) => e.hook === 'onAcquireStart') < lock.events.findIndex((e) => e.hook === 'onAcquire'));
    lock.release();
  },
  'hook-release-original-path': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path as string);
    writeFileSync(path, scenarioCase.input.content as string);
    const lock = await RecordingFileLock.create({ path });
    lock.release();
    const releases = lock.events.filter((e) => e.hook === 'onRelease');
    assert.strictEqual(releases.length, scenarioCase.expected.releaseCount as number);
    assert.strictEqual(releases[0]?.path, path);
  },
  'hook-idempotent-release': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path as string);
    writeFileSync(path, scenarioCase.input.content as string);
    const lock = await RecordingFileLock.create({ path });
    lock.release();
    lock.release();
    const releases = lock.events.filter((e) => e.hook === 'onRelease');
    assert.strictEqual(releases.length, scenarioCase.expected.releaseCount as number);
  },
  'hook-timeout': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path as string);
    let lock: RecordingFileLock | undefined;
    let caughtError: unknown;
    try {
      lock = await RecordingFileLock.create({ path, timeoutMs: getFileLockConfig(scenarioCase).timeoutMs });
    } catch (error) {
      caughtError = error;
    }
    assert.ok(caughtError instanceof FileLockTimeoutError);
    assert.ok(lock === undefined);
  },
  'hook-contention-wait-and-timeout': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path as string);
    writeFileSync(path, scenarioCase.input.content as string);
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
    assert.ok(contentions.length >= (scenarioCase.expected.minimumContentions as number));
    assert.ok(waits.length >= (scenarioCase.expected.minimumWaits as number));
    assert.strictEqual(timeouts.length, scenarioCase.expected.timeoutCount as number);
    assert.ok(contentions.length === waits.length);
    for (let i = 0; i < waits.length; i++) {
      assert.strictEqual(waits[i]?.extra, i + 1);
    }
    first.release();
  },
  'hook-order': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path as string);
    writeFileSync(path, scenarioCase.input.content as string);
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
      (e: unknown) => e instanceof FileLockTimeoutError
    );
    assert.strictEqual(capturedHooks[0], 'onAcquireStart');
    assert.ok(capturedHooks.indexOf('onAcquireStart') < capturedHooks.indexOf('onAcquireWait'));
    assert.ok(capturedHooks.indexOf('onAcquireWait') < capturedHooks.lastIndexOf('onTimeout'));
    holder.release();
  },
  'throwing-onAcquire-does-not-orphan-lock': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path as string);
    writeFileSync(path, scenarioCase.input.content as string);
    const hookErrorMessage = scenarioCase.input.hookErrorMessage as string;
    class ThrowingAcquireHookLock extends FileLock {
      protected override onAcquire(): void {
        throw new Error(hookErrorMessage);
      }
    }
    const lock = await ThrowingAcquireHookLock.create({ path });
    assert.ok(!existsSync(path));
    lock.release();
    assert.ok(existsSync(path));
  },
  'async-rejecting-onAcquire-guarded': async (scenarioCase) => {
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path as string);
    writeFileSync(path, scenarioCase.input.content as string);
    const hookCauseMessage = scenarioCase.expected.hookCauseMessage as string;
    class AsyncRejectingAcquireLock extends FileLock {
      static readonly hookCause = new Error(hookCauseMessage, { cause: { details: { attempt: 1 } } });
      protected override onAcquire(): Promise<void> {
        return Promise.reject(AsyncRejectingAcquireLock.hookCause);
      }
    }
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
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
      assert.strictEqual(secondDiagnostic.cause.message, scenarioCase.expected.hookCauseMessage as string);
      assert.strictEqual(lock.hookErrorCount, 1);
      lock.release();
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },
  'hook-errors-isolated-per-instance': async (scenarioCase) => {
    const firstPath = FileLockTestHelpers.makePath((scenarioCase.input.first as Record<string, unknown>).path as string);
    const secondPath = FileLockTestHelpers.makePath((scenarioCase.input.second as Record<string, unknown>).path as string);
    writeFileSync(firstPath, (scenarioCase.input.first as Record<string, unknown>).content as string);
    writeFileSync(secondPath, (scenarioCase.input.second as Record<string, unknown>).content as string);
    class IsolatedFailureLock extends FileLock {
      protected override onAcquire(path: string): void {
        throw new Error(`hook failure for ${path}`);
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
    const path = FileLockTestHelpers.makePath(scenarioCase.input.path as string);
    writeFileSync(path, scenarioCase.input.content as string);
    const lock = await RecordingFileLock.create({ path });
    lock[Symbol.dispose]();
    const releases = lock.events.filter((e) => e.hook === 'onRelease');
    assert.strictEqual(releases.length, 1);
  },
  'bare-relative-filename-contention': async (scenarioCase) => {
    const originalCwd = process.cwd();
    process.chdir(TEST_DIR);
    try {
      writeFileSync(scenarioCase.input.filename as string, scenarioCase.input.content as string);
      const holder = await FileLock.create({ path: scenarioCase.input.filename as string });
      assert.equal(existsSync(scenarioCase.input.filename as string), scenarioCase.expected.existedDuringLock as boolean);
      await assert.rejects(
        FileLock.create({ path: scenarioCase.input.filename as string, timeoutMs: getFileLockConfig(scenarioCase).timeoutMs }),
        (error: unknown) => error instanceof FileLockTimeoutError
      );
      holder.release();
      assert.equal(existsSync(scenarioCase.input.filename as string), scenarioCase.expected.existedAfterRelease as boolean);
    } finally {
      process.chdir(originalCwd);
    }
  },
  'genuine-fs-error-routes-to-onError': async (scenarioCase) => {
    const errorEvents: Array<{ path: string; message: string }> = [];
    const contendedEvents: string[] = [];
    const fileSystemError = scenarioCase.input.fileSystemError as FaultyFileSystemConfig;
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
        path: scenarioCase.input.path as string,
        timeoutMs: getFileLockConfig(scenarioCase).timeoutMs,
      }),
      (error: unknown) => error instanceof Error && error.message.includes(scenarioCase.expected.errorMessageIncludes as string)
    );
    const elapsed = Date.now() - start;
    assert.strictEqual(errorEvents.length, scenarioCase.expected.errorCount as number);
    assert.strictEqual(errorEvents[0]?.path, scenarioCase.input.path as string);
    assert.ok(errorEvents[0]?.message.includes(scenarioCase.expected.errorMessageIncludes as string));
    assert.strictEqual(contendedEvents.length, scenarioCase.expected.contendedCount as number);
    assert.ok(elapsed < (getFileLockConfig(scenarioCase).timeoutMs as number));
  },
};

function runCase<Shape extends ScenarioShape>(scenarioCase: Extract<ScenarioCase, { shape: Shape }>): Promise<void> {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('FileLock', () => {
  for (const scenarioCase of scenarioGroups.cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
