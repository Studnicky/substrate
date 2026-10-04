import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite, TestWorkspace } from '../../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import {
  FileLockInspection,
  FileLockRecovery,
  FileLockRecoveryConflictError,
  NodeOwnerLiveness
} from '../../../../src/file-lock/node/index.js';
import { FileLockMaintenanceScenarioCaseEntity } from './entities/FileLockMaintenanceScenarioCaseEntity.js';
import scenarioGroups from './FileLockMaintenance.scenarios.json' with { 'type': 'json' };

class FileLockMaintenanceRunners {
  static 'conflict-and-liveness'(
    scenarioCase: ScenarioCaseOfType<
      FileLockMaintenanceScenarioCaseEntity.Type,
      'conflict-and-liveness'
    >
  ): void {
    using workspace = TestWorkspace.create('file-lock-maintenance-tests-');
    const path = workspace.resolve(scenarioCase.input.path);
    workspace.write(scenarioCase.input.path, scenarioCase.input.content);
    workspace.write(
      `${scenarioCase.input.path}.lock.${scenarioCase.input.ownerToken}`,
      scenarioCase.input.content
    );
    const inspection = FileLockInspection.inspect({ 'path': path }).at(0);
    assert.ok(inspection !== undefined);
    assert.throws(() => {
      FileLockRecovery.restore({ 'inspection': inspection });
    }, FileLockRecoveryConflictError);
    const liveness = new NodeOwnerLiveness();
    assert.equal(liveness.isAlive(`${String(process.pid)}`), scenarioCase.expected.processIsAlive);
    assert.equal(liveness.isAlive('not-a-process-id'), scenarioCase.expected.invalidOwnerIsAlive);
  }

  static inspect(
    scenarioCase: ScenarioCaseOfType<FileLockMaintenanceScenarioCaseEntity.Type, 'inspect'>
  ): void {
    using workspace = TestWorkspace.create('file-lock-maintenance-tests-');
    const path = workspace.resolve(scenarioCase.input.path);
    const ownerTokens = scenarioCase.input.ownerTokens;
    for (let index = 0; index < ownerTokens.length; index += 1) {
      const ownerToken = String(ownerTokens[index]);
      workspace.write(`${scenarioCase.input.path}.lock.${ownerToken}`, ownerToken);
    }
    const inspections = FileLockInspection.inspect({ 'path': path });
    const lockPaths: string[] = [];
    for (let index = 0; index < inspections.length; index += 1) {
      const inspection = inspections[index];
      assert.ok(inspection !== undefined);
      lockPaths.push(inspection.lockPath.slice(workspace.root.length + 1));
    }
    assert.deepEqual(lockPaths, scenarioCase.expected.lockPaths);
  }

  static restore(
    scenarioCase: ScenarioCaseOfType<FileLockMaintenanceScenarioCaseEntity.Type, 'restore'>
  ): void {
    using workspace = TestWorkspace.create('file-lock-maintenance-tests-');
    const path = workspace.resolve(scenarioCase.input.path);
    const lockName = `${scenarioCase.input.path}.lock.${scenarioCase.input.ownerToken}`;
    workspace.write(scenarioCase.input.path, scenarioCase.input.content);
    workspace.rename(scenarioCase.input.path, lockName);
    const inspection = FileLockInspection.inspect({ 'path': path }).at(0);
    assert.ok(inspection !== undefined);
    FileLockRecovery.restore({ 'inspection': inspection });
    assert.equal(workspace.exists(scenarioCase.input.path), true);
    assert.equal(workspace.read(scenarioCase.input.path), scenarioCase.expected.content);
  }
}

ScenarioSuite.register({
  'entity': FileLockMaintenanceScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'FileLock maintenance primitives',
  'runners': FileLockMaintenanceRunners
});
