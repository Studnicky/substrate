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

it('renameSync moves an existing directory to a new path', () => {
  const fs = VirtualFileSystem.create();
  fs.mkdirSync('/dir', { 'recursive': true });
  fs.renameSync('/dir', '/renamed');
  assert.strictEqual(fs.existsSync('/dir'), false);
  assert.strictEqual(fs.existsSync('/renamed'), true);
  assert.strictEqual(fs.statSync('/renamed').isDirectory(), true);
});

it('renameSync moves a directory along with its descendant entries', () => {
  const fs = VirtualFileSystem.create();
  fs.mkdirSync('/dir/sub', { 'recursive': true });
  fs.writeFileSync('/dir/file.txt', 'content', 'utf8');
  fs.writeFileSync('/dir/sub/nested.txt', 'nested', 'utf8');

  fs.renameSync('/dir', '/moved');

  assert.strictEqual(fs.existsSync('/dir'), false);
  assert.strictEqual(fs.existsSync('/dir/file.txt'), false);
  assert.strictEqual(fs.existsSync('/dir/sub'), false);
  assert.strictEqual(fs.existsSync('/dir/sub/nested.txt'), false);

  assert.strictEqual(fs.existsSync('/moved'), true);
  assert.strictEqual(fs.statSync('/moved/sub').isDirectory(), true);
  assert.strictEqual(fs.readFileSync('/moved/file.txt', 'utf8'), 'content');
  assert.strictEqual(fs.readFileSync('/moved/sub/nested.txt', 'utf8'), 'nested');
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

it('readdirSync reflects unlinkSync removals', () => {
  const fs = VirtualFileSystem.create();
  fs.writeFileSync('/a.txt', 'a', 'utf8');
  fs.writeFileSync('/b.txt', 'b', 'utf8');
  fs.unlinkSync('/a.txt');
  const entries = fs.readdirSync('/');
  assert.ok(!entries.includes('a.txt'));
  assert.ok(entries.includes('b.txt'));
});

it('readdirSync reflects renameSync of a file into and out of a directory listing', () => {
  const fs = VirtualFileSystem.create();
  fs.mkdirSync('/dir', { 'recursive': true });
  fs.writeFileSync('/dir/old.txt', 'x', 'utf8');
  fs.renameSync('/dir/old.txt', '/dir/new.txt');
  const dirEntries = fs.readdirSync('/dir');
  assert.ok(!dirEntries.includes('old.txt'));
  assert.ok(dirEntries.includes('new.txt'));
});

it('readdirSync reflects a directory rename that moves a subtree, using the new parent path', () => {
  const fs = VirtualFileSystem.create();
  fs.mkdirSync('/dir/sub', { 'recursive': true });
  fs.writeFileSync('/dir/file.txt', 'content', 'utf8');
  fs.writeFileSync('/dir/sub/nested.txt', 'nested', 'utf8');

  fs.renameSync('/dir', '/moved');

  // Old parent paths no longer resolve.
  assert.throws(() => { fs.readdirSync('/dir'); });

  // New parent path lists the direct children correctly.
  const rootEntries = fs.readdirSync('/');
  assert.ok(!rootEntries.includes('dir'));
  assert.ok(rootEntries.includes('moved'));

  const movedEntries = fs.readdirSync('/moved');
  assert.ok(movedEntries.includes('sub'));
  assert.ok(movedEntries.includes('file.txt'));

  const movedSubEntries = fs.readdirSync('/moved/sub');
  assert.ok(movedSubEntries.includes('nested.txt'));
});

it('readdirSync after mixed create/delete/rename operations returns only current, correctly-scoped direct children', () => {
  const fs = VirtualFileSystem.create();
  fs.writeFileSync('/keep.txt', 'k', 'utf8');
  fs.writeFileSync('/gone.txt', 'g', 'utf8');
  fs.mkdirSync('/dirA/child', { 'recursive': true });
  fs.writeFileSync('/dirA/child/leaf.txt', 'l', 'utf8');

  fs.unlinkSync('/gone.txt');
  fs.renameSync('/dirA', '/dirB');
  fs.writeFileSync('/dirB/extra.txt', 'e', 'utf8');

  const rootEntries = fs.readdirSync('/');
  assert.deepStrictEqual(new Set(rootEntries), new Set(['keep.txt', 'dirB']));

  const dirBEntries = fs.readdirSync('/dirB');
  assert.deepStrictEqual(new Set(dirBEntries), new Set(['child', 'extra.txt']));

  const childEntries = fs.readdirSync('/dirB/child');
  assert.deepStrictEqual(new Set(childEntries), new Set(['leaf.txt']));
});

it('readdirSync returns only direct children under a path, independent of total filesystem size', () => {
  const fs = VirtualFileSystem.create();

  // Populate many unrelated top-level entries plus files nested elsewhere.
  const unrelatedCount = 500;
  for (let i = 0; i < unrelatedCount; i += 1) {
    fs.writeFileSync(`/unrelated-${i}.txt`, 'noise', 'utf8');
  }
  fs.mkdirSync('/target', { 'recursive': true });
  fs.writeFileSync('/target/only.txt', 'value', 'utf8');
  for (let i = 0; i < unrelatedCount; i += 1) {
    fs.mkdirSync(`/other-${i}/nested`, { 'recursive': true });
  }

  // Regardless of the thousands of unrelated entries in the filesystem,
  // the directory listing for '/target' must contain exactly its one child
  // — proving the result is index-scoped rather than a filtered full scan.
  const entries = fs.readdirSync('/target');
  assert.deepStrictEqual(entries, ['only.txt']);
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

it('unlinkSync throws EISDIR for an existing directory', () => {
  const fs = VirtualFileSystem.create();
  fs.mkdirSync('/mydir', { 'recursive': true });
  assert.throws(
    () => { fs.unlinkSync('/mydir'); },
    (err: unknown) => { return err instanceof Error && err.message.includes('EISDIR'); }
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

it('mkdirSync throws when a file already occupies the path', () => {
  const fs = VirtualFileSystem.create();
  fs.writeFileSync('/a', 'x', 'utf8');
  assert.throws(
    () => { fs.mkdirSync('/a'); },
    (err: unknown) => { return err instanceof Error && err.message.includes('EEXIST'); }
  );
  // The filesystem must not end up in a contradictory state.
  assert.strictEqual(fs.statSync('/a').isDirectory(), false);
  assert.strictEqual(fs.readFileSync('/a', 'utf8'), 'x');
});

it('mkdirSync recursive throws when an intermediate segment is a file', () => {
  const fs = VirtualFileSystem.create();
  fs.writeFileSync('/a', 'x', 'utf8');
  assert.throws(
    () => { fs.mkdirSync('/a/b', { 'recursive': true }); },
    (err: unknown) => { return err instanceof Error && err.message.includes('ENOTDIR'); }
  );
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

// ── Creation options ───────────────────────────────────────────────────────

it('create() seed pre-populates files', () => {
  const fs = VirtualFileSystem.create({
    'seed': new Map([['/seeded.txt', 'seeded content']])
  });
  assert.strictEqual(fs.readFileSync('/seeded.txt', 'utf8'), 'seeded content');
});

it('create() injects a clock for deterministic time', () => {
  resetClock();
  _clockMs = 2000;
  const fs = VirtualFileSystem.create({ 'clock': mockClock });
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
