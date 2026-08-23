import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { EffectInterpreter } from '../../src/EffectInterpreter.js';
import { MachineAlreadyRegisteredError } from '../../src/MachineAlreadyRegisteredError.js';
import { MachineRegistry } from '../../src/MachineRegistry.js';
import { StateMachine } from '../../src/StateMachine.js';
import type { FsmStepInterface } from '../../src/FsmStepInterface.js';
import scenarioGroups from './MachineRegistry.scenarios.json' with { type: 'json' };

type SimpleState = { readonly variant: 'idle' };
type SimpleEvent = { readonly type: 'noop' };

type ScenarioCase =
  | {
      description: string;
      expected: {
        sameInterpreter: true;
      };
      input: {
        name: string;
      };
      shape: 'register-get-roundtrip';
      name: string;
    }
  | {
      description: string;
      expected: {
        errorName: string;
      };
      input: {
        name: string;
      };
      shape: 'duplicate-register-throws';
      name: string;
    }
  | {
      description: string;
      expected: {
        removed: true;
      };
      input: {
        name: string;
      };
      shape: 'unregister-removes-entry';
      name: string;
    }
  | {
      description: string;
      expected: {
        exists: boolean;
      };
      input: {
        name: string;
        registered: boolean;
      };
      shape: 'has-check';
      name: string;
    }
  | {
      description: string;
      expected: {
        names: string[];
      };
      input: {
        names: string[];
      };
      shape: 'list-returns-all-registered';
      name: string;
    }
  | {
      description: string;
      expected: {
        isolated: true;
      };
      input: {
        name: string;
      };
      shape: 'instances-isolated';
      name: string;
    };

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
    return EffectInterpreter.create({ machine: SimpleMachine.create() });
  }
}

type ScenarioShape = ScenarioCase['shape'];

type ScenarioRunner<K extends ScenarioShape> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => void;

type RunnerMap = { [K in ScenarioShape]: ScenarioRunner<K> };

const runnerMap: RunnerMap = {
  'duplicate-register-throws': (scenarioCase) => {
    const registry = MachineRegistry.create<SimpleState, SimpleEvent>();
    registry.register(scenarioCase.input.name, Fixture.interpreter());
    assert.throws(
      () => registry.register(scenarioCase.input.name, Fixture.interpreter()),
      MachineAlreadyRegisteredError
    );
  },
  'has-check': (scenarioCase) => {
    const registry = MachineRegistry.create<SimpleState, SimpleEvent>();
    if (scenarioCase.input.registered) {
      registry.register(scenarioCase.input.name, Fixture.interpreter());
    }
    assert.equal(registry.has(scenarioCase.input.name), scenarioCase.expected.exists);
  },
  'instances-isolated': (scenarioCase) => {
    const registry = MachineRegistry.create<SimpleState, SimpleEvent>();
    const other = MachineRegistry.create<SimpleState, SimpleEvent>();
    registry.register(scenarioCase.input.name, Fixture.interpreter());
    assert.equal(registry.has(scenarioCase.input.name), true);
    assert.equal(other.has(scenarioCase.input.name), false);
    assert.deepEqual(other.list(), []);
    assert.equal(scenarioCase.expected.isolated, true);
  },
  'list-returns-all-registered': (scenarioCase) => {
    const registry = MachineRegistry.create<SimpleState, SimpleEvent>();
    for (const name of scenarioCase.input.names) {
      registry.register(name, Fixture.interpreter());
    }
    assert.deepEqual(registry.list(), scenarioCase.expected.names);
  },
  'register-get-roundtrip': (scenarioCase) => {
    const registry = MachineRegistry.create<SimpleState, SimpleEvent>();
    const interp = Fixture.interpreter();
    registry.register(scenarioCase.input.name, interp);
    assert.equal(registry.get(scenarioCase.input.name), interp);
    assert.equal(scenarioCase.expected.sameInterpreter, true);
  },
  'unregister-removes-entry': (scenarioCase) => {
    const registry = MachineRegistry.create<SimpleState, SimpleEvent>();
    registry.register(scenarioCase.input.name, Fixture.interpreter());
    registry.unregister(scenarioCase.input.name);
    assert.equal(registry.get(scenarioCase.input.name), undefined);
    assert.equal(scenarioCase.expected.removed, true);
  }
};

function runCase<K extends ScenarioShape>(scenarioCase: Extract<ScenarioCase, { shape: K }>): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('MachineRegistry', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
