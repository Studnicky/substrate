import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { EffectInterpreter } from '../../src/EffectInterpreter.js';
import { MachineRegistry } from '../../src/MachineRegistry.js';
import { StateMachine } from '../../src/StateMachine.js';
import type { FsmStepInterface } from '../../src/interfaces/FsmStepInterface.js';
import scenarioGroups from './MachineRegistryHooks.scenarios.json' with { type: 'json' };

type SimpleState = { readonly variant: 'idle' };
type SimpleEvent = { readonly type: 'noop' };

type ScenarioCase =
  | {
      description: string;
      expected: {
        hookErrorCount: 0;
        registerCalls: string[];
      };
      input: {
        id: string;
      };
      shape: 'on-register';
      name: string;
    }
  | {
      description: string;
      expected: {
        hookErrorCount: 0;
        registerCalls: string[];
      };
      input: {
        duplicateId: string;
        id: string;
      };
      shape: 'duplicate-no-register-hook';
      name: string;
    }
  | {
      description: string;
      expected: {
        hookErrorCount: 0;
        unregisterCalls: string[];
      };
      input: {
        id: string;
      };
      shape: 'on-unregister';
      name: string;
    }
  | {
      description: string;
      expected: {
        hookErrorCount: 0;
        unregisterCalls: string[];
      };
      input: {
        missingId: string;
      };
      shape: 'on-unregister-missing';
      name: string;
    }
  | {
      description: string;
      expected: {
        hookErrorCount: 0;
        missCalls: string[];
      };
      input: {
        missingId: string;
      };
      shape: 'on-resolve-miss';
      name: string;
    }
  | {
      description: string;
      expected: {
        hookErrorCount: 0;
        missCalls: string[];
      };
      input: {
        id: string;
      };
      shape: 'on-resolve-hit-no-hook';
      name: string;
    }
  | {
      description: string;
      expected: {
        hookErrorCount: 0;
        order: string[];
      };
      input: {
        id: string;
        missingId: string;
      };
      shape: 'hook-order';
      name: string;
    }
  | {
      description: string;
      expected: {
        hookErrorCount: 1;
        valuePreserved: true;
      };
      input: {
        id: string;
      };
      shape: 'throwing-on-register';
      name: string;
    }
  | {
      description: string;
      expected: {
        hookErrorCount: 1;
        valueUndefined: true;
      };
      input: {
        missingId: string;
      };
      shape: 'throwing-on-resolve-miss';
      name: string;
    }
  | {
      description: string;
      expected: {
        hookErrorCount: 1;
        removed: true;
      };
      input: {
        id: string;
      };
      shape: 'throwing-on-unregister';
      name: string;
    }
  | {
      description: string;
      expected: {
        hookErrorCount: 1;
        rejectionEvents: 0;
        valuePreserved: true;
      };
      input: {
        id: string;
      };
      shape: 'async-rejecting-register';
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

class ObservedRegistry extends MachineRegistry<SimpleState, SimpleEvent> {
  static make(): ObservedRegistry {
    return new ObservedRegistry();
  }

  readonly registerCalls: string[] = [];
  readonly unregisterCalls: string[] = [];
  readonly missCalls: string[] = [];

  protected override onRegister(id: string): void {
    this.registerCalls.push(id);
  }

  protected override onUnregister(id: string): void {
    this.unregisterCalls.push(id);
  }

  protected override onResolveMiss(id: string): void {
    this.missCalls.push(id);
  }
}

function makeInterpreter(): EffectInterpreter<SimpleState, SimpleEvent> {
  return EffectInterpreter.create({ machine: SimpleMachine.create() });
}

type ScenarioShape = ScenarioCase['shape'];

type ScenarioRunner<K extends ScenarioShape> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void> | void;

type RunnerMap = { [K in ScenarioShape]: ScenarioRunner<K> };

const runnerMap: RunnerMap = {
  'async-rejecting-register': async (scenarioCase) => {
    class AsyncRejectingRegisterRegistry extends MachineRegistry<SimpleState, SimpleEvent> {
      static make(): AsyncRejectingRegisterRegistry {
        return new AsyncRejectingRegisterRegistry();
      }

      protected override async onRegister(_id: string): Promise<void> {
        await Promise.resolve();
        throw new Error('async onRegister boom');
      }
    }

    let rejectionEventCount = 0;
    const onUnhandledRejection = (): void => { rejectionEventCount += 1; };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const registry = AsyncRejectingRegisterRegistry.make();
      const interpreter = makeInterpreter();
      registry.register(scenarioCase.input.id, interpreter);
      assert.equal(registry.get(scenarioCase.input.id), interpreter);
      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionEventCount, scenarioCase.expected.rejectionEvents);
      assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
      assert.equal(scenarioCase.expected.valuePreserved, true);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },
  'duplicate-no-register-hook': (scenarioCase) => {
    const registry = ObservedRegistry.make();
    registry.register(scenarioCase.input.id, makeInterpreter());
    registry.registerCalls.length = 0;
    assert.throws(() => registry.register(scenarioCase.input.duplicateId, makeInterpreter()));
    assert.deepEqual(registry.registerCalls, scenarioCase.expected.registerCalls);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  },
  'hook-order': (scenarioCase) => {
    const order: string[] = [];

    class OrderedRegistry extends MachineRegistry<SimpleState, SimpleEvent> {
      static make(): OrderedRegistry {
        return new OrderedRegistry();
      }

      protected override onRegister(_id: string): void { order.push('register'); }
      protected override onUnregister(_id: string): void { order.push('unregister'); }
      protected override onResolveMiss(_id: string): void { order.push('miss'); }
    }

    const registry = OrderedRegistry.make();
    registry.register(scenarioCase.input.id, makeInterpreter());
    registry.get(scenarioCase.input.missingId);
    registry.unregister(scenarioCase.input.id);
    assert.deepEqual(order, scenarioCase.expected.order);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  },
  'on-register': (scenarioCase) => {
    const registry = ObservedRegistry.make();
    registry.register(scenarioCase.input.id, makeInterpreter());
    assert.deepEqual(registry.registerCalls, scenarioCase.expected.registerCalls);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  },
  'on-resolve-hit-no-hook': (scenarioCase) => {
    const registry = ObservedRegistry.make();
    registry.register(scenarioCase.input.id, makeInterpreter());
    registry.missCalls.length = 0;
    const result = registry.get(scenarioCase.input.id);
    assert.ok(result !== undefined);
    assert.deepEqual(registry.missCalls, scenarioCase.expected.missCalls);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  },
  'on-resolve-miss': (scenarioCase) => {
    const registry = ObservedRegistry.make();
    const result = registry.get(scenarioCase.input.missingId);
    assert.equal(result, undefined);
    assert.deepEqual(registry.missCalls, scenarioCase.expected.missCalls);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  },
  'on-unregister': (scenarioCase) => {
    const registry = ObservedRegistry.make();
    registry.register(scenarioCase.input.id, makeInterpreter());
    registry.registerCalls.length = 0;
    registry.unregister(scenarioCase.input.id);
    assert.deepEqual(registry.unregisterCalls, scenarioCase.expected.unregisterCalls);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  },
  'on-unregister-missing': (scenarioCase) => {
    const registry = ObservedRegistry.make();
    registry.unregister(scenarioCase.input.missingId);
    assert.deepEqual(registry.unregisterCalls, scenarioCase.expected.unregisterCalls);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  },
  'throwing-on-register': (scenarioCase) => {
    class ThrowingRegisterRegistry extends MachineRegistry<SimpleState, SimpleEvent> {
      static make(): ThrowingRegisterRegistry {
        return new ThrowingRegisterRegistry();
      }

      protected override onRegister(): void {
        throw new Error('register hook boom');
      }
    }

    const registry = ThrowingRegisterRegistry.make();
    const interpreter = makeInterpreter();
    assert.doesNotThrow(() => {
      registry.register(scenarioCase.input.id, interpreter);
    });
    assert.equal(registry.get(scenarioCase.input.id), interpreter);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
    assert.equal(scenarioCase.expected.valuePreserved, true);
  },
  'throwing-on-resolve-miss': (scenarioCase) => {
    class ThrowingMissRegistry extends MachineRegistry<SimpleState, SimpleEvent> {
      static make(): ThrowingMissRegistry {
        return new ThrowingMissRegistry();
      }

      protected override onResolveMiss(): void {
        throw new Error('miss hook boom');
      }
    }

    const registry = ThrowingMissRegistry.make();
    assert.doesNotThrow(() => {
      assert.equal(registry.get(scenarioCase.input.missingId), undefined);
    });
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
    assert.equal(scenarioCase.expected.valueUndefined, true);
  },
  'throwing-on-unregister': (scenarioCase) => {
    class ThrowingUnregisterRegistry extends MachineRegistry<SimpleState, SimpleEvent> {
      static make(): ThrowingUnregisterRegistry {
        return new ThrowingUnregisterRegistry();
      }

      protected override onUnregister(): void {
        throw new Error('unregister hook boom');
      }
    }

    const registry = ThrowingUnregisterRegistry.make();
    registry.register(scenarioCase.input.id, makeInterpreter());
    assert.doesNotThrow(() => {
      registry.unregister(scenarioCase.input.id);
    });
    assert.equal(registry.has(scenarioCase.input.id), false);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
    assert.equal(scenarioCase.expected.removed, true);
  }
};

async function runCase<K extends ScenarioShape>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('MachineRegistry lifecycle hooks', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
