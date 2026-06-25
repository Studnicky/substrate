/** observedFileLock — subclass with console.log trace on every lifecycle hook. Run: npx tsx examples/observedFileLock.ts */

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// #region usage
import { FileLock, FileLockTimeoutError } from '../src/index.js';

class TracedFileLock extends FileLock {
  readonly events: { 'extra'?: string; 'hook': string; 'path': string }[] = [];

  protected override onAcquireStart(p: string): void {
    this.events.push({ 'hook': 'onAcquireStart', 'path': p });
    console.log(`[file-lock] acquireStart path=${p}`);
  }

  protected override onAcquireWait(p: string, attempt: number): void {
    this.events.push({ 'extra': String(attempt), 'hook': 'onAcquireWait', 'path': p });
    console.log(`[file-lock] acquireWait path=${p} attempt=${String(attempt)}`);
  }

  protected override onContended(p: string): void {
    this.events.push({ 'hook': 'onContended', 'path': p });
    console.log(`[file-lock] contended path=${p}`);
  }

  protected override onAcquire(p: string): void {
    this.events.push({ 'hook': 'onAcquire', 'path': p });
    console.log(`[file-lock] acquired path=${p}`);
  }

  protected override onRelease(p: string): void {
    this.events.push({ 'hook': 'onRelease', 'path': p });
    console.log(`[file-lock] released path=${p}`);
  }

  protected override onTimeout(p: string): void {
    this.events.push({ 'hook': 'onTimeout', 'path': p });
    console.log(`[file-lock] timeout path=${p}`);
  }

  protected override onError(p: string, error: Error): void {
    this.events.push({ 'extra': error.message, 'hook': 'onError', 'path': p });
    console.log(`[file-lock] error path=${p} message=${error.message}`);
  }
}

const dir = mkdtempSync(path.join(os.tmpdir(), 'observed-file-lock-'));
const filePath = path.join(dir, 'lock.txt');

// --- Scenario 1: clean acquire and release ---
writeFileSync(filePath, 'scenario-1');
const lock1 = await TracedFileLock.create({ 'path': filePath }) as TracedFileLock;
lock1.write('modified');
lock1.release();

// --- Scenario 2: contended acquire (second lock waits, holder released before timeout) ---
const filePath2 = path.join(dir, 'lock-2.txt');
writeFileSync(filePath2, 'scenario-2');
const holder = await TracedFileLock.create({ 'path': filePath2 }) as TracedFileLock;

// Release the holder after a short delay so the second acquirer sees contention then succeeds.
setTimeout(() => { holder.release(); }, 60);

const lock2 = await TracedFileLock.create({
  'path': filePath2,
  'pollMs': 20,
  'timeoutMs': 500
}) as TracedFileLock;
lock2.release();

// --- Scenario 3: timeout on a file that does not exist ---
const missingPath = path.join(dir, 'missing.txt');
let timedOut = false;
try {
  await TracedFileLock.create({ 'path': missingPath, 'timeoutMs': 50 });
} catch (err) {
  if (err instanceof FileLockTimeoutError) {
    timedOut = true;
    console.log(`[file-lock] caught timeout for missing path: path=${err.path}`);
  }
}

// Cleanup
rmSync(filePath, { 'force': true });
rmSync(filePath2, { 'force': true });
// #endregion usage

// --- Assertions ---

// Scenario 1: clean acquire
const s1 = lock1.events;
assert.equal(s1.filter((e) => { return e.hook === 'onAcquireStart'; }).length, 1, 's1: onAcquireStart fires once');
assert.equal(s1.filter((e) => { return e.hook === 'onAcquire'; }).length, 1, 's1: onAcquire fires once');
assert.equal(s1.filter((e) => { return e.hook === 'onRelease'; }).length, 1, 's1: onRelease fires once');
assert.equal(s1.filter((e) => { return e.hook === 'onContended'; }).length, 0, 's1: no contention');

// Scenario 2: contended acquire
const s2holder = holder.events;
const s2 = lock2.events;
assert.equal(s2holder.filter((e) => { return e.hook === 'onAcquire'; }).length, 1, 's2 holder: onAcquire fires once');
assert.equal(s2holder.filter((e) => { return e.hook === 'onRelease'; }).length, 1, 's2 holder: onRelease fires once');
assert.ok(s2.filter((e) => { return e.hook === 'onContended'; }).length >= 1, 's2 waiter: onContended fires at least once');
assert.ok(s2.filter((e) => { return e.hook === 'onAcquireWait'; }).length >= 1, 's2 waiter: onAcquireWait fires at least once');
assert.equal(s2.filter((e) => { return e.hook === 'onAcquire'; }).length, 1, 's2 waiter: onAcquire fires once after holder releases');

// Scenario 3: timeout
assert.ok(timedOut, 's3: timeout error was thrown');

console.log('observedFileLock: all assertions passed');
