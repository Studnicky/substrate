/** observedVirtualFs — lifecycle hooks demo: subclass and override onCreate/onWrite/onRead/onRename/onDelete. Run: npx tsx examples/observedVirtualFs.ts */

import assert from 'node:assert/strict';

import type { HookEventEntity } from './entities/HookEventEntity.js';

// #region usage
import { VirtualFileSystem } from '../src/index.js';

class TracingVfs extends VirtualFileSystem {
  readonly events: HookEventEntity.Type[] = [];

  protected override onCreate(path: string): void {
    this.events.push({ 'hook': 'onCreate', 'path': path });
    console.log(`[virtual-fs] onCreate path=${path}`);
  }

  protected override onDelete(path: string): void {
    this.events.push({ 'hook': 'onDelete', 'path': path });
    console.log(`[virtual-fs] onDelete path=${path}`);
  }

  protected override onRead(path: string): void {
    this.events.push({ 'hook': 'onRead', 'path': path });
    console.log(`[virtual-fs] onRead path=${path}`);
  }

  protected override onRename(oldPath: string, newPath: string): void {
    this.events.push({ 'hook': 'onRename', 'path': oldPath });
    console.log(`[virtual-fs] onRename from=${oldPath} to=${newPath}`);
  }

  protected override onWrite(path: string): void {
    this.events.push({ 'hook': 'onWrite', 'path': path });
    console.log(`[virtual-fs] onWrite path=${path}`);
  }
}

// Build without seeding — write the initial file after construction so hooks
// fire after class field initializers have run (events array is ready).
const vfs: TracingVfs = TracingVfs.builder().build() as TracingVfs;

// Write initial file → onCreate
vfs.writeFileSync('/log/init.txt', 'bootstrap', 'utf8');
console.log('--- initial write complete ---');

// Write to same file → onWrite
vfs.writeFileSync('/log/init.txt', 'updated', 'utf8');

// Write new file → onCreate
vfs.writeFileSync('/log/new.txt', 'brand new', 'utf8');

// Read → onRead
vfs.readFileSync('/log/init.txt', 'utf8');

// Mkdir + Readdir → onCreate (on /log/sub) then onRead (on /log)
vfs.mkdirSync('/log', { 'recursive': true });
vfs.mkdirSync('/log/sub', { 'recursive': true });
vfs.readdirSync('/log');

// Rename → onRename
vfs.renameSync('/log/new.txt', '/log/renamed.txt');

// Unlink → onDelete
vfs.unlinkSync('/log/renamed.txt');

console.log('--- hook trace complete ---');
// #endregion usage

// Assertions
const creates = vfs.events.filter((e) => { return e.hook === 'onCreate'; });
const writes = vfs.events.filter((e) => { return e.hook === 'onWrite'; });
const reads = vfs.events.filter((e) => { return e.hook === 'onRead'; });
const renames = vfs.events.filter((e) => { return e.hook === 'onRename'; });
const deletes = vfs.events.filter((e) => { return e.hook === 'onDelete'; });

// writeFileSync('/log/init.txt') → onCreate; writeFileSync('/log/new.txt') → onCreate; mkdirSync('/log/sub') → onCreate
assert.ok(creates.length >= 3, `onCreate fired at least 3 times (got ${creates.length})`);
assert.ok(writes.length >= 1, 'onWrite fired at least once');
assert.ok(reads.length >= 2, 'onRead fired at least twice (readFileSync + readdirSync)');
assert.equal(renames.length, 1, 'onRename fired once');
assert.equal(deletes.length, 1, 'onDelete fired once');

console.log('observedVirtualFs: all assertions passed');
