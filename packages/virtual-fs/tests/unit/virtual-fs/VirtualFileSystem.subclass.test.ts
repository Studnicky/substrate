/**
 * Subclass extension tests for VirtualFileSystem
 *
 * Verifies that the protected lifecycle hooks are reachable and
 * overridable by a consumer subclass.
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { VirtualFileSystem } from '../../../src/virtual-fs/VirtualFileSystem.js';

// ── Tracing subclasses ───────────────────────────────────────────────────────

class CreateLogFs extends VirtualFileSystem {
  readonly createLog: string[] = [];
  override onCreate(path: string): void {
    this.createLog.push(path);
  }
}

class WriteLogFs extends VirtualFileSystem {
  readonly writeLog: string[] = [];
  override onWrite(path: string): void {
    this.writeLog.push(path);
  }
}

class ReadLogFs extends VirtualFileSystem {
  readonly readLog: string[] = [];
  override onRead(path: string): void {
    this.readLog.push(path);
  }
}

class DeleteLogFs extends VirtualFileSystem {
  readonly deleteLog: string[] = [];
  override onDelete(path: string): void {
    this.deleteLog.push(path);
  }
}

class RenameLogFs extends VirtualFileSystem {
  readonly renameLog: Array<{ 'from': string; 'to': string }> = [];
  override onRename(oldPath: string, newPath: string): void {
    this.renameLog.push({ 'from': oldPath, 'to': newPath });
  }
}

class FullTraceFs extends VirtualFileSystem {
  readonly createLog: string[] = [];
  readonly deleteLog: string[] = [];
  readonly readLog: string[] = [];
  readonly renameLog: Array<{ 'from': string; 'to': string }> = [];
  readonly writeLog: string[] = [];

  override onCreate(path: string): void { this.createLog.push(path); }
  override onDelete(path: string): void { this.deleteLog.push(path); }
  override onRead(path: string): void { this.readLog.push(path); }
  override onRename(oldPath: string, newPath: string): void {
    this.renameLog.push({ 'from': oldPath, 'to': newPath });
  }
  override onWrite(path: string): void { this.writeLog.push(path); }
}

// ── onCreate scenarios ───────────────────────────────────────────────────────

it('onCreate fires once for each new file written', () => {
  const fs = CreateLogFs.create();
  fs.writeFileSync('/a.txt', 'a', 'utf8');
  fs.writeFileSync('/b.txt', 'b', 'utf8');
  assert.deepStrictEqual(fs.createLog, ['/a.txt', '/b.txt']);
});

it('onCreate fires for each directory segment in recursive mkdirSync', () => {
  const fs = CreateLogFs.create();
  fs.mkdirSync('/x/y/z', { 'recursive': true });
  assert.ok(fs.createLog.includes('/x'));
  assert.ok(fs.createLog.includes('/x/y'));
  assert.ok(fs.createLog.includes('/x/y/z'));
});

it('onCreate does not fire on overwrite', () => {
  const fs = CreateLogFs.create();
  fs.writeFileSync('/f.txt', 'first', 'utf8');
  const countAfterFirst = fs.createLog.length;
  fs.writeFileSync('/f.txt', 'second', 'utf8');
  assert.strictEqual(fs.createLog.length, countAfterFirst);
});

// ── onWrite scenarios ────────────────────────────────────────────────────────

it('onWrite fires on update but not on initial write', () => {
  const fs = WriteLogFs.create();
  fs.writeFileSync('/f.txt', 'first', 'utf8');
  assert.strictEqual(fs.writeLog.length, 0); // first write → onCreate
  fs.writeFileSync('/f.txt', 'second', 'utf8');
  assert.deepStrictEqual(fs.writeLog, ['/f.txt']);
});

// ── onRead scenarios ─────────────────────────────────────────────────────────

it('onRead fires on readFileSync', () => {
  const fs = ReadLogFs.create();
  fs.writeFileSync('/r.txt', 'data', 'utf8');
  fs.readFileSync('/r.txt', 'utf8');
  assert.deepStrictEqual(fs.readLog, ['/r.txt']);
});

it('onRead fires on readdirSync', () => {
  const fs = ReadLogFs.create();
  fs.readdirSync('/');
  assert.ok(fs.readLog.includes('/'));
});

// ── onDelete scenarios ───────────────────────────────────────────────────────

it('onDelete fires once after unlinkSync', () => {
  const fs = DeleteLogFs.create();
  fs.writeFileSync('/d.txt', 'bye', 'utf8');
  fs.unlinkSync('/d.txt');
  assert.deepStrictEqual(fs.deleteLog, ['/d.txt']);
});

it('onDelete does not fire before unlinkSync', () => {
  const fs = DeleteLogFs.create();
  fs.writeFileSync('/d.txt', 'data', 'utf8');
  assert.strictEqual(fs.deleteLog.length, 0);
});

// ── onRename scenarios ───────────────────────────────────────────────────────

it('onRename fires with correct old and new paths', () => {
  const fs = RenameLogFs.create();
  fs.writeFileSync('/src.txt', 'content', 'utf8');
  fs.renameSync('/src.txt', '/dst.txt');
  assert.strictEqual(fs.renameLog.length, 1);
  assert.strictEqual(fs.renameLog[0]?.from, '/src.txt');
  assert.strictEqual(fs.renameLog[0]?.to, '/dst.txt');
});

// ── FullTraceFs scenarios ────────────────────────────────────────────────────

it('FullTraceFs tracks all hooks independently', () => {
  const fs = FullTraceFs.create();
  fs.writeFileSync('/f.txt', 'first', 'utf8');    // onCreate
  fs.writeFileSync('/f.txt', 'second', 'utf8');   // onWrite
  fs.readFileSync('/f.txt', 'utf8');               // onRead
  fs.renameSync('/f.txt', '/g.txt');              // onRename
  fs.unlinkSync('/g.txt');                         // onDelete

  assert.deepStrictEqual(fs.createLog, ['/f.txt']);
  assert.deepStrictEqual(fs.writeLog, ['/f.txt']);
  assert.deepStrictEqual(fs.readLog, ['/f.txt']);
  assert.strictEqual(fs.renameLog.length, 1);
  assert.deepStrictEqual(fs.deleteLog, ['/g.txt']);
});

it('subclass static create() returns subclass instance', () => {
  const fs = FullTraceFs.create();
  assert.ok(fs instanceof FullTraceFs);
  assert.ok(fs instanceof VirtualFileSystem);
});
