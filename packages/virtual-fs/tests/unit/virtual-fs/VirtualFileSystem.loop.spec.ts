import { ScenarioFileCompiler } from "@studnicky/scenario-kit/node";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { VirtualFileSystem } from "../../../src/virtual-fs/VirtualFileSystem.js";
import { VirtualFileSystemScenarioCaseEntity } from "./entities/VirtualFileSystemScenarioCaseEntity.js";
import scenarioGroups from "./VirtualFileSystem.scenarios.json" with { type: "json" };

type ScenarioCase = VirtualFileSystemScenarioCaseEntity.Type;

type ScenarioCaseOf<Shape extends ScenarioShape> = Extract<
  ScenarioCase,
  { shape: Shape }
>;

type ScenarioHandler<Shape extends ScenarioShape> = (
  scenarioCase: ScenarioCaseOf<Shape>,
) => void;

type ScenarioHandlers = {
  [Shape in ScenarioShape]: ScenarioHandler<Shape>;
};

type ScenarioShape = ScenarioCase["shape"];

type SeedInput = ScenarioCaseOf<"create-seed-populates">["input"]["seed"];

const fileIntake = ScenarioFileCompiler.compileIntake(VirtualFileSystemScenarioCaseEntity.Schema, VirtualFileSystemScenarioCaseEntity.Node);

let clockMs = 1000;
const mockClock = {
  hrtime: () => {
    return BigInt(clockMs) * 1_000_000n;
  },
  now: () => {
    return clockMs;
  },
};

function advanceClock(ms: number): void {
  clockMs += ms;
}

function resetClock(): void {
  clockMs = 1000;
}

function createSeedMap(seed: SeedInput): Map<string, string> {
  return new Map(
    seed.map((item): [string, string] => [item.path, item.content]),
  );
}

function assertThrowsCode(operation: () => void, errorCode: string): void {
  assert.throws(operation, (err) => {
    return err instanceof Error && err.message.includes(errorCode);
  });
}

function assertIncluded(entries: string[], expectedEntries: string[]): void {
  for (const entry of expectedEntries) {
    assert.strictEqual(entries.includes(entry), true);
  }
}

function assertExcluded(entries: string[], expectedEntries: string[]): void {
  for (const entry of expectedEntries) {
    assert.strictEqual(entries.includes(entry), false);
  }
}

