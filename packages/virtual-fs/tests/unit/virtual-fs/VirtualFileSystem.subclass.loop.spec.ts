import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { HookInvocationError } from '@studnicky/errors';

import { VirtualFileSystem } from '../../../src/virtual-fs/VirtualFileSystem.js';
import scenarioGroups from './VirtualFileSystem.subclass.scenarios.json' with { type: 'json' };

type ScenarioCase = {
  [Kind in ScenarioKind]: ScenarioMetadata<Kind> & ScenarioCaseByKind[Kind];
}[ScenarioKind];

type ScenarioCaseOf<Kind extends ScenarioKind> = Extract<ScenarioCase, { kind: Kind }>;

type ScenarioHandler<Kind extends ScenarioKind> = (scenarioCase: ScenarioCaseOf<Kind>) => Promise<void> | void;

type ScenarioHandlers = {
  [Kind in ScenarioKind]: ScenarioHandler<Kind>;
};

type ScenarioKind = keyof ScenarioCaseByKind;

type ScenarioMetadata<Kind extends string> = {
  description: string;
  kind: Kind;
  name: string;
};

interface ScenarioCaseByKind {
  'async-create-hook': {
    expected: { content: string; rejections: unknown[] };
    input: { content: string; path: string };
  };
  'full-trace': {
    expected: {
      createLog: string[];
      deleteLog: string[];
      readLog: string[];
      renameCount: number;
      writeLog: string[];
    };
    input: {
      contentA: string;
      contentB: string;
      path: string;
      renamed: string;
    };
  };
  'hook-cause-chains': {
    expected: { causeMatches: boolean };
    input: { content: string; path: string };
  };
  'onCreate-new-files': {
    expected: { createLog: string[] };
    input: { files: Array<{ content: string; path: string }> };
  };
  'onCreate-no-overwrite': {
    expected: { createCount: number };
    input: {
      first: string;
      path: string;
      second: string;
    };
  };
  'onCreate-recursive-mkdir': {
    expected: { createLogIncludes: string[] };
    input: { path: string };
  };
  'onDelete-not-before-unlink': {
    expected: { deleteCount: number };
    input: { content: string; path: string };
  };
  'onDelete-unlinkSync': {
    expected: { deleteLog: string[] };
    input: { content: string; path: string };
  };
  'onRead-readFileSync': {
    expected: { readLog: string[] };
    input: { content: string; path: string };
  };
  'onRead-readdirSync': {
    expected: { readLogIncludes: string[] };
    input: { path: string };
  };
  'onRename-paths': {
    expected: { renameLog: Array<{ from: string; to: string }> };
    input: {
      content: string;
      from: string;
      to: string;
    };
  };
  'onWrite-update-only': {
    expected: { writeLog: string[] };
    input: {
      first: string;
      path: string;
      second: string;
    };
  };
  'subclass-create-instance': {
    expected: { instanceofBase: boolean; instanceofSubclass: boolean };
    input: { factory: string };
  };
  'throwing-create-hook': {
    expected: { hookName: string; written: boolean };
    input: { content: string; path: string };
  };
  'throwing-delete-hook': {
    expected: { exists: boolean; hookName: string };
    input: { content: string; path: string };
  };
  'throwing-read-hook': {
    expected: { hookName: string };
    input: { content: string; path: string };
  };
  'throwing-rename-hook': {
    expected: { hookName: string; newContent: string; oldExists: boolean };
    input: {
      content: string;
      from: string;
      to: string;
    };
  };
  'throwing-write-hook': {
    expected: { hookName: string; written: boolean };
    input: {
      first: string;
      path: string;
      second: string;
    };
  };
}

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

function createCreateLogFs(): CreateLogFs {
  const fs = CreateLogFs.create();
  assert.ok(fs instanceof CreateLogFs);
  return fs;
}

function createDeleteLogFs(): DeleteLogFs {
  const fs = DeleteLogFs.create();
  assert.ok(fs instanceof DeleteLogFs);
  return fs;
}

