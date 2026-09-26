import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { EffectInterpreter } from '../../src/EffectInterpreter.js';
import { MachineRegistry } from '../../src/MachineRegistry.js';
import { StateMachine } from '../../src/StateMachine.js';
import type { FsmStepInterface } from '../../src/interfaces/FsmStepInterface.js';
import { MachineRegistryHooksScenarioCaseEntity } from './entities/MachineRegistryHooksScenarioCaseEntity.js';
import scenarioGroups from './MachineRegistryHooks.scenarios.json' with { type: 'json' };

type SimpleState = { readonly variant: 'idle' };
type SimpleEvent = { readonly type: 'noop' };

type ScenarioCase = MachineRegistryHooksScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(MachineRegistryHooksScenarioCaseEntity.Schema, MachineRegistryHooksScenarioCaseEntity.Node);

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
  return EffectInterpreter.create(SimpleMachine.create());
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => Promise<void> | void> = {
  'async-rejecting-register': async (scenarioCase) => {
    class AsyncRejectingRegisterRegistry extends MachineRegistry<SimpleState, SimpleEvent> {
      static make(): AsyncRejectingRegisterRegistry {
        return new AsyncRejectingRegisterRegistry();
      }

      protected override async onRegister(_id: string): Promise<void> {
        await Promise.resolve();
        throw RuntimeError.create('async onRegister boom');
      }
    }

    let rejectionEventCount = 0;
    const onUnhandledRejection = (): void => { rejectionEventCount += 1; };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const registry = AsyncRejectingRegisterRegistry.make();
      const interpreter = makeInterpreter();
      registry.register(String(scenarioCase.input.id), interpreter);
      assert.equal(registry.get(String(scenarioCase.input.id)), interpreter);
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
    registry.register(String(scenarioCase.input.id), makeInterpreter());
    registry.registerCalls.length = 0;
    assert.throws(() => registry.register(String(scenarioCase.input.duplicateId), makeInterpreter()));
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
    registry.register(String(scenarioCase.input.id), makeInterpreter());
    registry.get(String(scenarioCase.input.missingId));
    registry.unregister(String(scenarioCase.input.id));
    assert.deepEqual(order, scenarioCase.expected.order);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  },
  'on-register': (scenarioCase) => {
    const registry = ObservedRegistry.make();
    registry.register(String(scenarioCase.input.id), makeInterpreter());
    assert.deepEqual(registry.registerCalls, scenarioCase.expected.registerCalls);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  },
  'on-resolve-hit-no-hook': (scenarioCase) => {
    const registry = ObservedRegistry.make();
    registry.register(String(scenarioCase.input.id), makeInterpreter());
    registry.missCalls.length = 0;
    const result = registry.get(String(scenarioCase.input.id));
    assert.ok(result !== undefined);
    assert.deepEqual(registry.missCalls, scenarioCase.expected.missCalls);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  },
  'on-resolve-miss': (scenarioCase) => {
    const registry = ObservedRegistry.make();
    const result = registry.get(String(scenarioCase.input.missingId));
    assert.equal(result, undefined);
    assert.deepEqual(registry.missCalls, scenarioCase.expected.missCalls);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  },
  'on-unregister': (scenarioCase) => {
    const registry = ObservedRegistry.make();
    registry.register(String(scenarioCase.input.id), makeInterpreter());
    registry.registerCalls.length = 0;
    registry.unregister(String(scenarioCase.input.id));
    assert.deepEqual(registry.unregisterCalls, scenarioCase.expected.unregisterCalls);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  },
  'on-unregister-missing': (scenarioCase) => {
    const registry = ObservedRegistry.make();
    registry.unregister(String(scenarioCase.input.missingId));
    assert.deepEqual(registry.unregisterCalls, scenarioCase.expected.unregisterCalls);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  },
  'throwing-on-register': (scenarioCase) => {
    class ThrowingRegisterRegistry extends MachineRegistry<SimpleState, SimpleEvent> {
      static make(): ThrowingRegisterRegistry {
        return new ThrowingRegisterRegistry();
      }

      protected override onRegister(): void {
        throw RuntimeError.create('register hook boom');
      }
    }

    const registry = ThrowingRegisterRegistry.make();
    const interpreter = makeInterpreter();
    assert.doesNotThrow(() => {
      registry.register(String(scenarioCase.input.id), interpreter);
    });
    assert.equal(registry.get(String(scenarioCase.input.id)), interpreter);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
    assert.equal(scenarioCase.expected.valuePreserved, true);
  },
  'throwing-on-resolve-miss': (scenarioCase) => {
    class ThrowingMissRegistry extends MachineRegistry<SimpleState, SimpleEvent> {
      static make(): ThrowingMissRegistry {
        return new ThrowingMissRegistry();
      }

      protected override onResolveMiss(): void {
        throw RuntimeError.create('miss hook boom');
      }
    }

    const registry = ThrowingMissRegistry.make();
    assert.doesNotThrow(() => {
      assert.equal(registry.get(String(scenarioCase.input.missingId)), undefined);
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
        throw RuntimeError.create('unregister hook boom');
      }
    }

    const registry = ThrowingUnregisterRegistry.make();
    registry.register(String(scenarioCase.input.id), makeInterpreter());
    assert.doesNotThrow(() => {
      registry.unregister(String(scenarioCase.input.id));
    });
    assert.equal(registry.has(String(scenarioCase.input.id)), false);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
    assert.equal(scenarioCase.expected.removed, true);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('MachineRegistry lifecycle hooks', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
