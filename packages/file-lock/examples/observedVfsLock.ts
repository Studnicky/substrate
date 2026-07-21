/** observedVfsLock — lifecycle hooks demo: two locks over a shared VirtualFileSystem so one contends. Run: npx tsx examples/observedVfsLock.ts */

import { EventRecorder } from '@studnicky/errors';
// #region usage
import { VirtualFileSystem } from '@studnicky/virtual-fs';
import assert from 'node:assert/strict';

import type { LockEventEntity } from './entities/LockEventEntity.js';

import { FileLock } from '../src/index.js';
import { VfsLockFixtures } from './fixtures/VfsLockFixtures.js';

class TracedFileLock extends FileLock {
  static readonly #recorders = new WeakMap<FileLock, EventRecorder<LockEventEntity.Type>>();

  static events(lock: FileLock): LockEventEntity.Type[] {
    return this.#recorders.get(lock)?.events ?? [];
  }

  protected override onAcquire(p: string): void {
    this.#record({ 'hook': 'onAcquire', 'path': p }, `[file-lock] acquired path=${p}`);
  }

  protected override onAcquireStart(p: string): void {
    this.#record({ 'hook': 'onAcquireStart', 'path': p }, `[file-lock] acquireStart path=${p}`);
  }

  protected override onContended(p: string): void {
    this.#record({ 'hook': 'onContended', 'path': p }, `[file-lock] contended path=${p}`);
  }

  protected override onRelease(p: string): void {
    this.#record({ 'hook': 'onRelease', 'path': p }, `[file-lock] released path=${p}`);
  }

  #record(event: LockEventEntity.Type, message: string): void {
    let recorder = TracedFileLock.#recorders.get(this);
    if (recorder === undefined) {
      recorder = new EventRecorder<LockEventEntity.Type>();
      TracedFileLock.#recorders.set(this, recorder);
    }
    recorder.record(event, message);
  }
}

class VfsLockScenario {
  static async run(): Promise<{ readonly 'holder': FileLock; readonly 'waiter': FileLock }> {
    const vfs = VirtualFileSystem.create({
      'seed': new Map([['/shared/state.json', '{"version":0}']])
    });

    // Ensure the parent directory entry exists so FileLock can readdirSync it
    // when checking for existing lock files during contention detection.
    vfs.mkdirSync('/shared', { 'recursive': true });

    const lockPath = VfsLockFixtures.LOCK_PATH;

    // Holder acquires first — TracedFileLock.create uses `new this(...)` so the
    // result is a genuine TracedFileLock instance with observable hooks.
    const holder = await TracedFileLock.create({
      'fileSystem': vfs,
      'path': lockPath,
      'pollMs': 5,
      'timeoutMs': 500
    });

    console.log('holder acquired — scheduling release in 20ms');
    setTimeout(() => { holder.release(); }, 20);

    // Waiter acquires second — will see contention until holder releases.
    const waiter = await TracedFileLock.create({
      'fileSystem': vfs,
      'path': lockPath,
      'pollMs': 5,
      'timeoutMs': 500
    });

    console.log('waiter acquired after holder released');
    waiter.release();

    return { 'holder': holder, 'waiter': waiter };
  }
}

const results = await VfsLockScenario.run();
// #endregion usage

// Assertions
const holderEvents = TracedFileLock.events(results.holder);
const waiterEvents = TracedFileLock.events(results.waiter);
const holderAcquires = holderEvents.filter((e) => { return e.hook === 'onAcquire'; });
const holderReleases = holderEvents.filter((e) => { return e.hook === 'onRelease'; });
const waiterContentions = waiterEvents.filter((e) => { return e.hook === 'onContended'; });
const waiterAcquires = waiterEvents.filter((e) => { return e.hook === 'onAcquire'; });

assert.equal(holderAcquires.length, 1, 'holder: onAcquire fires once');
assert.equal(holderReleases.length, 1, 'holder: onRelease fires once');
assert.ok(waiterContentions.length >= 1, 'waiter: onContended fires at least once');
assert.equal(waiterAcquires.length, 1, 'waiter: onAcquire fires once after holder releases');

console.log('observedVfsLock: all assertions passed');
