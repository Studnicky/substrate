import { HookInvocationError, RuntimeError } from '@studnicky/errors/node';
import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import timersPromises from 'node:timers/promises';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { VirtualFileSystem } from '../../../src/virtual-fs/VirtualFileSystem.js';
import { VirtualFileSystemSubclassScenarioCaseEntity } from './entities/VirtualFileSystemSubclassScenarioCaseEntity.js';
import scenarioGroups from './VirtualFileSystem.subclass.scenarios.json' with { 'type': 'json' };

/** Raised when a scenario list is missing an item the scenario needs. */
class VirtualFileSystemScenarioError extends BaseError {
  public override readonly name: string = 'VirtualFileSystemScenarioError';

  public constructor(message: string) {
    super({
      'code': 'virtualFs.scenarioItemMissing',
      'message': message,
      'retryable': false
    });
  }
}

class CreateLogFs extends VirtualFileSystem {
  static override create(): CreateLogFs {
    return new CreateLogFs({});
  }
  readonly createLog: string[] = [];
  override onCreate(path: string): void {
    this.createLog.push(path);
  }
}

class WriteLogFs extends VirtualFileSystem {
  static override create(): WriteLogFs {
    return new WriteLogFs({});
  }
  readonly writeLog: string[] = [];
  override onWrite(path: string): void {
    this.writeLog.push(path);
  }
}

class ReadLogFs extends VirtualFileSystem {
  static override create(): ReadLogFs {
    return new ReadLogFs({});
  }
  readonly readLog: string[] = [];
  override onRead(path: string): void {
    this.readLog.push(path);
  }
}

class DeleteLogFs extends VirtualFileSystem {
  static override create(): DeleteLogFs {
    return new DeleteLogFs({});
  }
  readonly deleteLog: string[] = [];
  override onDelete(path: string): void {
    this.deleteLog.push(path);
  }
}

class RenameLogFs extends VirtualFileSystem {
  static override create(): RenameLogFs {
    return new RenameLogFs({});
  }
  readonly renameLog: { 'from': string; 'to': string }[] = [];
  override onRename(oldPath: string, newPath: string): void {
    this.renameLog.push({ 'from': oldPath, 'to': newPath });
  }
}

class AsyncRejectingCreateFs extends VirtualFileSystem {
  static override create(): AsyncRejectingCreateFs {
    return new AsyncRejectingCreateFs({});
  }
  override async onCreate(): Promise<void> {
    await Promise.resolve();
    throw RuntimeError.create('async onCreate boom');
  }
}

class FullTraceFs extends VirtualFileSystem {
  static override create(): FullTraceFs {
    return new FullTraceFs({});
  }
  readonly createLog: string[] = [];
  readonly deleteLog: string[] = [];
  readonly readLog: string[] = [];
  readonly renameLog: { 'from': string; 'to': string }[] = [];
  readonly writeLog: string[] = [];

  override onCreate(path: string): void {
    this.createLog.push(path);
  }
  override onDelete(path: string): void {
    this.deleteLog.push(path);
  }
  override onRead(path: string): void {
    this.readLog.push(path);
  }
  override onRename(oldPath: string, newPath: string): void {
    this.renameLog.push({ 'from': oldPath, 'to': newPath });
  }
  override onWrite(path: string): void {
    this.writeLog.push(path);
  }
}

class VirtualFileSystemSubclassRunners {
  static async 'async-create-hook'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'async-create-hook'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const fs = AsyncRejectingCreateFs.create();
    let unhandledRejectionCount = 0;
    const onUnhandledRejection = (): void => {
      unhandledRejectionCount += 1;
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      fs.writeFileSync(input.path, input.content, 'utf8');
      await timersPromises.setImmediate();
      await timersPromises.setImmediate();
      assert.equal(unhandledRejectionCount, expected.rejections.length);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }

