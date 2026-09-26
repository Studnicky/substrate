import { RuntimeError, HookInvocationError } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { VirtualFileSystem } from "../../../src/virtual-fs/VirtualFileSystem.js";
import { VirtualFileSystemSubclassScenarioCaseEntity } from "./entities/VirtualFileSystemSubclassScenarioCaseEntity.js";
import scenarioGroups from "./VirtualFileSystem.subclass.scenarios.json" with { type: "json" };

type ScenarioCase = VirtualFileSystemSubclassScenarioCaseEntity.Type;

type ScenarioCaseOf<Shape extends ScenarioShape> = Extract<
  ScenarioCase,
  { shape: Shape }
>;

type ScenarioHandler<Shape extends ScenarioShape> = (
  scenarioCase: ScenarioCaseOf<Shape>,
) => Promise<void> | void;

type ScenarioHandlers = {
  [Shape in ScenarioShape]: ScenarioHandler<Shape>;
};

type ScenarioShape = ScenarioCase["shape"];

const fileIntake = ScenarioFileCompiler.compileIntake(
  VirtualFileSystemSubclassScenarioCaseEntity.Schema,
  VirtualFileSystemSubclassScenarioCaseEntity.Node,
);

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
  readonly renameLog: Array<{ from: string; to: string }> = [];
  override onRename(oldPath: string, newPath: string): void {
    this.renameLog.push({ from: oldPath, to: newPath });
  }
}