const scenarioHandlers: ScenarioHandlers = {
  "create-clock-deterministic": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    resetClock();
    clockMs = input.clockMs;
    const fs = VirtualFileSystem.create({ clock: mockClock });
    fs.writeFileSync(input.path, input.content, input.encoding);
    const stat = fs.statSync(input.path);
    assert.strictEqual(stat.mtimeMs, expected.mtimeMs);
  },
  "create-seed-empty": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create({ seed: createSeedMap(input.seed) });
    assert.strictEqual(fs.existsSync(expected.rootPath), true);
    assert.deepStrictEqual(
      fs.readdirSync(expected.rootPath),
      expected.rootEntries,
    );
  },
  "create-seed-populates": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create({
      seed: createSeedMap(input.seed),
    });
    assert.strictEqual(
      fs.readFileSync(input.readPath, "utf8"),
      expected.content,
    );
  },
  "exists-after-write": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.path, input.content, input.encoding);
    assert.strictEqual(fs.existsSync(input.path), expected.exists);
  },
  "exists-missing": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    assert.strictEqual(fs.existsSync(input.path), expected.exists);
  },
  "exists-root": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    assert.strictEqual(fs.existsSync(input.path), expected.exists);
  },
  "lifecycle-onCreate": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const log: string[] = [];
    class TracingFs extends VirtualFileSystem {
      override onCreate(path: string): void {
        log.push(`create:${path}`);
      }
    }
    const fs = TracingFs.create();
    fs.writeFileSync(input.path, input.content, input.encoding);
    assert.ok(log.includes(expected.logEntry));
  },
  "lifecycle-onDelete": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const log: string[] = [];
    class TracingFs extends VirtualFileSystem {
      override onDelete(path: string): void {
        log.push(`delete:${path}`);
      }
    }
    const fs = TracingFs.create();
    fs.writeFileSync(input.path, input.content, input.encoding);
    fs.unlinkSync(input.path);
    assert.ok(log.includes(expected.logEntry));
  },
  "lifecycle-onRead": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const log: string[] = [];
    class TracingFs extends VirtualFileSystem {
      override onRead(path: string): void {
        log.push(`read:${path}`);
      }
    }
    const fs = TracingFs.create();
    fs.writeFileSync(input.path, input.content, input.encoding);
    fs.readFileSync(input.path, input.encoding);
    assert.ok(log.includes(expected.logEntry));
  },
  "lifecycle-onRename": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const log: Array<{ newPath: string; oldPath: string }> = [];
    class TracingFs extends VirtualFileSystem {
      override onRename(oldPath: string, newPath: string): void {
        log.push({ oldPath, newPath });
      }
    }
    const fs = TracingFs.create();
    fs.writeFileSync(input.from, input.content, input.encoding);
    fs.renameSync(input.from, input.to);
    assert.strictEqual(log.length, 1);
    assert.deepStrictEqual(log[0], expected.logEntry);
  },
  "lifecycle-onWrite": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const log: string[] = [];
    class TracingFs extends VirtualFileSystem {
      override onWrite(path: string): void {
        log.push(`write:${path}`);
      }
    }
    const fs = TracingFs.create();
    fs.writeFileSync(input.path, input.firstContent, input.encoding);
    fs.writeFileSync(input.path, input.secondContent, input.encoding);
    assert.ok(log.includes(expected.logEntry));
  },
  "mkdir-existing-dir-no-throw": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.path, { recursive: input.recursive });
    assert.doesNotThrow(() => {
      fs.mkdirSync(input.path, { recursive: input.recursive });
    });
    assert.strictEqual(false, expected.didThrow);
  },
  "mkdir-existing-dir-throws": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.path, { recursive: input.existingRecursive });
    assertThrowsCode(() => {
      fs.mkdirSync(input.path);
    }, expected.errorCode);
  },
  "mkdir-file-path-throws": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.path, input.content, input.encoding);
    assertThrowsCode(() => {
      fs.mkdirSync(input.path);
    }, expected.errorCode);
    assert.strictEqual(fs.statSync(input.path).isDirectory(), false);
    assert.strictEqual(
      fs.readFileSync(input.path, input.encoding),
      expected.fileContent,
    );
    assert.strictEqual(fs.existsSync(input.path), expected.fileStillExists);
  },
  "mkdir-recursive-creates": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.path, { recursive: input.recursive });
    for (const path of expected.exists) {
      assert.strictEqual(fs.existsSync(path), true);
    }
  },
  "mkdir-recursive-intermediate-file-throws": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.intermediateFilePath, input.content, input.encoding);
    assertThrowsCode(() => {
      fs.mkdirSync(input.path, { recursive: true });
    }, expected.errorCode);
  },
  "read-missing-throws": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    assertThrowsCode(() => {
      fs.readFileSync(input.path, input.encoding);
    }, expected.errorCode);
  },
  "readdir-missing-throws": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    assertThrowsCode(() => {
      fs.readdirSync(input.path);
    }, expected.errorCode);
  },
  "readdir-mixed-operations": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    for (const file of input.rootFiles) {
      fs.writeFileSync(file.path, file.content, "utf8");
    }
    fs.mkdirSync(input.childDirectory, { recursive: true });
    fs.writeFileSync(input.leafPath, input.leafContent, "utf8");
    fs.unlinkSync(input.removedPath);
    fs.renameSync(input.directory, input.renamedDirectory);
    fs.writeFileSync(input.extraPath, input.extraContent, "utf8");
    assert.deepStrictEqual(
      new Set(fs.readdirSync("/")),
      new Set(expected.rootEntries),
    );
    assert.deepStrictEqual(
      new Set(fs.readdirSync(input.renamedDirectory)),
      new Set(expected.dirBEntries),
    );
    const renamedChildDirectory = input.childDirectory.replace(
      input.directory,
      input.renamedDirectory,
    );
    assert.deepStrictEqual(
      new Set(fs.readdirSync(renamedChildDirectory)),
      new Set(expected.childEntries),
    );
  },
  "readdir-no-nested": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.directory, { recursive: true });
    fs.writeFileSync(input.filePath, input.content, "utf8");
    const entries = fs.readdirSync("/");
    assertIncluded(entries, expected.includedEntries);
    assertExcluded(entries, expected.excludedEntries);
  },
  "readdir-reflects-dir-rename": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    for (const directory of input.directories) {
      fs.mkdirSync(directory, { recursive: true });
    }
    for (const file of input.files) {
      fs.writeFileSync(file.path, file.content, "utf8");
    }
    fs.renameSync(input.from, input.to);
    assert.throws(() => {
      fs.readdirSync(input.missingAfterRename);
    });
    assert.deepStrictEqual(
      new Set(fs.readdirSync("/")),
      new Set(expected.rootEntries),
    );
    assert.deepStrictEqual(
      new Set(fs.readdirSync(input.to)),
      new Set(expected.movedEntries),
    );
    assert.deepStrictEqual(
      new Set(fs.readdirSync(input.movedSubDirectory)),
      new Set(expected.movedSubEntries),
    );
  },
  "readdir-reflects-file-rename": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.directory, { recursive: true });
    fs.writeFileSync(input.from, input.content, "utf8");
    fs.renameSync(input.from, input.to);
    const dirEntries = fs.readdirSync(input.directory);
    assertIncluded(dirEntries, expected.includedEntries);
    assertExcluded(dirEntries, expected.excludedEntries);
  },
  "readdir-reflects-unlink": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.removed, input.removedContent, "utf8");
    fs.writeFileSync(input.keep, input.keepContent, "utf8");
    fs.unlinkSync(input.removed);
    const entries = fs.readdirSync("/");
    assertIncluded(entries, expected.includedEntries);
    assertExcluded(entries, expected.excludedEntries);
  },
  "readdir-root": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    for (const file of input.files) {
      fs.writeFileSync(file.path, file.content, "utf8");
    }
    const entries = fs.readdirSync("/");
    assert.deepStrictEqual(new Set(entries), new Set(expected.entries));
  },
  "readdir-scale-scope": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    for (let i = 0; i < input.unrelatedCount; i += 1) {
      fs.writeFileSync(`/unrelated-${i}.txt`, "noise", "utf8");
    }
    fs.mkdirSync(input.target, { recursive: true });
    fs.writeFileSync(input.targetFile, "value", "utf8");
    for (let i = 0; i < input.unrelatedCount; i += 1) {
      fs.mkdirSync(`/other-${i}/nested`, { recursive: true });
    }
    assert.deepStrictEqual(fs.readdirSync(input.target), expected.entries);
  },
  "rename-directory": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.path, { recursive: true });
    fs.renameSync(input.path, input.renamedPath);
    assert.strictEqual(fs.existsSync(input.path), expected.sourceExists);
    assert.strictEqual(fs.existsSync(input.renamedPath), expected.targetExists);
    assert.strictEqual(
      fs.statSync(input.renamedPath).isDirectory(),
      expected.targetIsDirectory,
    );
  },
  "rename-directory-subtree": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.childPath, { recursive: true });
    fs.writeFileSync(input.filePath, input.fileContent, "utf8");
    fs.writeFileSync(input.nestedPath, input.nestedContent, "utf8");
    fs.renameSync(input.sourcePath, input.targetPath);
    assert.strictEqual(fs.existsSync(input.sourcePath), expected.sourceExists);
    assert.strictEqual(
      fs.readFileSync(input.movedFilePath, "utf8"),
      expected.movedFileContent,
    );
    assert.strictEqual(
      fs.readFileSync(input.movedNestedPath, "utf8"),
      expected.movedNestedContent,
    );
  },
  "rename-file-moves-content": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.from, input.content, input.encoding);
    fs.renameSync(input.from, input.to);
    assert.strictEqual(
      fs.readFileSync(input.to, input.encoding),
      expected.content,
    );
    assert.strictEqual(fs.existsSync(input.from), expected.sourceExists);
    assert.strictEqual(fs.existsSync(input.to), expected.targetExists);
  },
  "rename-missing-throws": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    assertThrowsCode(() => {
      fs.renameSync(input.from, input.to);
    }, expected.errorCode);
  },
  "stat-dir-shape": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.path);
    const stat = fs.statSync(input.path);
    assert.strictEqual(stat.isDirectory(), expected.isDirectory);
    assert.strictEqual(stat.isFile(), expected.isFile);
  },
  "stat-file-shape": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.path, input.content, input.encoding);
    const stat = fs.statSync(input.path);
    assert.strictEqual(stat.isFile(), expected.isFile);
    assert.strictEqual(stat.isDirectory(), expected.isDirectory);
  },
  "stat-missing-throws": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    assertThrowsCode(() => {
      fs.statSync(input.path);
    }, expected.errorCode);
  },
  "stat-mtime-clock": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    resetClock();
    clockMs = input.initialClockMs;
    const fs = VirtualFileSystem.create({ clock: mockClock });
    advanceClock(input.advanceMs);
    fs.writeFileSync(input.path, input.content, input.encoding);
    const stat = fs.statSync(input.path);
    assert.strictEqual(stat.mtimeMs, expected.mtimeMs);
  },
  "unlink-directory-throws": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.mkdirSync(input.path, { recursive: true });
    assertThrowsCode(() => {
      fs.unlinkSync(input.path);
    }, expected.errorCode);
  },
  "unlink-missing-throws": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    assertThrowsCode(() => {
      fs.unlinkSync(input.path);
    }, expected.errorCode);
  },
  "unlink-removes": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.path, input.content, input.encoding);
    fs.unlinkSync(input.path);
    assert.strictEqual(fs.existsSync(input.path), expected.exists);
  },
  "write-overwrite": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.path, input.firstContent, input.encoding);
    fs.writeFileSync(input.path, input.secondContent, input.encoding);
    assert.strictEqual(
      fs.readFileSync(input.path, input.encoding),
      expected.content,
    );
  },
  "write-roundtrip": (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const fs = VirtualFileSystem.create();
    fs.writeFileSync(input.path, input.content, input.encoding);
    assert.strictEqual(
      fs.readFileSync(input.path, input.encoding),
      expected.content,
    );
  },
};

function runCase<Shape extends ScenarioShape>(
  scenarioCase: ScenarioCaseOf<Shape>,
): void {
  scenarioHandlers[scenarioCase.shape](scenarioCase);
}

void describe("VirtualFileSystem", () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
