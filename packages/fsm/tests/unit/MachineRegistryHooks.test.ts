import { describe, it, afterEach } from 'node:test';
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
  static readonly registerCalls: string[] = [];
  static readonly unregisterCalls: string[] = [];
  static readonly missCalls: string[] = [];

  static reset(): void {
    ObservedRegistry.registerCalls.length = 0;
    ObservedRegistry.unregisterCalls.length = 0;
    ObservedRegistry.missCalls.length = 0;
  }

  protected static override onRegister(id: string): void {
    ObservedRegistry.registerCalls.push(id);
  }

  protected static override onUnregister(id: string): void {
    ObservedRegistry.unregisterCalls.push(id);
  }

  protected static override onResolveMiss(id: string): void {
    ObservedRegistry.missCalls.push(id);
  }
}

function makeInterpreter(): BoundedInterpreter {
  return EffectInterpreter.create({ 'machine': new SimpleMachine() }) as BoundedInterpreter;
}

describe('MachineRegistry lifecycle hooks', () => {
  afterEach(() => {
    for (const name of MachineRegistry.list()) {
      MachineRegistry.unregister(name);
    }
    ObservedRegistry.reset();
  });

  it('onRegister fires with the registered id', () => {
    ObservedRegistry.register('hook-test', makeInterpreter());

    assert.equal(ObservedRegistry.registerCalls.length, 1);
    assert.equal(ObservedRegistry.registerCalls[0], 'hook-test');
  });

  it('onRegister does not fire when registration throws (duplicate)', () => {
    ObservedRegistry.register('dup', makeInterpreter());
    ObservedRegistry.reset();

    assert.throws(() => ObservedRegistry.register('dup', makeInterpreter()));
    assert.equal(ObservedRegistry.registerCalls.length, 0);
  });

  it('onUnregister fires with the unregistered id', () => {
    ObservedRegistry.register('gone', makeInterpreter());
    ObservedRegistry.reset();
    ObservedRegistry.unregister('gone');

    assert.equal(ObservedRegistry.unregisterCalls.length, 1);
    assert.equal(ObservedRegistry.unregisterCalls[0], 'gone');
  });

  it('onUnregister fires even for an id that was not registered', () => {
    ObservedRegistry.unregister('never-existed');

    assert.equal(ObservedRegistry.unregisterCalls.length, 1);
    assert.equal(ObservedRegistry.unregisterCalls[0], 'never-existed');
  });

  it('onResolveMiss fires when get() returns undefined', () => {
    const result = ObservedRegistry.get('missing');

    assert.equal(result, undefined);
    assert.equal(ObservedRegistry.missCalls.length, 1);
    assert.equal(ObservedRegistry.missCalls[0], 'missing');
  });

  it('onResolveMiss does not fire when get() returns a registered interpreter', () => {
    ObservedRegistry.register('present', makeInterpreter());
    ObservedRegistry.reset();
    const result = ObservedRegistry.get('present');

    assert.ok(result !== undefined);
    assert.equal(ObservedRegistry.missCalls.length, 0);
  });

  it('hooks fire in correct order across a full register → get-miss → unregister cycle', () => {
    const order: string[] = [];

    class OrderedRegistry extends MachineRegistry {
      protected static override onRegister(_id: string): void { order.push('register'); }
      protected static override onUnregister(_id: string): void { order.push('unregister'); }
      protected static override onResolveMiss(_id: string): void { order.push('miss'); }
    }

    OrderedRegistry.register('cycle', makeInterpreter());
    OrderedRegistry.get('unknown-for-miss');
    OrderedRegistry.unregister('cycle');

    assert.deepEqual(order, ['register', 'miss', 'unregister']);
  });
});