    assert.equal(fs.readFileSync(input.path, 'utf8'), expected.content);
  }

  static 'full-trace'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'full-trace'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystemSubclassRunners.createFullTraceFs();
    fs.writeFileSync(input.path, input.contentA, 'utf8');
    fs.writeFileSync(input.path, input.contentB, 'utf8');
    fs.readFileSync(input.path, 'utf8');
    fs.renameSync(input.path, input.renamed);
    fs.unlinkSync(input.renamed);

    assert.deepStrictEqual(fs.createLog, expected.createLog);
    assert.deepStrictEqual(fs.writeLog, expected.writeLog);
    assert.deepStrictEqual(fs.readLog, expected.readLog);
    assert.strictEqual(fs.renameLog.length, expected.renameCount);
    assert.deepStrictEqual(fs.deleteLog, expected.deleteLog);
  }

  static 'hook-cause-chains'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'hook-cause-chains'>): void {
    const { expected, input } = scenarioCase;
    const original = RuntimeError.create('original boom');
    class ThrowingCreateFs extends VirtualFileSystem {
      static override create(): ThrowingCreateFs {
        return new ThrowingCreateFs({});
      }
      override onCreate(): void {
        throw original;
      }
    }

    const fs = ThrowingCreateFs.create();
    assert.throws(
      () => {
        fs.writeFileSync(input.path, input.content, 'utf8');
      },
      (caught) => {
        const error: unknown = caught;
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.cause === original, expected.causeMatches);
        return true;
      }
    );
  }

  static 'onCreate-new-files'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'onCreate-new-files'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystemSubclassRunners.createCreateLogFs();
    for (let index = 0; index < input.files.length; index += 1) {
      const file = VirtualFileSystemSubclassRunners.itemAt(input.files, index);
      fs.writeFileSync(file.path, file.content, 'utf8');
    }
    assert.deepStrictEqual(fs.createLog, expected.createLog);
  }

  static 'onCreate-no-overwrite'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'onCreate-no-overwrite'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystemSubclassRunners.createCreateLogFs();
    fs.writeFileSync(input.path, input.first, 'utf8');
    fs.writeFileSync(input.path, input.second, 'utf8');
    assert.strictEqual(fs.createLog.length, expected.createCount);
  }

  static 'onCreate-recursive-mkdir'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'onCreate-recursive-mkdir'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystemSubclassRunners.createCreateLogFs();
    fs.mkdirSync(input.path, { 'recursive': true });
    const createdPaths = new Set(fs.createLog);
    for (let index = 0; index < expected.createLogIncludes.length; index += 1) {
      assert.ok(createdPaths.has(VirtualFileSystemSubclassRunners.itemAt(expected.createLogIncludes, index)));
    }
  }

  static 'onDelete-not-before-unlink'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'onDelete-not-before-unlink'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystemSubclassRunners.createDeleteLogFs();
    fs.writeFileSync(input.path, input.content, 'utf8');
    assert.strictEqual(fs.deleteLog.length, expected.deleteCount);
  }

  static 'onDelete-unlinkSync'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'onDelete-unlinkSync'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystemSubclassRunners.createDeleteLogFs();
    fs.writeFileSync(input.path, input.content, 'utf8');
    fs.unlinkSync(input.path);
    assert.deepStrictEqual(fs.deleteLog, expected.deleteLog);
  }

  static 'onRead-readdirSync'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'onRead-readdirSync'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystemSubclassRunners.createReadLogFs();
    fs.readdirSync(input.path);
    const readPaths = new Set(fs.readLog);
    for (let index = 0; index < expected.readLogIncludes.length; index += 1) {
      assert.ok(readPaths.has(VirtualFileSystemSubclassRunners.itemAt(expected.readLogIncludes, index)));
    }
  }

  static 'onRead-readFileSync'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'onRead-readFileSync'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystemSubclassRunners.createReadLogFs();
    fs.writeFileSync(input.path, input.content, 'utf8');
    fs.readFileSync(input.path, 'utf8');
    assert.deepStrictEqual(fs.readLog, expected.readLog);
  }

  static 'onRename-paths'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'onRename-paths'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystemSubclassRunners.createRenameLogFs();
    fs.writeFileSync(input.from, input.content, 'utf8');
    fs.renameSync(input.from, input.to);
    assert.deepStrictEqual(fs.renameLog, expected.renameLog);
  }

  static 'onWrite-update-only'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'onWrite-update-only'>): void {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystemSubclassRunners.createWriteLogFs();
    fs.writeFileSync(input.path, input.first, 'utf8');
    assert.strictEqual(fs.writeLog.length, 0);
    fs.writeFileSync(input.path, input.second, 'utf8');
    assert.deepStrictEqual(fs.writeLog, expected.writeLog);
  }

  static 'subclass-create-instance'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'subclass-create-instance'>): void {
    const { expected } = scenarioCase;
    const fs = VirtualFileSystemSubclassRunners.createFullTraceFs();
    assert.equal(fs instanceof FullTraceFs, expected.instanceofSubclass);
    assert.equal(fs instanceof VirtualFileSystem, expected.instanceofBase);
  }

  static 'throwing-create-hook'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'throwing-create-hook'>): void {
    const { expected, input } = scenarioCase;
    class ThrowingCreateFs extends VirtualFileSystem {
      static override create(): ThrowingCreateFs {
        return new ThrowingCreateFs({});
      }
      override onCreate(): void {
        throw RuntimeError.create('onCreate boom');
      }
    }

    const fs = ThrowingCreateFs.create();
    assert.throws(
      () => {
        fs.writeFileSync(input.path, input.content, 'utf8');
      },
      (caught) => {
        const error: unknown = caught;
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.hookName, expected.hookName);
        return true;
      }
    );

    assert.equal(
      fs.readFileSync(input.path, 'utf8') === input.content,
      expected.written
    );
  }

  static 'throwing-delete-hook'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'throwing-delete-hook'>): void {
    const { expected, input } = scenarioCase;
    class ThrowingDeleteFs extends VirtualFileSystem {
      static override create(): ThrowingDeleteFs {
        return new ThrowingDeleteFs({});
      }
      override onDelete(): void {
        throw RuntimeError.create('onDelete boom');
      }
    }

    const fs = ThrowingDeleteFs.create();
    fs.writeFileSync(input.path, input.content, 'utf8');
    assert.throws(
      () => {
        fs.unlinkSync(input.path);
      },
      (caught) => {
        const error: unknown = caught;
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.hookName, expected.hookName);
        return true;
      }
    );

    assert.equal(fs.existsSync(input.path), expected.exists);
  }

  static 'throwing-read-hook'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'throwing-read-hook'>): void {
    const { expected, input } = scenarioCase;
    class ThrowingReadFs extends VirtualFileSystem {
      static override create(): ThrowingReadFs {
        return new ThrowingReadFs({});
      }
      override onRead(): void {
        throw RuntimeError.create('onRead boom');
      }
    }

    const fs = ThrowingReadFs.create();
    fs.writeFileSync(input.path, input.content, 'utf8');

    assert.throws(
      () => {
        fs.readFileSync(input.path, 'utf8');
      },
      (caught) => {
        const error: unknown = caught;
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.hookName, expected.hookName);
        return true;
      }
    );
  }

  static 'throwing-rename-hook'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'throwing-rename-hook'>): void {
    const { expected, input } = scenarioCase;
    class ThrowingRenameFs extends VirtualFileSystem {
      static override create(): ThrowingRenameFs {
        return new ThrowingRenameFs({});
      }
      override onRename(): void {
        throw RuntimeError.create('onRename boom');
      }
    }

    const fs = ThrowingRenameFs.create();
    fs.writeFileSync(input.from, input.content, 'utf8');
    assert.throws(
      () => {
        fs.renameSync(input.from, input.to);
      },
      (caught) => {
        const error: unknown = caught;
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.hookName, expected.hookName);
        return true;
      }
    );

    assert.equal(fs.existsSync(input.from), expected.oldExists);
    assert.equal(fs.readFileSync(input.to, 'utf8'), expected.newContent);
  }

  static 'throwing-write-hook'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemSubclassScenarioCaseEntity.Type, 'throwing-write-hook'>): void {
    const { expected, input } = scenarioCase;
    class ThrowingWriteFs extends VirtualFileSystem {
      static override create(): ThrowingWriteFs {
        return new ThrowingWriteFs({});
      }
      override onWrite(): void {
        throw RuntimeError.create('onWrite boom');
      }
    }

    const fs = ThrowingWriteFs.create();
    fs.writeFileSync(input.path, input.first, 'utf8');
    assert.throws(
      () => {
        fs.writeFileSync(input.path, input.second, 'utf8');
      },
      (caught) => {
        const error: unknown = caught;
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.hookName, expected.hookName);
        return true;
      }
    );

    assert.equal(
      fs.readFileSync(input.path, 'utf8') === input.second,
      expected.written
    );
  }

  private static createCreateLogFs(): CreateLogFs {
    const fs = CreateLogFs.create();
    assert.ok(fs instanceof CreateLogFs);
    return fs;
  }

  private static createDeleteLogFs(): DeleteLogFs {
    const fs = DeleteLogFs.create();
    assert.ok(fs instanceof DeleteLogFs);
    return fs;
  }

  private static createFullTraceFs(): FullTraceFs {
    const fs = FullTraceFs.create();
    assert.ok(fs instanceof FullTraceFs);
    return fs;
  }

  private static createReadLogFs(): ReadLogFs {
    const fs = ReadLogFs.create();
    assert.ok(fs instanceof ReadLogFs);
    return fs;
  }

  private static createRenameLogFs(): RenameLogFs {
    const fs = RenameLogFs.create();
    assert.ok(fs instanceof RenameLogFs);
    return fs;
  }

  private static createWriteLogFs(): WriteLogFs {
    const fs = WriteLogFs.create();
    assert.ok(fs instanceof WriteLogFs);
    return fs;
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
  'entity': VirtualFileSystemSubclassScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'VirtualFileSystem subclasses',
  'runners': VirtualFileSystemSubclassRunners
});
