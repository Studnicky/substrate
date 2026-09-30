import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';

import { VirtualFileSystem } from '../../../src/virtual-fs/VirtualFileSystem.js';
import { VirtualFileSystemScenarioCaseEntity } from './entities/VirtualFileSystemScenarioCaseEntity.js';
import scenarioGroups from './VirtualFileSystem.scenarios.json' with { 'type': 'json' };

/** Raised when a scenario value cannot be converted to a bigint or an item is missing. */
class VirtualFileSystemScenarioError extends BaseError {
  public override readonly name: string = 'VirtualFileSystemScenarioError';

  public constructor(message: string, cause?: unknown) {
    super({
      'cause': cause,
      'code': 'virtualFs.scenarioValueInvalid',
      'message': message,
      'retryable': false
    });
  }
}

/** A controllable clock whose reading only moves when the scenario advances it. */
class MockClock {
  #clockMs: number;

  public constructor(startMs: number) {
    this.#clockMs = startMs;
  }

  public advance(ms: number): void {
    this.#clockMs += ms;
  }

  public hrtime(): bigint {
    try {
      const nanoseconds = BigInt(this.#clockMs) * 1_000_000n;
      return nanoseconds;
    } catch (error) {
      throw new VirtualFileSystemScenarioError(`Clock reading ${String(this.#clockMs)} is not a bigint`, error);
    }
  }

  public now(): number {
    const nowMs = this.#clockMs;
    return nowMs;
  }
}

class VirtualFileSystemRunners {
  static 'create-clock-deterministic'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'create-clock-deterministic'>): void {
    const { expected, input } = scenarioCase;
    const clock = new MockClock(input.clockMs);
    const fs = VirtualFileSystem.create({ 'clock': clock });
    fs.writeFileSync(input.path, input.content, input.encoding);
    const stat = fs.statSync(input.path);
    assert.strictEqual(stat.mtimeMs, expected.mtimeMs);
  }

