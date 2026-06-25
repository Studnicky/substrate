import assert from 'node:assert/strict';
import { it } from 'node:test';

import { VirtualFileSystem } from '../../../src/virtual-fs/VirtualFileSystem.js';

// Helper: a deterministic clock
let _clockMs = 1000;
const mockClock = {
  'hrtime': () => { return BigInt(_clockMs) * 1_000_000n; },
  'now': () => { return _clockMs; }
};
function advanceClock(ms: number): void {
  _clockMs += ms;
}
function resetClock(): void {
  _clockMs = 1000;
}

// ── writeFileSync / readFileSync round-trip ────────────────────────────────

it('writeFileSync then readFileSync returns the same content', () => {
  const fs = VirtualFileSystem.create();
  fs.writeFileSync('/hello.txt', 'world', 'utf8');
  assert.strictEqual(fs.readFileSync('/hello.txt', 'utf8'), 'world');
});

it('writeFileSync overwrites existing content', () => {
  const fs = VirtualFileSystem.create();
  fs.writeFileSync('/a.txt', 'first', 'utf8');
  fs.writeFileSync('/a.txt', 'second', 'utf8');
  assert.strictEqual(fs.readFileSync('/a.txt', 'utf8'), 'second');
});

// ── existsSync ─────────────────────────────────────────────────────────────

it('existsSync returns true after writeFileSync', () => {
  const fs = VirtualFileSystem.create();
  fs.writeFileSync('/x.txt', 'data', 'utf8');
  assert.strictEqual(fs.existsSync('/x.txt'), true);
});

it('existsSync returns false for unknown path', () => {
  const fs = VirtualFileSystem.create();
  assert.strictEqual(fs.existsSync('/nonexistent.txt'), false);
});

it('existsSync returns true for root directory', () => {
  const fs = VirtualFileSystem.create();
  assert.strictEqual(fs.existsSync('/'), true);
});

// ── readFileSync throws for missing file ──────────────────────────────────

it('readFileSync throws ENOENT for unknown path', () => {
  const fs = VirtualFileSystem.create();
  assert.throws(
    () => { fs.readFileSync('/missing.txt', 'utf8'); },
    (err: unknown) => { return err instanceof Error && err.message.includes('ENOENT'); }
  );
});

// ── renameSync ─────────────────────────────────────────────────────────────

it('renameSync moves file content to new path', () => {
  const fs = VirtualFileSystem.create();
  fs.writeFileSync('/old.txt', 'content', 'utf8');
  fs.renameSync('/old.txt', '/new.txt');
  assert.strictEqual(fs.readFileSync('/new.txt', 'utf8'), 'content');
  assert.strictEqual(fs.existsSync('/old.txt'), false);
});

it('renameSync throws ENOENT when source does not exist', () => {
  const fs = VirtualFileSystem.create();
  assert.throws(
    () => { fs.renameSync('/missing.txt', '/dest.txt'); },
    (err: unknown) => { return err instanceof Error && err.message.includes('ENOENT'); }
  );
});

// ── readdirSync ────────────────────────────────────────────────────────────

it('readdirSync lists direct children of root after writes', () => {
  const fs = VirtualFileSystem.create();
  fs.writeFileSync('/a.txt', 'a', 'utf8');
  fs.writeFileSync('/b.txt', 'b', 'utf8');
  const entries = fs.readdirSync('/');
  assert.ok(entries.includes('a.txt'));
  assert.ok(entries.includes('b.txt'));
});

it('readdirSync does not include nested entries', () => {
  const fs = VirtualFileSystem.create();
  fs.mkdirSync('/dir', { 'recursive': true });
  fs.writeFileSync('/dir/file.txt', 'x', 'utf8');
  const entries = fs.readdirSync('/');
  assert.ok(entries.includes('dir'));
  assert.ok(!entries.includes('file.txt'));
  assert.ok(!entries.includes('dir/file.txt'));
});

it('readdirSync throws ENOENT for unknown directory', () => {
  const fs = VirtualFileSystem.create();
  assert.throws(
    () => { fs.readdirSync('/missing'); },
    (err: unknown) => { return err instanceof Error && err.message.includes('ENOENT'); }
  );
});

// ── unlinkSync ─────────────────────────────────────────────────────────────

it('unlinkSync removes file and existsSync returns false', () => {
  const fs = VirtualFileSystem.create();
  fs.writeFileSync('/del.txt', 'bye', 'utf8');
  fs.unlinkSync('/del.txt');
  assert.strictEqual(fs.existsSync('/del.txt'), false);
});

it('unlinkSync throws ENOENT for missing file', () => {
  const fs = VirtualFileSystem.create();
  assert.throws(
    () => { fs.unlinkSync('/missing.txt'); },
    (err: unknown) => { return err instanceof Error && err.message.includes('ENOENT'); }
  );
});

// ── mkdirSync ──────────────────────────────────────────────────────────────

it('mkdirSync recursive creates nested directories', () => {
  const fs = VirtualFileSystem.create();
  fs.mkdirSync('/a/b/c', { 'recursive': true });
  assert.strictEqual(fs.existsSync('/a'), true);
  assert.strictEqual(fs.existsSync('/a/b'), true);
  assert.strictEqual(fs.existsSync('/a/b/c'), true);
});

