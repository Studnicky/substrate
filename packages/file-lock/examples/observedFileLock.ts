/** observedFileLock — subclass with console.log trace on every lifecycle hook. Run: npx tsx examples/observedFileLock.ts */

// #region usage
import { EventRecorder } from '@studnicky/errors';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { FileLock, FileLockTimeoutError } from '../src/index.js';

class TracedFileLock extends FileLock {
  readonly #recorder = new EventRecorder<{ 'extra'?: string; 'hook': string; 'path': string }>();

  get events(): readonly { 'extra'?: string; 'hook': string; 'path': string }[] { return this.#recorder.events; }

  protected override onAcquireStart(p: string): void {
    this.#recorder.record({ 'hook': 'onAcquireStart', 'path': p }, `[file-lock] acquireStart path=${p}`);
  }

  protected override onAcquireWait(p: string, attempt: number): void {
    this.#recorder.record(
      { 'extra': String(attempt), 'hook': 'onAcquireWait', 'path': p },
      `[file-lock] acquireWait path=${p} attempt=${String(attempt)}`
    );
  }

  protected override onContended(p: string): void {
    this.#recorder.record({ 'hook': 'onContended', 'path': p }, `[file-lock] contended path=${p}`);
  }

  protected override onAcquire(p: string): void {
    this.#recorder.record({ 'hook': 'onAcquire', 'path': p }, `[file-lock] acquired path=${p}`);
  }

  protected override onRelease(p: string): void {
    this.#recorder.record({ 'hook': 'onRelease', 'path': p }, `[file-lock] released path=${p}`);
  }

  protected override onTimeout(p: string): void {
    this.#recorder.record({ 'hook': 'onTimeout', 'path': p }, `[file-lock] timeout path=${p}`);
  }

  protected override onError(p: string, error: Error): void {
    this.#recorder.record(
      { 'extra': error.message, 'hook': 'onError', 'path': p },
      `[file-lock] error path=${p} message=${error.message}`
    );
  }
}

class FileLockScenarios {
  static async run(dir: string): Promise<{
    readonly 'holder': TracedFileLock;
    readonly 'lock1': TracedFileLock;
    readonly 'lock2': TracedFileLock;
    readonly 'timedOut': boolean;
  }> {
    const filePath = path.join(dir, 'lock.txt');

    // --- Scenario 1: clean acquire and release ---
    writeFileSync(filePath, 'scenario-1');
    const lock1 = await TracedFileLock.create({ 'path': filePath });
    lock1.write('modified');
    lock1.release();

    // --- Scenario 2: contended acquire (second lock waits, holder released before timeout) ---
    const filePath2 = path.join(dir, 'lock-2.txt');
    writeFileSync(filePath2, 'scenario-2');
    const holder = await TracedFileLock.create({ 'path': filePath2 });

    // Release the holder after a short delay so the second acquirer sees contention then succeeds.
    setTimeout(() => { holder.release(); }, 60);

    const lock2 = await TracedFileLock.create({
      'path': filePath2,
      'pollMs': 20,
      'timeoutMs': 500
    });
    lock2.release();

    // --- Scenario 3: timeout on a file that does not exist ---
    const missingPath = path.join(dir, 'missing.txt');
    let timedOut = false;
    try {
      await TracedFileLock.create({ 'path': missingPath, 'timeoutMs': 50 });
    } catch (error) {
      if (error instanceof FileLockTimeoutError) {
        timedOut = true;
        console.log(`[file-lock] caught timeout for missing path: path=${error.path}`);
      }
    }

    // Cleanup
    rmSync(filePath, { 'force': true });
    rmSync(filePath2, { 'force': true });

    return { 'holder': holder, 'lock1': lock1, 'lock2': lock2, 'timedOut': timedOut };
  }
}

const dir = mkdtempSync(path.join(os.tmpdir(), 'observed-file-lock-'));
const results = await FileLockScenarios.run(dir);
// #endregion usage

// --- Assertions ---

// Scenario 1: clean acquire
const s1 = results.lock1.events;
assert.equal(s1.filter((event) => { const result = event.hook === 'onAcquireStart'; return result; }).length, 1, 's1: onAcquireStart fires once');
assert.equal(s1.filter((event) => { const result = event.hook === 'onAcquire'; return result; }).length, 1, 's1: onAcquire fires once');
assert.equal(s1.filter((event) => { const result = event.hook === 'onRelease'; return result; }).length, 1, 's1: onRelease fires once');
assert.equal(s1.filter((event) => { const result = event.hook === 'onContended'; return result; }).length, 0, 's1: no contention');

// Scenario 2: contended acquire
const s2holder = results.holder.events;
const s2 = results.lock2.events;
assert.equal(s2holder.filter((event) => { const result = event.hook === 'onAcquire'; return result; }).length, 1, 's2 holder: onAcquire fires once');
assert.equal(s2holder.filter((event) => { const result = event.hook === 'onRelease'; return result; }).length, 1, 's2 holder: onRelease fires once');
assert.ok(s2.filter((event) => { const result = event.hook === 'onContended'; return result; }).length >= 1, 's2 waiter: onContended fires at least once');
assert.ok(s2.filter((event) => { const result = event.hook === 'onAcquireWait'; return result; }).length >= 1, 's2 waiter: onAcquireWait fires at least once');
assert.equal(s2.filter((event) => { const result = event.hook === 'onAcquire'; return result; }).length, 1, 's2 waiter: onAcquire fires once after holder releases');

// Scenario 3: timeout
assert.ok(results.timedOut, 's3: timeout error was thrown');

console.log('observedFileLock: all assertions passed');
