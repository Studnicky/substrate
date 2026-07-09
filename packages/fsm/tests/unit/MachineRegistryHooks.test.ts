import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { StateMachine } from '../../src/StateMachine.js';
import { EffectInterpreter } from '../../src/EffectInterpreter.js';
import { MachineRegistry } from '../../src/MachineRegistry.js';
import type { FsmStepType } from '../../src/FsmStepType.js';

type SimpleState = { readonly 'variant': 'idle' };
type SimpleEvent = { readonly 'type': 'noop' };

class SimpleMachine extends StateMachine<SimpleState, SimpleEvent> {
  getInitialState(): SimpleState { return { 'variant': 'idle' }; }
  reduce(state: SimpleState, _event: SimpleEvent): FsmStepType<SimpleState> {
    return { 'effects': [], 'state': state };
  }
}

type BoundedInterpreter = EffectInterpreter<{ readonly 'variant': string }, { readonly 'type': string }, { readonly 'variant': string }>;

class ObservedRegistry extends MachineRegistry {
  static override create(): ObservedRegistry {
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

function makeInterpreter(): BoundedInterpreter {
  return EffectInterpreter.create({ 'machine': new SimpleMachine() }) as BoundedInterpreter;
}

describe('MachineRegistry lifecycle hooks', () => {
  let registry: ObservedRegistry;

  beforeEach(() => {
    registry = ObservedRegistry.create();
  });

  it('onRegister fires with the registered id', () => {
    registry.register('hook-test', makeInterpreter());

    assert.equal(registry.registerCalls.length, 1);
    assert.equal(registry.registerCalls[0], 'hook-test');
  });

  it('onRegister does not fire when registration throws (duplicate)', () => {
    registry.register('dup', makeInterpreter());
    registry.registerCalls.length = 0;

    assert.throws(() => registry.register('dup', makeInterpreter()));
    assert.equal(registry.registerCalls.length, 0);
  });

  it('onUnregister fires with the unregistered id', () => {
    registry.register('gone', makeInterpreter());
    registry.registerCalls.length = 0;
    registry.unregister('gone');

    assert.equal(registry.unregisterCalls.length, 1);
    assert.equal(registry.unregisterCalls[0], 'gone');
  });

  it('onUnregister fires even for an id that was not registered', () => {
    registry.unregister('never-existed');

    assert.equal(registry.unregisterCalls.length, 1);
    assert.equal(registry.unregisterCalls[0], 'never-existed');
  });

  it('onResolveMiss fires when get() returns undefined', () => {
    const result = registry.get('missing');

    assert.equal(result, undefined);
    assert.equal(registry.missCalls.length, 1);
    assert.equal(registry.missCalls[0], 'missing');
  });

  it('onResolveMiss does not fire when get() returns a registered interpreter', () => {
    registry.register('present', makeInterpreter());
    registry.missCalls.length = 0;
    const result = registry.get('present');

    assert.ok(result !== undefined);
    assert.equal(registry.missCalls.length, 0);
  });

  it('hooks fire in correct order across a full register → get-miss → unregister cycle', () => {
    const order: string[] = [];

    class OrderedRegistry extends MachineRegistry {
      static override create(): OrderedRegistry {
        return new OrderedRegistry();
      }

      protected override onRegister(_id: string): void { order.push('register'); }
      protected override onUnregister(_id: string): void { order.push('unregister'); }
      protected override onResolveMiss(_id: string): void { order.push('miss'); }
    }

    const orderedRegistry = OrderedRegistry.create();
    orderedRegistry.register('cycle', makeInterpreter());
    orderedRegistry.get('unknown-for-miss');
    orderedRegistry.unregister('cycle');

    assert.deepEqual(order, ['register', 'miss', 'unregister']);
  });

  it('a throwing onRegister hook does not replace a completed registration', () => {
    class ThrowingRegisterRegistry extends MachineRegistry {
      static override create(): ThrowingRegisterRegistry {
        return new ThrowingRegisterRegistry();
      }

      protected override onRegister(): void {
        throw new Error('register hook boom');
      }
    }

    const throwingRegistry = ThrowingRegisterRegistry.create();
    const interpreter = makeInterpreter();

    assert.doesNotThrow(() => {
      throwingRegistry.register('stable', interpreter);
    });
    assert.equal(throwingRegistry.get('stable'), interpreter);
  });

  it('a throwing onResolveMiss hook does not replace an undefined lookup', () => {
    class ThrowingMissRegistry extends MachineRegistry {
      static override create(): ThrowingMissRegistry {
        return new ThrowingMissRegistry();
      }

      protected override onResolveMiss(): void {
        throw new Error('miss hook boom');
      }
    }

    const throwingRegistry = ThrowingMissRegistry.create();

    assert.doesNotThrow(() => {
      assert.equal(throwingRegistry.get('missing'), undefined);
    });
  });

  it('a throwing onUnregister hook does not replace a completed deletion', () => {
    class ThrowingUnregisterRegistry extends MachineRegistry {
      static override create(): ThrowingUnregisterRegistry {
        return new ThrowingUnregisterRegistry();
      }

      protected override onUnregister(): void {
        throw new Error('unregister hook boom');
      }
    }

    const throwingRegistry = ThrowingUnregisterRegistry.create();
    throwingRegistry.register('gone', makeInterpreter());

    assert.doesNotThrow(() => {
      throwingRegistry.unregister('gone');
    });
    assert.equal(throwingRegistry.has('gone'), false);
  });
});