function createFullTraceFs(): FullTraceFs {
  const fs = FullTraceFs.create();
  assert.ok(fs instanceof FullTraceFs);
  return fs;
}

function createReadLogFs(): ReadLogFs {
  const fs = ReadLogFs.create();
  assert.ok(fs instanceof ReadLogFs);
  return fs;
}

function createRenameLogFs(): RenameLogFs {
  const fs = RenameLogFs.create();
  assert.ok(fs instanceof RenameLogFs);
  return fs;
}

function createWriteLogFs(): WriteLogFs {
  const fs = WriteLogFs.create();
  assert.ok(fs instanceof WriteLogFs);
  return fs;
}

const scenarioHandlers: ScenarioHandlers = {
  'async-create-hook': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    class AsyncRejectingCreateFs extends VirtualFileSystem {
      override onCreate(_path: string): Promise<void> {
        return Promise.reject(new Error('async onCreate boom'));
      }
    }

    const fs = AsyncRejectingCreateFs.create();
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      fs.writeFileSync(input.path, input.content, 'utf8');
      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.deepStrictEqual(rejectionEvents, expected.rejections);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }

    assert.equal(fs.readFileSync(input.path, 'utf8'), expected.content);
  },
  'full-trace': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createFullTraceFs();
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
  },
  'hook-cause-chains': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const original = new Error('original boom');
    class ThrowingCreateFs extends VirtualFileSystem {
      override onCreate(): void {
        throw original;
      }
    }

    const fs = ThrowingCreateFs.create();
    assert.throws(() => {
      fs.writeFileSync(input.path, input.content, 'utf8');
    }, (error: unknown) => {
      assert.ok(error instanceof HookInvocationError);
      assert.equal(error.cause === original, expected.causeMatches);
      return true;
    });
  },
  'onCreate-new-files': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createCreateLogFs();
    for (const file of input.files) {
      fs.writeFileSync(file.path, file.content, 'utf8');
    }
    assert.deepStrictEqual(fs.createLog, expected.createLog);
  },
  'onCreate-no-overwrite': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createCreateLogFs();
    fs.writeFileSync(input.path, input.first, 'utf8');
    fs.writeFileSync(input.path, input.second, 'utf8');
    assert.strictEqual(fs.createLog.length, expected.createCount);
  },
  'onCreate-recursive-mkdir': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createCreateLogFs();
    fs.mkdirSync(input.path, { 'recursive': true });
    for (const path of expected.createLogIncludes) {
      assert.ok(fs.createLog.includes(path));
    }
  },
  'onDelete-not-before-unlink': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createDeleteLogFs();
    fs.writeFileSync(input.path, input.content, 'utf8');
    assert.strictEqual(fs.deleteLog.length, expected.deleteCount);
  },
  'onDelete-unlinkSync': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createDeleteLogFs();
    fs.writeFileSync(input.path, input.content, 'utf8');
    fs.unlinkSync(input.path);
    assert.deepStrictEqual(fs.deleteLog, expected.deleteLog);
  },
  'onRead-readFileSync': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createReadLogFs();
    fs.writeFileSync(input.path, input.content, 'utf8');
    fs.readFileSync(input.path, 'utf8');
    assert.deepStrictEqual(fs.readLog, expected.readLog);
  },
  'onRead-readdirSync': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createReadLogFs();
    fs.readdirSync(input.path);
    for (const path of expected.readLogIncludes) {
      assert.ok(fs.readLog.includes(path));
    }
  },
  'onRename-paths': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createRenameLogFs();
    fs.writeFileSync(input.from, input.content, 'utf8');
    fs.renameSync(input.from, input.to);
    assert.deepStrictEqual(fs.renameLog, expected.renameLog);
  },
  'onWrite-update-only': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createWriteLogFs();
    fs.writeFileSync(input.path, input.first, 'utf8');
    assert.strictEqual(fs.writeLog.length, 0);
    fs.writeFileSync(input.path, input.second, 'utf8');
    assert.deepStrictEqual(fs.writeLog, expected.writeLog);
  },
  'subclass-create-instance': (scenarioCase) => {
    const { expected } = scenarioCase;
    const fs = createFullTraceFs();
    assert.equal(fs instanceof FullTraceFs, expected.instanceofSubclass);
    assert.equal(fs instanceof VirtualFileSystem, expected.instanceofBase);
  },
  'throwing-create-hook': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    class ThrowingCreateFs extends VirtualFileSystem {
      override onCreate(): void {
        throw new Error('onCreate boom');
      }
    }

    const fs = ThrowingCreateFs.create();
    assert.throws(() => {
      fs.writeFileSync(input.path, input.content, 'utf8');
    }, (error: unknown) => {
      assert.ok(error instanceof HookInvocationError);
      assert.equal(error.hookName, expected.hookName);
      return true;
    });

    assert.equal(fs.readFileSync(input.path, 'utf8') === input.content, expected.written);
  },
  'throwing-delete-hook': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    class ThrowingDeleteFs extends VirtualFileSystem {
      override onDelete(): void {
        throw new Error('onDelete boom');
      }
    }

    const fs = ThrowingDeleteFs.create();
    fs.writeFileSync(input.path, input.content, 'utf8');
    assert.throws(() => {
      fs.unlinkSync(input.path);
    }, (error: unknown) => {
      assert.ok(error instanceof HookInvocationError);
      assert.equal(error.hookName, expected.hookName);
      return true;
    });

    assert.equal(fs.existsSync(input.path), expected.exists);
  },
  'throwing-read-hook': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    class ThrowingReadFs extends VirtualFileSystem {
      override onRead(): void {
        throw new Error('onRead boom');
      }
    }

    const fs = ThrowingReadFs.create();
    fs.writeFileSync(input.path, input.content, 'utf8');

    assert.throws(() => {
      fs.readFileSync(input.path, 'utf8');
    }, (error: unknown) => {
      assert.ok(error instanceof HookInvocationError);
      assert.equal(error.hookName, expected.hookName);
      return true;
    });
  },
  'throwing-rename-hook': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    class ThrowingRenameFs extends VirtualFileSystem {
      override onRename(): void {
        throw new Error('onRename boom');
      }
    }

    const fs = ThrowingRenameFs.create();
    fs.writeFileSync(input.from, input.content, 'utf8');
    assert.throws(() => {
      fs.renameSync(input.from, input.to);
    }, (error: unknown) => {
      assert.ok(error instanceof HookInvocationError);
      assert.equal(error.hookName, expected.hookName);
      return true;
    });

    assert.equal(fs.existsSync(input.from), expected.oldExists);
    assert.equal(fs.readFileSync(input.to, 'utf8'), expected.newContent);
  },
  'throwing-write-hook': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    class ThrowingWriteFs extends VirtualFileSystem {
      override onWrite(): void {
        throw new Error('onWrite boom');
      }
    }

    const fs = ThrowingWriteFs.create();
    fs.writeFileSync(input.path, input.first, 'utf8');
    assert.throws(() => {
      fs.writeFileSync(input.path, input.second, 'utf8');
    }, (error: unknown) => {
      assert.ok(error instanceof HookInvocationError);
      assert.equal(error.hookName, expected.hookName);
      return true;
    });

    assert.equal(fs.readFileSync(input.path, 'utf8') === input.second, expected.written);
  }
};

function runCase<Kind extends ScenarioKind>(scenarioCase: ScenarioCaseOf<Kind>): Promise<void> | void {
  return scenarioHandlers[scenarioCase.kind](scenarioCase);
}

const scenarios = scenarioGroups.cases as ScenarioCase[];

void describe('VirtualFileSystem subclasses', () => {
  for (const scenario of scenarios) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
