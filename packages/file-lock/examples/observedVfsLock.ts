/** observedVfsLock — lifecycle hooks demo: two locks over a shared VirtualFileSystem so one contends. Run: npx tsx examples/observedVfsLock.ts */

import { EventRecorder } from '@studnicky/errors/observers';
// #region usage
import { VirtualFileSystem } from '@studnicky/virtual-fs';
import assert from 'node:assert/strict';

import type { LockEventEntity } from './entities/LockEventEntity.js';

import { FileLock } from '../src/index.js';
import { VfsLockFixtures } from './fixtures/VfsLockFixtures.js';

class TracedFileLock extends FileLock {
  readonly #recorder = new EventRecorder<LockEventEntity.Type>();

  get events(): LockEventEntity.Type[] { return this.#recorder.events; }

  protected override onAcquire(p: string): void {
    this.#recorder.record({ 'hook': 'onAcquire', 'path': p }, `[file-lock] acquired path=${p}`);
  }

  protected override onAcquireStart(p: string): void {
    this.#recorder.record({ 'hook': 'onAcquireStart', 'path': p }, `[file-lock] acquireStart path=${p}`);
  }

  protected override onContended(p: string): void {
    this.#recorder.record({ 'hook': 'onContended', 'path': p }, `[file-lock] contended path=${p}`);
  }

  protected override onRelease(p: string): void {
    this.#recorder.record({ 'hook': 'onRelease', 'path': p }, `[file-lock] released path=${p}`);
  }
}

class VfsLockScenario {
  static async run(): Promise<{ readonly 'holder': TracedFileLock; readonly 'waiter': TracedFileLock }> {
    const vfs = VirtualFileSystem.builder()
      .seed('/shared/state.json', '{"version":0}')
      .build();

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
    }) as TracedFileLock;

    console.log('holder acquired — scheduling release in 20ms');
    setTimeout(() => { holder.release(); }, 20);

    // Waiter acquires second — will see contention until holder releases.
    const waiter = await TracedFileLock.create({
      'fileSystem': vfs,
      'path': lockPath,
      'pollMs': 5,
      'timeoutMs': 500
    }) as TracedFileLock;

    console.log('waiter acquired after holder released');
    waiter.release();

    return { 'holder': holder, 'waiter': waiter };
  }
}

const results = await VfsLockScenario.run();
// #endregion usage

// Assertions
const holderAcquires = results.holder.events.filter((e) => { return e.hook === 'onAcquire'; });
const holderReleases = results.holder.events.filter((e) => { return e.hook === 'onRelease'; });
const waiterContentions = results.waiter.events.filter((e) => { return e.hook === 'onContended'; });
const waiterAcquires = results.waiter.events.filter((e) => { return e.hook === 'onAcquire'; });

assert.equal(holderAcquires.length, 1, 'holder: onAcquire fires once');
assert.equal(holderReleases.length, 1, 'holder: onRelease fires once');
assert.ok(waiterContentions.length >= 1, 'waiter: onContended fires at least once');
assert.equal(waiterAcquires.length, 1, 'waiter: onAcquire fires once after holder releases');

console.log('observedVfsLock: all assertions passed');
