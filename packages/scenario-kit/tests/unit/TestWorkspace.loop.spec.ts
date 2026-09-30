import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute } from 'node:path';
import { it } from 'node:test';

import type { ScenarioCaseOfType } from '../../src/types/ScenarioCaseOfType.js';

import { TestWorkspaceError } from '../../src/errors/TestWorkspaceError.js';
import { ScenarioSuite } from '../../src/ScenarioSuite.js';
import { ScenarioValues } from '../../src/ScenarioValues.js';
import { TestWorkspace } from '../../src/TestWorkspace.js';
import { TestWorkspaceScenarioCaseEntity } from './entities/TestWorkspaceScenarioCaseEntity.js';
import scenarioGroups from './TestWorkspace.scenarios.json' with { 'type': 'json' };

class TestWorkspaceRunners {
  static 'write-then-read'(scenarioCase: ScenarioCaseOfType<TestWorkspaceScenarioCaseEntity.Type, 'write-then-read'>): void {
    using workspace = TestWorkspace.create('scenario-kit-');
    const written = workspace.write(scenarioCase.input.path, ScenarioValues.requireDefined(scenarioCase.input.content, 'input.content'));
    assert.equal(written, workspace.resolve(scenarioCase.input.path));
    assert.equal(workspace.read(scenarioCase.input.path), scenarioCase.expected.detail);
  }

  static 'mkdir-then-list'(scenarioCase: ScenarioCaseOfType<TestWorkspaceScenarioCaseEntity.Type, 'mkdir-then-list'>): void {
    using workspace = TestWorkspace.create('scenario-kit-');
    workspace.mkdir(scenarioCase.input.path);
    workspace.write(`${scenarioCase.input.path}/f.txt`, ScenarioValues.requireDefined(scenarioCase.input.content, 'input.content'));
    assert.deepStrictEqual(workspace.list(scenarioCase.input.path), scenarioCase.expected.detail);
  }

  static 'rename-moves-file'(scenarioCase: ScenarioCaseOfType<TestWorkspaceScenarioCaseEntity.Type, 'rename-moves-file'>): void {
    using workspace = TestWorkspace.create('scenario-kit-');
    const target = ScenarioValues.requireDefined(scenarioCase.input.to, 'input.to');
    workspace.write(scenarioCase.input.path, ScenarioValues.requireDefined(scenarioCase.input.content, 'input.content'));
    workspace.rename(scenarioCase.input.path, target);
    assert.equal(workspace.exists(scenarioCase.input.path), false);
    assert.equal(workspace.read(target), scenarioCase.expected.detail);
  }

  static 'remove-deletes-tree'(scenarioCase: ScenarioCaseOfType<TestWorkspaceScenarioCaseEntity.Type, 'remove-deletes-tree'>): void {
    using workspace = TestWorkspace.create('scenario-kit-');
    workspace.mkdir('tree');
    workspace.write(scenarioCase.input.path, ScenarioValues.requireDefined(scenarioCase.input.content, 'input.content'));
    workspace.remove('tree');
    workspace.remove('tree');
    assert.equal(workspace.exists('tree'), scenarioCase.expected.detail);
  }

  static 'create-rejects'(scenarioCase: ScenarioCaseOfType<TestWorkspaceScenarioCaseEntity.Type, 'create-rejects'>): void {
    TestWorkspaceRunners.assertFailure(ScenarioValues.requireString(scenarioCase.expected.detail, 'expected.detail'), () => {
      TestWorkspace.create(scenarioCase.input.path);
    });
  }

  static 'read-rejects'(scenarioCase: ScenarioCaseOfType<TestWorkspaceScenarioCaseEntity.Type, 'read-rejects'>): void {
    using workspace = TestWorkspace.create('scenario-kit-');
    TestWorkspaceRunners.assertFailure(ScenarioValues.requireString(scenarioCase.expected.detail, 'expected.detail'), () => {
      workspace.read(scenarioCase.input.path);
    });
  }

  static 'write-rejects'(scenarioCase: ScenarioCaseOfType<TestWorkspaceScenarioCaseEntity.Type, 'write-rejects'>): void {
    using workspace = TestWorkspace.create('scenario-kit-');
    TestWorkspaceRunners.assertFailure(ScenarioValues.requireString(scenarioCase.expected.detail, 'expected.detail'), () => {
      workspace.write(scenarioCase.input.path, ScenarioValues.requireDefined(scenarioCase.input.content, 'input.content'));
    });
  }

  static 'list-rejects'(scenarioCase: ScenarioCaseOfType<TestWorkspaceScenarioCaseEntity.Type, 'list-rejects'>): void {
    using workspace = TestWorkspace.create('scenario-kit-');
    TestWorkspaceRunners.assertFailure(ScenarioValues.requireString(scenarioCase.expected.detail, 'expected.detail'), () => {
      workspace.list(scenarioCase.input.path);
    });
  }

  static 'rename-rejects'(scenarioCase: ScenarioCaseOfType<TestWorkspaceScenarioCaseEntity.Type, 'rename-rejects'>): void {
    using workspace = TestWorkspace.create('scenario-kit-');
    TestWorkspaceRunners.assertFailure(ScenarioValues.requireString(scenarioCase.expected.detail, 'expected.detail'), () => {
      workspace.rename(scenarioCase.input.path, ScenarioValues.requireDefined(scenarioCase.input.to, 'input.to'));
    });
  }

  static 'realpath-rejects'(scenarioCase: ScenarioCaseOfType<TestWorkspaceScenarioCaseEntity.Type, 'realpath-rejects'>): void {
    using workspace = TestWorkspace.create('scenario-kit-');
    TestWorkspaceRunners.assertFailure(ScenarioValues.requireString(scenarioCase.expected.detail, 'expected.detail'), () => {
      workspace.realpath(scenarioCase.input.path);
    });
  }

  static declaresLifecycle(): void {
    void it('removes the directory when a using scope ends', () => {
      let root = '';
      {
        using workspace = TestWorkspace.create('scenario-kit-');
        root = workspace.root;
        assert.ok(existsSync(root));
      }
      assert.equal(existsSync(root), false);
    });

    void it('creates the root under the OS temp directory and disposes idempotently', () => {
      const workspace = TestWorkspace.create('scenario-kit-');
      assert.ok(workspace.root.startsWith(tmpdir()));
      workspace.dispose();
      workspace.dispose();
      assert.equal(existsSync(workspace.root), false);
    });

    void it('resolves a relative path inside the root and keeps an absolute path as given', () => {
      using workspace = TestWorkspace.create('scenario-kit-');
      assert.ok(isAbsolute(workspace.resolve('a', 'b.txt')));
      assert.ok(workspace.resolve('a', 'b.txt').startsWith(workspace.root));
      assert.equal(workspace.resolve('/elsewhere/file.txt'), '/elsewhere/file.txt');
    });
  }

  private static assertFailure(operation: string, action: () => void): void {
    assert.throws(action, (error: Error) => {
      assert.ok(error instanceof TestWorkspaceError);
      assert.equal(error.code, 'scenarioKit.workspaceFailed');
      assert.ok(error.message.startsWith(`TestWorkspace ${operation} failed for`), error.message);
      assert.ok(error.cause instanceof Error);
      return true;
    });
  }
}

ScenarioSuite.register({
  'entity': TestWorkspaceScenarioCaseEntity,
  'extraTests': TestWorkspaceRunners.declaresLifecycle,
  'file': scenarioGroups,
  'name': 'TestWorkspace',
  'runners': TestWorkspaceRunners
});
