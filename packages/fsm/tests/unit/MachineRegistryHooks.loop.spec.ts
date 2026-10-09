import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { FsmStepInterface } from '../../src/interfaces/FsmStepInterface.js';
import type { MachineIdleStateEntity } from './entities/MachineIdleStateEntity.js';
import type { MachineNoopEventEntity } from './entities/MachineNoopEventEntity.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { EffectInterpreter } from '../../src/EffectInterpreter.js';
import { MachineRegistry } from '../../src/MachineRegistry.js';
import { StateMachine } from '../../src/StateMachine.js';
import { MachineRegistryHooksScenarioCaseEntity } from './entities/MachineRegistryHooksScenarioCaseEntity.js';
import scenarioGroups from './MachineRegistryHooks.scenarios.json' with { 'type': 'json' };

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

class ObservedRegistry extends MachineRegistry<
  MachineIdleStateEntity.Type,
  MachineNoopEventEntity.Type
> {
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

class AsyncRejectingRegisterRegistry extends MachineRegistry<
  MachineIdleStateEntity.Type,
  MachineNoopEventEntity.Type
> {
  static make(): AsyncRejectingRegisterRegistry {
    return new AsyncRejectingRegisterRegistry();
  }

  protected override async onRegister(): Promise<void> {
    await Promise.resolve();
    throw RuntimeError.create('async onRegister boom');
  }
}

class OrderedRegistry extends MachineRegistry<
  MachineIdleStateEntity.Type,
  MachineNoopEventEntity.Type
> {
  static make(): OrderedRegistry {
    return new OrderedRegistry();
  }

  readonly order: string[] = [];

  protected override onRegister(_id: string): void {
    this.order.push('register');
  }
  protected override onUnregister(_id: string): void {
    this.order.push('unregister');
  }
  protected override onResolveMiss(_id: string): void {
    this.order.push('miss');
  }
}

class ThrowingRegisterRegistry extends MachineRegistry<
  MachineIdleStateEntity.Type,
  MachineNoopEventEntity.Type
> {
  static make(): ThrowingRegisterRegistry {
    return new ThrowingRegisterRegistry();
  }

  protected override onRegister(): void {
    throw RuntimeError.create('register hook boom');
  }
}

class ThrowingMissRegistry extends MachineRegistry<
  MachineIdleStateEntity.Type,
  MachineNoopEventEntity.Type
> {
  static make(): ThrowingMissRegistry {
    return new ThrowingMissRegistry();
  }

  protected override onResolveMiss(): void {
    throw RuntimeError.create('miss hook boom');
  }
}

class ThrowingUnregisterRegistry extends MachineRegistry<
  MachineIdleStateEntity.Type,
  MachineNoopEventEntity.Type
> {
  static make(): ThrowingUnregisterRegistry {
    return new ThrowingUnregisterRegistry();
  }

  protected override onUnregister(): void {
    throw RuntimeError.create('unregister hook boom');
  }
}

class MachineRegistryHooksRunners {
  static async 'async-rejecting-register'(
    scenarioCase: ScenarioCaseOfType<
      MachineRegistryHooksScenarioCaseEntity.Type,
      'async-rejecting-register'
    >
  ): Promise<void> {
    let rejectionEventCount = 0;
    const onUnhandledRejection = (): void => {
      rejectionEventCount += 1;
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const registry = AsyncRejectingRegisterRegistry.make();
      const interpreter = MachineRegistryHooksRunners.interpreter();
      registry.register(scenarioCase.input.id, interpreter);
      const registered: unknown = interpreter;
      assert.equal(registry.get(scenarioCase.input.id), registered);
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      assert.equal(rejectionEventCount, scenarioCase.expected.rejectionEvents);
      assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
      assert.equal(scenarioCase.expected.valuePreserved, true);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static 'duplicate-no-register-hook'(
    scenarioCase: ScenarioCaseOfType<
      MachineRegistryHooksScenarioCaseEntity.Type,
      'duplicate-no-register-hook'
    >
  ): void {
    const registry = ObservedRegistry.make();
    registry.register(scenarioCase.input.id, MachineRegistryHooksRunners.interpreter());
    registry.registerCalls.length = 0;
    assert.throws(() => {
      registry.register(scenarioCase.input.duplicateId, MachineRegistryHooksRunners.interpreter());
    });
    assert.deepEqual(registry.registerCalls, scenarioCase.expected.registerCalls);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  }

  static 'hook-order'(
    scenarioCase: ScenarioCaseOfType<MachineRegistryHooksScenarioCaseEntity.Type, 'hook-order'>
  ): void {
    const registry = OrderedRegistry.make();
    registry.register(scenarioCase.input.id, MachineRegistryHooksRunners.interpreter());
    registry.get(scenarioCase.input.missingId);
    registry.unregister(scenarioCase.input.id);
    assert.deepEqual(registry.order, scenarioCase.expected.order);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  }

  static 'on-register'(
    scenarioCase: ScenarioCaseOfType<MachineRegistryHooksScenarioCaseEntity.Type, 'on-register'>
  ): void {
    const registry = ObservedRegistry.make();
    registry.register(scenarioCase.input.id, MachineRegistryHooksRunners.interpreter());
    assert.deepEqual(registry.registerCalls, scenarioCase.expected.registerCalls);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  }

  static 'on-resolve-hit-no-hook'(
    scenarioCase: ScenarioCaseOfType<
      MachineRegistryHooksScenarioCaseEntity.Type,
      'on-resolve-hit-no-hook'
    >
  ): void {
    const registry = ObservedRegistry.make();
    registry.register(scenarioCase.input.id, MachineRegistryHooksRunners.interpreter());
    registry.missCalls.length = 0;
    const result = registry.get(scenarioCase.input.id);
    assert.ok(result !== undefined);
    assert.deepEqual(registry.missCalls, scenarioCase.expected.missCalls);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  }

  static 'on-resolve-miss'(
    scenarioCase: ScenarioCaseOfType<
      MachineRegistryHooksScenarioCaseEntity.Type,
      'on-resolve-miss'
    >
  ): void {
    const registry = ObservedRegistry.make();
    const result = registry.get(scenarioCase.input.missingId);
    assert.equal(result, undefined);
    assert.deepEqual(registry.missCalls, scenarioCase.expected.missCalls);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  }

  static 'on-unregister'(
    scenarioCase: ScenarioCaseOfType<MachineRegistryHooksScenarioCaseEntity.Type, 'on-unregister'>
  ): void {
    const registry = ObservedRegistry.make();
    registry.register(scenarioCase.input.id, MachineRegistryHooksRunners.interpreter());
    registry.registerCalls.length = 0;
    registry.unregister(scenarioCase.input.id);
    assert.deepEqual(registry.unregisterCalls, scenarioCase.expected.unregisterCalls);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  }

  static 'on-unregister-missing'(
    scenarioCase: ScenarioCaseOfType<
      MachineRegistryHooksScenarioCaseEntity.Type,
      'on-unregister-missing'
    >
  ): void {
    const registry = ObservedRegistry.make();
    registry.unregister(scenarioCase.input.missingId);
    assert.deepEqual(registry.unregisterCalls, scenarioCase.expected.unregisterCalls);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
  }

  static 'throwing-on-register'(
    scenarioCase: ScenarioCaseOfType<
      MachineRegistryHooksScenarioCaseEntity.Type,
      'throwing-on-register'
    >
  ): void {
    const registry = ThrowingRegisterRegistry.make();
    const interpreter = MachineRegistryHooksRunners.interpreter();
    assert.doesNotThrow(() => {
      registry.register(scenarioCase.input.id, interpreter);
    });
    const registered: unknown = interpreter;
    assert.equal(registry.get(scenarioCase.input.id), registered);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
    assert.equal(scenarioCase.expected.valuePreserved, true);
  }

  static 'throwing-on-resolve-miss'(
    scenarioCase: ScenarioCaseOfType<
      MachineRegistryHooksScenarioCaseEntity.Type,
      'throwing-on-resolve-miss'
    >
  ): void {
    const registry = ThrowingMissRegistry.make();
    assert.doesNotThrow(() => {
      assert.equal(registry.get(scenarioCase.input.missingId), undefined);
    });
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
    assert.equal(scenarioCase.expected.valueUndefined, true);
  }

  static 'throwing-on-unregister'(
    scenarioCase: ScenarioCaseOfType<
      MachineRegistryHooksScenarioCaseEntity.Type,
      'throwing-on-unregister'
    >
  ): void {
    const registry = ThrowingUnregisterRegistry.make();
    registry.register(scenarioCase.input.id, MachineRegistryHooksRunners.interpreter());
    assert.doesNotThrow(() => {
      registry.unregister(scenarioCase.input.id);
    });
    assert.equal(registry.has(scenarioCase.input.id), false);
    assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
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
  'entity': MachineRegistryHooksScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'MachineRegistry lifecycle hooks',
  'runners': MachineRegistryHooksRunners
});
