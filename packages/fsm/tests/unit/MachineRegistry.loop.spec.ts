import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { EffectInterpreter } from '../../src/EffectInterpreter.js';
import { MachineAlreadyRegisteredError } from '../../src/MachineAlreadyRegisteredError.js';
import { MachineRegistry } from '../../src/MachineRegistry.js';
import { StateMachine } from '../../src/StateMachine.js';
import type { FsmStepInterface } from '../../src/interfaces/FsmStepInterface.js';
import { MachineRegistryScenarioCaseEntity } from './entities/MachineRegistryScenarioCaseEntity.js';
import scenarioGroups from './MachineRegistry.scenarios.json' with { type: 'json' };

type SimpleState = { readonly variant: 'idle' };
type SimpleEvent = { readonly type: 'noop' };

type ScenarioCase = MachineRegistryScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(MachineRegistryScenarioCaseEntity.Schema, MachineRegistryScenarioCaseEntity.Node);

class SimpleMachine extends StateMachine<SimpleState, SimpleEvent> {
  static create(): SimpleMachine {
    return new SimpleMachine();
  }

  override getInitialState(): SimpleState { return { variant: 'idle' }; }

  override reduce(state: SimpleState, _event: SimpleEvent): FsmStepInterface<SimpleState> {
    return { effects: [], state };
  }
}

class Fixture {
  static interpreter(): EffectInterpreter<SimpleState, SimpleEvent> {
    return EffectInterpreter.create(SimpleMachine.create());
  }
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => void> = {
  'duplicate-register-throws': (scenarioCase) => {
    const registry = MachineRegistry.create<SimpleState, SimpleEvent>();
    registry.register(String(scenarioCase.input.name), Fixture.interpreter());
    assert.throws(
      () => registry.register(String(scenarioCase.input.name), Fixture.interpreter()),
      MachineAlreadyRegisteredError
    );
  },
  'has-check': (scenarioCase) => {
    const registry = MachineRegistry.create<SimpleState, SimpleEvent>();
    if (scenarioCase.input.registered) {
      registry.register(String(scenarioCase.input.name), Fixture.interpreter());
    }
    assert.equal(registry.has(String(scenarioCase.input.name)), scenarioCase.expected.exists);
  },
  'instances-isolated': (scenarioCase) => {
    const registry = MachineRegistry.create<SimpleState, SimpleEvent>();
    const other = MachineRegistry.create<SimpleState, SimpleEvent>();
    registry.register(String(scenarioCase.input.name), Fixture.interpreter());
    assert.equal(registry.has(String(scenarioCase.input.name)), true);
    assert.equal(other.has(String(scenarioCase.input.name)), false);
    assert.deepEqual(other.list(), []);
    assert.equal(scenarioCase.expected.isolated, true);
  },
  'list-returns-all-registered': (scenarioCase) => {
    const registry = MachineRegistry.create<SimpleState, SimpleEvent>();
    for (const name of scenarioCase.input.names ?? []) {
      registry.register(name, Fixture.interpreter());
    }
    assert.deepEqual(registry.list(), scenarioCase.expected.names);
  },
  'register-get-roundtrip': (scenarioCase) => {
    const registry = MachineRegistry.create<SimpleState, SimpleEvent>();
    const interp = Fixture.interpreter();
    registry.register(String(scenarioCase.input.name), interp);
    assert.equal(registry.get(String(scenarioCase.input.name)), interp);
    assert.equal(scenarioCase.expected.sameInterpreter, true);
  },
  'unregister-removes-entry': (scenarioCase) => {
    const registry = MachineRegistry.create<SimpleState, SimpleEvent>();
    registry.register(String(scenarioCase.input.name), Fixture.interpreter());
    registry.unregister(String(scenarioCase.input.name));
    assert.equal(registry.get(String(scenarioCase.input.name)), undefined);
    assert.equal(scenarioCase.expected.removed, true);
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('MachineRegistry', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