class FullTraceFs extends VirtualFileSystem {
  readonly createLog: string[] = [];
  readonly deleteLog: string[] = [];
  readonly readLog: string[] = [];
  readonly renameLog: Array<{ from: string; to: string }> = [];
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
    this.renameLog.push({ from: oldPath, to: newPath });
  }
  override onWrite(path: string): void {
    this.writeLog.push(path);
  }
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
  "async-create-hook": async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    class AsyncRejectingCreateFs extends VirtualFileSystem {
      override onCreate(_path: string): Promise<void> {
        return Promise.reject(RuntimeError.create("async onCreate boom"));
      }
    }

    const fs = AsyncRejectingCreateFs.create();
    let unhandledRejectionCount = 0;
    const onUnhandledRejection = (): void => {
      unhandledRejectionCount += 1;
    };
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      fs.writeFileSync(input.path, input.content, "utf8");
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      assert.equal(unhandledRejectionCount, expected.rejections.length);
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }

    assert.equal(fs.readFileSync(input.path, "utf8"), expected.content);
  },
  "full-trace": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createFullTraceFs();
    fs.writeFileSync(input.path, input.contentA, "utf8");
    fs.writeFileSync(input.path, input.contentB, "utf8");
    fs.readFileSync(input.path, "utf8");
    fs.renameSync(input.path, input.renamed);
    fs.unlinkSync(input.renamed);

    assert.deepStrictEqual(fs.createLog, expected.createLog);
    assert.deepStrictEqual(fs.writeLog, expected.writeLog);
    assert.deepStrictEqual(fs.readLog, expected.readLog);
    assert.strictEqual(fs.renameLog.length, expected.renameCount);
    assert.deepStrictEqual(fs.deleteLog, expected.deleteLog);
  },
  "hook-cause-chains": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const original = RuntimeError.create("original boom");
    class ThrowingCreateFs extends VirtualFileSystem {
      override onCreate(): void {
        throw original;
      }
    }

    const fs = ThrowingCreateFs.create();
    assert.throws(
      () => {
        fs.writeFileSync(input.path, input.content, "utf8");
      },
      (error) => {
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.cause === original, expected.causeMatches);
        return true;
      },
    );
  },
  "onCreate-new-files": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createCreateLogFs();
    for (const file of input.files) {
      fs.writeFileSync(file.path, file.content, "utf8");
    }
    assert.deepStrictEqual(fs.createLog, expected.createLog);
  },
  "onCreate-no-overwrite": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createCreateLogFs();
    fs.writeFileSync(input.path, input.first, "utf8");
    fs.writeFileSync(input.path, input.second, "utf8");
    assert.strictEqual(fs.createLog.length, expected.createCount);
  },
  "onCreate-recursive-mkdir": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createCreateLogFs();
    fs.mkdirSync(input.path, { recursive: true });
    for (const path of expected.createLogIncludes) {
      assert.ok(fs.createLog.includes(path));
    }
  },
  "onDelete-not-before-unlink": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createDeleteLogFs();
    fs.writeFileSync(input.path, input.content, "utf8");
    assert.strictEqual(fs.deleteLog.length, expected.deleteCount);
  },
  "onDelete-unlinkSync": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createDeleteLogFs();
    fs.writeFileSync(input.path, input.content, "utf8");
    fs.unlinkSync(input.path);
    assert.deepStrictEqual(fs.deleteLog, expected.deleteLog);
  },
  "onRead-readFileSync": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createReadLogFs();
    fs.writeFileSync(input.path, input.content, "utf8");
    fs.readFileSync(input.path, "utf8");
    assert.deepStrictEqual(fs.readLog, expected.readLog);
  },
  "onRead-readdirSync": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createReadLogFs();
    fs.readdirSync(input.path);
    for (const path of expected.readLogIncludes) {
      assert.ok(fs.readLog.includes(path));
    }
  },
  "onRename-paths": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createRenameLogFs();
    fs.writeFileSync(input.from, input.content, "utf8");
    fs.renameSync(input.from, input.to);
    assert.deepStrictEqual(fs.renameLog, expected.renameLog);
  },
  "onWrite-update-only": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = createWriteLogFs();
    fs.writeFileSync(input.path, input.first, "utf8");
    assert.strictEqual(fs.writeLog.length, 0);
    fs.writeFileSync(input.path, input.second, "utf8");
    assert.deepStrictEqual(fs.writeLog, expected.writeLog);
  },
  "subclass-create-instance": (scenarioCase) => {
    const { expected } = scenarioCase;
    const fs = createFullTraceFs();
    assert.equal(fs instanceof FullTraceFs, expected.instanceofSubclass);
    assert.equal(fs instanceof VirtualFileSystem, expected.instanceofBase);
  },
  "throwing-create-hook": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    class ThrowingCreateFs extends VirtualFileSystem {
      override onCreate(): void {
        throw RuntimeError.create("onCreate boom");
      }
    }

    const fs = ThrowingCreateFs.create();
    assert.throws(
      () => {
        fs.writeFileSync(input.path, input.content, "utf8");
      },
      (error) => {
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.hookName, expected.hookName);
        return true;
      },
    );

    assert.equal(
      fs.readFileSync(input.path, "utf8") === input.content,
      expected.written,
    );
  },
  "throwing-delete-hook": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    class ThrowingDeleteFs extends VirtualFileSystem {
      override onDelete(): void {
        throw RuntimeError.create("onDelete boom");
      }
    }

    const fs = ThrowingDeleteFs.create();
    fs.writeFileSync(input.path, input.content, "utf8");
    assert.throws(
      () => {
        fs.unlinkSync(input.path);
      },
      (error) => {
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.hookName, expected.hookName);
        return true;
      },
    );

    assert.equal(fs.existsSync(input.path), expected.exists);
  },
  "throwing-read-hook": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    class ThrowingReadFs extends VirtualFileSystem {
      override onRead(): void {
        throw RuntimeError.create("onRead boom");
      }
    }

    const fs = ThrowingReadFs.create();
    fs.writeFileSync(input.path, input.content, "utf8");

    assert.throws(
      () => {
        fs.readFileSync(input.path, "utf8");
      },
      (error) => {
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.hookName, expected.hookName);
        return true;
      },
    );
  },
  "throwing-rename-hook": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    class ThrowingRenameFs extends VirtualFileSystem {
      override onRename(): void {
        throw RuntimeError.create("onRename boom");
      }
    }

    const fs = ThrowingRenameFs.create();
    fs.writeFileSync(input.from, input.content, "utf8");
    assert.throws(
      () => {
        fs.renameSync(input.from, input.to);
      },
      (error) => {
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.hookName, expected.hookName);
        return true;
      },
    );

    assert.equal(fs.existsSync(input.from), expected.oldExists);
    assert.equal(fs.readFileSync(input.to, "utf8"), expected.newContent);
  },
  "throwing-write-hook": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    class ThrowingWriteFs extends VirtualFileSystem {
      override onWrite(): void {
        throw RuntimeError.create("onWrite boom");
      }
    }

    const fs = ThrowingWriteFs.create();
    fs.writeFileSync(input.path, input.first, "utf8");
    assert.throws(
      () => {
        fs.writeFileSync(input.path, input.second, "utf8");
      },
      (error) => {
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.hookName, expected.hookName);
        return true;
      },
    );

    assert.equal(
      fs.readFileSync(input.path, "utf8") === input.second,
      expected.written,
    );
  },
};

function runCase<Shape extends ScenarioShape>(
  scenarioCase: ScenarioCaseOf<Shape>,
): Promise<void> | void {
  return scenarioHandlers[scenarioCase.shape](scenarioCase);
}

void describe("VirtualFileSystem subclasses", () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