it('mkdirSync without recursive throws EEXIST for existing dir', () => {
  const fs = VirtualFileSystem.create();
  fs.mkdirSync('/mydir', { 'recursive': true });
  assert.throws(
    () => { fs.mkdirSync('/mydir'); },
    (err: unknown) => { return err instanceof Error && err.message.includes('EEXIST'); }
  );
});

it('mkdirSync with recursive does not throw for existing dir', () => {
  const fs = VirtualFileSystem.create();
  fs.mkdirSync('/mydir', { 'recursive': true });
  assert.doesNotThrow(() => { fs.mkdirSync('/mydir', { 'recursive': true }); });
});

// ── statSync ───────────────────────────────────────────────────────────────

it('statSync returns correct mtimeMs via injected clock', () => {
  resetClock();
  const fs = VirtualFileSystem.create({ 'clock': mockClock });
  advanceClock(500);
  fs.writeFileSync('/t.txt', 'data', 'utf8');
  const stat = fs.statSync('/t.txt');
  assert.strictEqual(stat.mtimeMs, 1500);
});

it('statSync isFile returns true for written file', () => {
  const fs = VirtualFileSystem.create();
  fs.writeFileSync('/f.txt', 'x', 'utf8');
  const stat = fs.statSync('/f.txt');
  assert.strictEqual(stat.isFile(), true);
  assert.strictEqual(stat.isDirectory(), false);
});

it('statSync isDirectory returns true for created directory', () => {
  const fs = VirtualFileSystem.create();
  fs.mkdirSync('/mydir');
  const stat = fs.statSync('/mydir');
  assert.strictEqual(stat.isDirectory(), true);
  assert.strictEqual(stat.isFile(), false);
});

it('statSync throws ENOENT for unknown path', () => {
  const fs = VirtualFileSystem.create();
  assert.throws(
    () => { fs.statSync('/missing'); },
    (err: unknown) => { return err instanceof Error && err.message.includes('ENOENT'); }
  );
});

// ── Builder seed ───────────────────────────────────────────────────────────

it('builder seed() pre-populates files', () => {
  const fs = VirtualFileSystem.builder()
    .seed('/seeded.txt', 'seeded content')
    .build();
  assert.strictEqual(fs.readFileSync('/seeded.txt', 'utf8'), 'seeded content');
});

it('builder withClock() injects clock for deterministic time', () => {
  resetClock();
  _clockMs = 2000;
  const fs = VirtualFileSystem.builder()
    .withClock(mockClock)
    .build();
  fs.writeFileSync('/clocked.txt', 'data', 'utf8');
  const stat = fs.statSync('/clocked.txt');
  assert.strictEqual(stat.mtimeMs, 2000);
});

// ── Lifecycle hooks ────────────────────────────────────────────────────────

it('lifecycle: onCreate fires after writeFileSync for new file', () => {
  const log: string[] = [];

  class TracingFs extends VirtualFileSystem {
    override onCreate(path: string): void {
      log.push(`create:${path}`);
    }
  }

  const fs = TracingFs.create();
  fs.writeFileSync('/new.txt', 'x', 'utf8');
  assert.ok(log.includes('create:/new.txt'));
});

it('lifecycle: onWrite fires after writeFileSync for existing file', () => {
  const log: string[] = [];

  class TracingFs extends VirtualFileSystem {
    override onWrite(path: string): void {
      log.push(`write:${path}`);
    }
  }

  const fs = TracingFs.create();
  fs.writeFileSync('/existing.txt', 'first', 'utf8');
  fs.writeFileSync('/existing.txt', 'second', 'utf8');
  assert.ok(log.includes('write:/existing.txt'));
});

it('lifecycle: onRead fires after readFileSync', () => {
  const log: string[] = [];

  class TracingFs extends VirtualFileSystem {
    override onRead(path: string): void {
      log.push(`read:${path}`);
    }
  }

  const fs = TracingFs.create();
  fs.writeFileSync('/r.txt', 'data', 'utf8');
  fs.readFileSync('/r.txt', 'utf8');
  assert.ok(log.includes('read:/r.txt'));
});

it('lifecycle: onDelete fires after unlinkSync', () => {
  const log: string[] = [];

  class TracingFs extends VirtualFileSystem {
    override onDelete(path: string): void {
      log.push(`delete:${path}`);
    }
  }

  const fs = TracingFs.create();
  fs.writeFileSync('/d.txt', 'data', 'utf8');
  fs.unlinkSync('/d.txt');
  assert.ok(log.includes('delete:/d.txt'));
});

it('lifecycle: onRename fires after renameSync', () => {
  const log: Array<{ 'oldPath': string; 'newPath': string }> = [];

  class TracingFs extends VirtualFileSystem {
    override onRename(oldPath: string, newPath: string): void {
      log.push({ 'oldPath': oldPath, 'newPath': newPath });
    }
  }

  const fs = TracingFs.create();
  fs.writeFileSync('/old.txt', 'data', 'utf8');
  fs.renameSync('/old.txt', '/new.txt');
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0]?.oldPath, '/old.txt');
  assert.strictEqual(log[0]?.newPath, '/new.txt');
});
