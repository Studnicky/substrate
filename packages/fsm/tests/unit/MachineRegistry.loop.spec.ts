import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { FsmStepInterface } from '../../src/interfaces/FsmStepInterface.js';
import type { MachineIdleStateEntity } from './entities/MachineIdleStateEntity.js';
import type { MachineNoopEventEntity } from './entities/MachineNoopEventEntity.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { EffectInterpreter } from '../../src/EffectInterpreter.js';
import { MachineAlreadyRegisteredError } from '../../src/MachineAlreadyRegisteredError.js';
import { MachineRegistry } from '../../src/MachineRegistry.js';
import { StateMachine } from '../../src/StateMachine.js';
import { MachineRegistryScenarioCaseEntity } from './entities/MachineRegistryScenarioCaseEntity.js';
import scenarioGroups from './MachineRegistry.scenarios.json' with { 'type': 'json' };

class SimpleMachine extends StateMachine<MachineIdleStateEntity.Type, MachineNoopEventEntity.Type> {
  static create(): SimpleMachine {
    return new SimpleMachine();
  }

  override getInitialState(): MachineIdleStateEntity.Type {
    return { 'variant': 'idle' };
  }

  override reduce(
    state: MachineIdleStateEntity.Type,
    _event: MachineNoopEventEntity.Type
  ): FsmStepInterface<MachineIdleStateEntity.Type> {
    return { 'effects': [], 'state': state };
  }
}

class MachineRegistryRunners {
  static 'duplicate-register-throws'(
    scenarioCase: ScenarioCaseOfType<
      MachineRegistryScenarioCaseEntity.Type,
      'duplicate-register-throws'
    >
  ): void {
    const registry = MachineRegistry.create<
      MachineIdleStateEntity.Type,
      MachineNoopEventEntity.Type
    >();
    registry.register(String(scenarioCase.input.name), MachineRegistryRunners.interpreter());
    assert.throws(() => {
      registry.register(String(scenarioCase.input.name), MachineRegistryRunners.interpreter());
    }, MachineAlreadyRegisteredError);
  }

  static 'has-check'(
    scenarioCase: ScenarioCaseOfType<MachineRegistryScenarioCaseEntity.Type, 'has-check'>
  ): void {
    const registry = MachineRegistry.create<
      MachineIdleStateEntity.Type,
      MachineNoopEventEntity.Type
    >();
    if (scenarioCase.input.registered === true) {
      registry.register(String(scenarioCase.input.name), MachineRegistryRunners.interpreter());
    }
    assert.equal(registry.has(String(scenarioCase.input.name)), scenarioCase.expected.exists);
  }

  static 'instances-isolated'(
    scenarioCase: ScenarioCaseOfType<MachineRegistryScenarioCaseEntity.Type, 'instances-isolated'>
  ): void {
    const registry = MachineRegistry.create<
      MachineIdleStateEntity.Type,
      MachineNoopEventEntity.Type
    >();
    const other = MachineRegistry.create<
      MachineIdleStateEntity.Type,
      MachineNoopEventEntity.Type
    >();
    registry.register(String(scenarioCase.input.name), MachineRegistryRunners.interpreter());
    assert.equal(registry.has(String(scenarioCase.input.name)), true);
    assert.equal(other.has(String(scenarioCase.input.name)), false);
    assert.deepEqual(other.list(), []);
    assert.equal(scenarioCase.expected.isolated, true);
  }

  static 'list-returns-all-registered'(
    scenarioCase: ScenarioCaseOfType<
      MachineRegistryScenarioCaseEntity.Type,
      'list-returns-all-registered'
    >
  ): void {
    const registry = MachineRegistry.create<
      MachineIdleStateEntity.Type,
      MachineNoopEventEntity.Type
    >();
    const names = scenarioCase.input.names ?? [];
    for (let index = 0; index < names.length; index += 1) {
      registry.register(String(names[index]), MachineRegistryRunners.interpreter());
    }
    assert.deepEqual(registry.list(), scenarioCase.expected.names);
  }

  static 'register-get-roundtrip'(
    scenarioCase: ScenarioCaseOfType<
      MachineRegistryScenarioCaseEntity.Type,
      'register-get-roundtrip'
    >
  ): void {
    const registry = MachineRegistry.create<
      MachineIdleStateEntity.Type,
      MachineNoopEventEntity.Type
    >();
    const interpreter = MachineRegistryRunners.interpreter();
    registry.register(String(scenarioCase.input.name), interpreter);
    const registered: unknown = interpreter;
    assert.equal(registry.get(String(scenarioCase.input.name)), registered);
    assert.equal(scenarioCase.expected.sameInterpreter, true);
  }

  static 'unregister-removes-entry'(
    scenarioCase: ScenarioCaseOfType<
      MachineRegistryScenarioCaseEntity.Type,
      'unregister-removes-entry'
    >
  ): void {
    const registry = MachineRegistry.create<
      MachineIdleStateEntity.Type,
      MachineNoopEventEntity.Type
    >();
    registry.register(String(scenarioCase.input.name), MachineRegistryRunners.interpreter());
    registry.unregister(String(scenarioCase.input.name));
    assert.equal(registry.get(String(scenarioCase.input.name)), undefined);
    assert.equal(scenarioCase.expected.removed, true);
  }

  private static interpreter(): EffectInterpreter<
    MachineIdleStateEntity.Type,
    MachineNoopEventEntity.Type
  > {
    const interpreter = EffectInterpreter.create(SimpleMachine.create());
    return interpreter;
  }
}

ScenarioSuite.register({
  'entity': MachineRegistryScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'MachineRegistry',
  'runners': MachineRegistryRunners
});
