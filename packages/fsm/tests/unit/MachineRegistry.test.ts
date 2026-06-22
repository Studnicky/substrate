import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { StateMachine } from '../../src/StateMachine.js';
import { EffectInterpreter } from '../../src/EffectInterpreter.js';
import { MachineRegistry } from '../../src/MachineRegistry.js';
import { MachineAlreadyRegisteredError } from '../../src/MachineAlreadyRegisteredError.js';
import type { FsmStepType } from '../../src/FsmStepType.js';

type SimpleState = { readonly variant: 'idle' };
type SimpleEvent = { readonly type: 'noop' };

class SimpleMachine extends StateMachine<SimpleState, SimpleEvent> {
  getInitialState(): SimpleState { return { variant: 'idle' }; }
  reduce(state: SimpleState, _event: SimpleEvent): FsmStepType<SimpleState> {
    return { state, effects: [] };
  }
}

class Fixture {
  static interpreter(): EffectInterpreter<SimpleState, SimpleEvent> {
    return new EffectInterpreter(new SimpleMachine());
  }
}

describe('MachineRegistry', () => {
  afterEach(() => {
    for (const name of MachineRegistry.list()) {
      MachineRegistry.unregister(name);
    }
  });

  it('register() and get() round-trip', () => {
    const interp = Fixture.interpreter();
    MachineRegistry.register('test', interp);
    assert.equal(MachineRegistry.get('test'), interp);
  });

  it('register() twice throws MachineAlreadyRegisteredError', () => {
    MachineRegistry.register('dupe', Fixture.interpreter());
    assert.throws(
      () => MachineRegistry.register('dupe', Fixture.interpreter()),
      (err: unknown) => {
        assert.ok(err instanceof MachineAlreadyRegisteredError);
        return true;
      }
    );
  });

  it('unregister() removes the entry', () => {
    MachineRegistry.register('gone', Fixture.interpreter());
    MachineRegistry.unregister('gone');
    assert.equal(MachineRegistry.get('gone'), undefined);
  });

  it('has() returns true when registered', () => {
    MachineRegistry.register('present', Fixture.interpreter());
    assert.equal(MachineRegistry.has('present'), true);
  });

  it('has() returns false when not registered', () => {
    assert.equal(MachineRegistry.has('absent'), false);
  });

  it('list() returns all registered names', () => {
    MachineRegistry.register('a', Fixture.interpreter());
    MachineRegistry.register('b', Fixture.interpreter());
    const names = MachineRegistry.list();
    assert.ok(names.includes('a'));
    assert.ok(names.includes('b'));
    assert.equal(names.length, 2);
  });
});