  static 'create-seed-empty'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'create-seed-empty'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create({ 'seed': VirtualFileSystemRunners.createSeedMap(input.seed) });
    assert.strictEqual(fs.existsSync(expected.rootPath), true);
    assert.deepStrictEqual(
      fs.readdirSync(expected.rootPath),
      expected.rootEntries
    );
  }

  static 'create-seed-populates'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'create-seed-populates'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create({
      'seed': VirtualFileSystemRunners.createSeedMap(input.seed)
    });
    assert.strictEqual(
      fs.readFileSync(input.readPath, 'utf8'),
      expected.content
    );
  }

  static 'exists-after-write'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'exists-after-write'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.path, input.content, input.encoding);
    assert.strictEqual(fs.existsSync(input.path), expected.exists);
  }

  static 'exists-missing'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'exists-missing'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    assert.strictEqual(fs.existsSync(input.path), expected.exists);
  }

  static 'exists-root'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'exists-root'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    assert.strictEqual(fs.existsSync(input.path), expected.exists);
  }

  static 'lifecycle-onCreate'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'lifecycle-onCreate'>): void {
    const { expected, input } = scenarioCase;
    const log: string[] = [];
    class TracingFs extends VirtualFileSystem {
      static override create(): TracingFs {
        return new TracingFs({});
      }
      override onCreate(path: string): void {
        log.push(`create:${path}`);
      }
    }
    const fs = TracingFs.create();
    fs.writeFileSync(input.path, input.content, input.encoding);
    assert.ok(log.includes(expected.logEntry));
  }

  static 'lifecycle-onDelete'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'lifecycle-onDelete'>): void {
    const { expected, input } = scenarioCase;
    const log: string[] = [];
    class TracingFs extends VirtualFileSystem {
      static override create(): TracingFs {
        return new TracingFs({});
      }
      override onDelete(path: string): void {
        log.push(`delete:${path}`);
      }
    }
    const fs = TracingFs.create();
    fs.writeFileSync(input.path, input.content, input.encoding);
    fs.unlinkSync(input.path);
    assert.ok(log.includes(expected.logEntry));
  }

  static 'lifecycle-onRead'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'lifecycle-onRead'>): void {
    const { expected, input } = scenarioCase;
    const log: string[] = [];
    class TracingFs extends VirtualFileSystem {
      static override create(): TracingFs {
        return new TracingFs({});
      }
      override onRead(path: string): void {
        log.push(`read:${path}`);
      }
    }
    const fs = TracingFs.create();
    fs.writeFileSync(input.path, input.content, input.encoding);
    fs.readFileSync(input.path, input.encoding);
    assert.ok(log.includes(expected.logEntry));
  }

  static 'lifecycle-onRename'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'lifecycle-onRename'>): void {
    const { expected, input } = scenarioCase;
    const log: { 'newPath': string; 'oldPath': string }[] = [];
    class TracingFs extends VirtualFileSystem {
      static override create(): TracingFs {
        return new TracingFs({});
      }
      override onRename(oldPath: string, newPath: string): void {
        log.push({ 'newPath': newPath, 'oldPath': oldPath });
      }
    }
    const fs = TracingFs.create();
    fs.writeFileSync(input.from, input.content, input.encoding);
    fs.renameSync(input.from, input.to);
    assert.strictEqual(log.length, 1);
    assert.deepStrictEqual(log[0], expected.logEntry);
  }

  static 'lifecycle-onWrite'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'lifecycle-onWrite'>): void {
    const { expected, input } = scenarioCase;
    const log: string[] = [];
    class TracingFs extends VirtualFileSystem {
      static override create(): TracingFs {
        return new TracingFs({});
      }
      override onWrite(path: string): void {
        log.push(`write:${path}`);
      }
    }
    const fs = TracingFs.create();
    fs.writeFileSync(input.path, input.firstContent, input.encoding);
    fs.writeFileSync(input.path, input.secondContent, input.encoding);
    assert.ok(log.includes(expected.logEntry));
  }

  static 'mkdir-existing-dir-no-throw'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'mkdir-existing-dir-no-throw'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.path, { 'recursive': input.recursive });
    assert.doesNotThrow(() => {
      fs.mkdirSync(input.path, { 'recursive': input.recursive });
    });
    assert.strictEqual(false, expected.didThrow);
  }

  static 'mkdir-existing-dir-throws'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'mkdir-existing-dir-throws'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.path, { 'recursive': input.existingRecursive });
    VirtualFileSystemRunners.assertThrowsCode(() => {
      fs.mkdirSync(input.path);
    }, expected.errorCode);
  }

  static 'mkdir-file-path-throws'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'mkdir-file-path-throws'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.path, input.content, input.encoding);
    VirtualFileSystemRunners.assertThrowsCode(() => {
      fs.mkdirSync(input.path);
    }, expected.errorCode);
    assert.strictEqual(fs.statSync(input.path).isDirectory(), false);
    assert.strictEqual(
      fs.readFileSync(input.path, input.encoding),
      expected.fileContent
    );
    assert.strictEqual(fs.existsSync(input.path), expected.fileStillExists);
  }

  static 'mkdir-recursive-creates'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'mkdir-recursive-creates'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.path, { 'recursive': input.recursive });
    for (let index = 0; index < expected.exists.length; index += 1) {
      const path = VirtualFileSystemRunners.itemAt(expected.exists, index);
      assert.strictEqual(fs.existsSync(path), true);
    }
  }

  static 'mkdir-recursive-intermediate-file-throws'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'mkdir-recursive-intermediate-file-throws'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.intermediateFilePath, input.content, input.encoding);
    VirtualFileSystemRunners.assertThrowsCode(() => {
      fs.mkdirSync(input.path, { 'recursive': true });
    }, expected.errorCode);
  }

  static 'read-missing-throws'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'read-missing-throws'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    VirtualFileSystemRunners.assertThrowsCode(() => {
      fs.readFileSync(input.path, input.encoding);
    }, expected.errorCode);
  }

  static 'readdir-missing-throws'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'readdir-missing-throws'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    VirtualFileSystemRunners.assertThrowsCode(() => {
      fs.readdirSync(input.path);
    }, expected.errorCode);
  }

  static 'readdir-mixed-operations'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'readdir-mixed-operations'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    for (let index = 0; index < input.rootFiles.length; index += 1) {
      const file = VirtualFileSystemRunners.itemAt(input.rootFiles, index);
      fs.writeFileSync(file.path, file.content, 'utf8');
    }
    fs.mkdirSync(input.childDirectory, { 'recursive': true });
    fs.writeFileSync(input.leafPath, input.leafContent, 'utf8');
    fs.unlinkSync(input.removedPath);
    fs.renameSync(input.directory, input.renamedDirectory);
    fs.writeFileSync(input.extraPath, input.extraContent, 'utf8');
    assert.deepStrictEqual(
      new Set(fs.readdirSync('/')),
      new Set(expected.rootEntries)
    );
    assert.deepStrictEqual(
      new Set(fs.readdirSync(input.renamedDirectory)),
      new Set(expected.dirBEntries)
    );
    const renamedChildDirectory = input.childDirectory.replace(
      input.directory,
      input.renamedDirectory
    );
    assert.deepStrictEqual(
      new Set(fs.readdirSync(renamedChildDirectory)),
      new Set(expected.childEntries)
    );
  }

  static 'readdir-no-nested'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'readdir-no-nested'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.directory, { 'recursive': true });
    fs.writeFileSync(input.filePath, input.content, 'utf8');
    const entries = fs.readdirSync('/');
    VirtualFileSystemRunners.assertIncluded(entries, expected.includedEntries);
    VirtualFileSystemRunners.assertExcluded(entries, expected.excludedEntries);
  }

  static 'readdir-reflects-dir-rename'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'readdir-reflects-dir-rename'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    for (let index = 0; index < input.directories.length; index += 1) {
      const directory = VirtualFileSystemRunners.itemAt(input.directories, index);
      fs.mkdirSync(directory, { 'recursive': true });
    }
    for (let index = 0; index < input.files.length; index += 1) {
      const file = VirtualFileSystemRunners.itemAt(input.files, index);
      fs.writeFileSync(file.path, file.content, 'utf8');
    }
    fs.renameSync(input.from, input.to);
    assert.throws(() => {
      fs.readdirSync(input.missingAfterRename);
    });
    assert.deepStrictEqual(
      new Set(fs.readdirSync('/')),
      new Set(expected.rootEntries)
    );
    assert.deepStrictEqual(
      new Set(fs.readdirSync(input.to)),
      new Set(expected.movedEntries)
    );
    assert.deepStrictEqual(
      new Set(fs.readdirSync(input.movedSubDirectory)),
      new Set(expected.movedSubEntries)
    );
  }

  static 'readdir-reflects-file-rename'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'readdir-reflects-file-rename'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.directory, { 'recursive': true });
    fs.writeFileSync(input.from, input.content, 'utf8');
    fs.renameSync(input.from, input.to);
    const dirEntries = fs.readdirSync(input.directory);
    VirtualFileSystemRunners.assertIncluded(dirEntries, expected.includedEntries);
    VirtualFileSystemRunners.assertExcluded(dirEntries, expected.excludedEntries);
  }

  static 'readdir-reflects-unlink'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'readdir-reflects-unlink'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.removed, input.removedContent, 'utf8');
    fs.writeFileSync(input.keep, input.keepContent, 'utf8');
    fs.unlinkSync(input.removed);
    const entries = fs.readdirSync('/');
    VirtualFileSystemRunners.assertIncluded(entries, expected.includedEntries);
    VirtualFileSystemRunners.assertExcluded(entries, expected.excludedEntries);
  }

  static 'readdir-root'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'readdir-root'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    for (let index = 0; index < input.files.length; index += 1) {
      const file = VirtualFileSystemRunners.itemAt(input.files, index);
      fs.writeFileSync(file.path, file.content, 'utf8');
    }
    const entries = fs.readdirSync('/');
    assert.deepStrictEqual(new Set(entries), new Set(expected.entries));
  }

  static 'readdir-scale-scope'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'readdir-scale-scope'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    for (let i = 0; i < input.unrelatedCount; i += 1) {
      fs.writeFileSync(`/unrelated-${i}.txt`, 'noise', 'utf8');
    }
    fs.mkdirSync(input.target, { 'recursive': true });
    fs.writeFileSync(input.targetFile, 'value', 'utf8');
    for (let i = 0; i < input.unrelatedCount; i += 1) {
      fs.mkdirSync(`/other-${i}/nested`, { 'recursive': true });
    }
    assert.deepStrictEqual(fs.readdirSync(input.target), expected.entries);
  }

  static 'rename-directory'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'rename-directory'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.path, { 'recursive': true });
    fs.renameSync(input.path, input.renamedPath);
    assert.strictEqual(fs.existsSync(input.path), expected.sourceExists);
    assert.strictEqual(fs.existsSync(input.renamedPath), expected.targetExists);
    assert.strictEqual(
      fs.statSync(input.renamedPath).isDirectory(),
      expected.targetIsDirectory
    );
  }

  static 'rename-directory-subtree'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'rename-directory-subtree'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.childPath, { 'recursive': true });
    fs.writeFileSync(input.filePath, input.fileContent, 'utf8');
    fs.writeFileSync(input.nestedPath, input.nestedContent, 'utf8');
    fs.renameSync(input.sourcePath, input.targetPath);
    assert.strictEqual(fs.existsSync(input.sourcePath), expected.sourceExists);
    assert.strictEqual(
      fs.readFileSync(input.movedFilePath, 'utf8'),
      expected.movedFileContent
    );
    assert.strictEqual(
      fs.readFileSync(input.movedNestedPath, 'utf8'),
      expected.movedNestedContent
    );
  }

  static 'rename-file-moves-content'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'rename-file-moves-content'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.from, input.content, input.encoding);
    fs.renameSync(input.from, input.to);
    assert.strictEqual(
      fs.readFileSync(input.to, input.encoding),
      expected.content
    );
    assert.strictEqual(fs.existsSync(input.from), expected.sourceExists);
    assert.strictEqual(fs.existsSync(input.to), expected.targetExists);
  }

  static 'rename-missing-throws'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'rename-missing-throws'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    VirtualFileSystemRunners.assertThrowsCode(() => {
      fs.renameSync(input.from, input.to);
    }, expected.errorCode);
  }

  static 'stat-dir-shape'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'stat-dir-shape'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.path);
    const stat = fs.statSync(input.path);
    assert.strictEqual(stat.isDirectory(), expected.isDirectory);
    assert.strictEqual(stat.isFile(), expected.isFile);
  }

  static 'stat-file-shape'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'stat-file-shape'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.path, input.content, input.encoding);
    const stat = fs.statSync(input.path);
    assert.strictEqual(stat.isFile(), expected.isFile);
    assert.strictEqual(stat.isDirectory(), expected.isDirectory);
  }

  static 'stat-missing-throws'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'stat-missing-throws'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    VirtualFileSystemRunners.assertThrowsCode(() => {
      fs.statSync(input.path);
    }, expected.errorCode);
  }

  static 'stat-mtime-clock'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'stat-mtime-clock'>): void {
    const { expected, input } = scenarioCase;
    const clock = new MockClock(input.initialClockMs);
    const fs = VirtualFileSystem.create({ 'clock': clock });
    clock.advance(input.advanceMs);
    fs.writeFileSync(input.path, input.content, input.encoding);
    const stat = fs.statSync(input.path);
    assert.strictEqual(stat.mtimeMs, expected.mtimeMs);
  }

  static 'unlink-directory-throws'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'unlink-directory-throws'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.path, { 'recursive': true });
    VirtualFileSystemRunners.assertThrowsCode(() => {
      fs.unlinkSync(input.path);
    }, expected.errorCode);
  }

  static 'unlink-missing-throws'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'unlink-missing-throws'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    VirtualFileSystemRunners.assertThrowsCode(() => {
      fs.unlinkSync(input.path);
    }, expected.errorCode);
  }

  static 'unlink-removes'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'unlink-removes'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.path, input.content, input.encoding);
    fs.unlinkSync(input.path);
    assert.strictEqual(fs.existsSync(input.path), expected.exists);
  }

  static 'write-overwrite'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'write-overwrite'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.path, input.firstContent, input.encoding);
    fs.writeFileSync(input.path, input.secondContent, input.encoding);
    assert.strictEqual(
      fs.readFileSync(input.path, input.encoding),
      expected.content
    );
  }

  static 'write-roundtrip'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemScenarioCaseEntity.Type, 'write-roundtrip'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.path, input.content, input.encoding);
    assert.strictEqual(
      fs.readFileSync(input.path, input.encoding),
      expected.content
    );
  }

  private static assertExcluded(entries: readonly string[], expectedEntries: readonly string[]): void {
    const entrySet = new Set(entries);
    for (let index = 0; index < expectedEntries.length; index += 1) {
      assert.strictEqual(entrySet.has(VirtualFileSystemRunners.itemAt(expectedEntries, index)), false);
    }
  }

  private static assertIncluded(entries: readonly string[], expectedEntries: readonly string[]): void {
    const entrySet = new Set(entries);
    for (let index = 0; index < expectedEntries.length; index += 1) {
      assert.strictEqual(entrySet.has(VirtualFileSystemRunners.itemAt(expectedEntries, index)), true);
    }
  }

  private static assertThrowsCode(operation: () => void, errorCode: string): void {
    assert.throws(operation, (caught) => {
      const thrown: unknown = caught;
      const matches = thrown instanceof Error && thrown.message.includes(errorCode);
      return matches;
    });
  }

  private static createSeedMap(seed: readonly { readonly 'content': string; readonly 'path': string }[]): Map<string, string> {
    const seedMap = new Map<string, string>();
    for (let index = 0; index < seed.length; index += 1) {
      const item = VirtualFileSystemRunners.itemAt(seed, index);
      seedMap.set(item.path, item.content);
    }
    return seedMap;
  }

  private static itemAt<T>(values: readonly T[], index: number): T {
    const value = values[index];
    if (value === undefined) {
      throw new VirtualFileSystemScenarioError(`Expected item at index ${String(index)}`);
    }
    return value;
  }
}

ScenarioSuite.register({
  'entity': VirtualFileSystemScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'VirtualFileSystem',
  'runners': VirtualFileSystemRunners
});
