import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { StateMachine } from '../../src/StateMachine.js';
import { EffectInterpreter } from '../../src/EffectInterpreter.js';
import { MachineRegistry } from '../../src/MachineRegistry.js';
import { MachineAlreadyRegisteredError } from '../../src/MachineAlreadyRegisteredError.js';
import type { FsmStepInterface } from '../../src/FsmStepInterface.js';

type SimpleState = { readonly variant: 'idle' };
type SimpleEvent = { readonly type: 'noop' };

class SimpleMachine extends StateMachine<SimpleState, SimpleEvent> {
  getInitialState(): SimpleState { return { variant: 'idle' }; }
  reduce(state: SimpleState, _event: SimpleEvent): FsmStepInterface<SimpleState> {
    return { state, effects: [] };
  }
}

class Fixture {
  static interpreter(): EffectInterpreter<SimpleState, SimpleEvent> {
    return EffectInterpreter.create({ machine: new SimpleMachine() });
  }
}

describe('MachineRegistry', () => {
  let registry: MachineRegistry<SimpleState, SimpleEvent>;

  beforeEach(() => {
    registry = MachineRegistry.create<SimpleState, SimpleEvent>();
  });

  it('register() and get() round-trip', () => {
    const interp = Fixture.interpreter();
    registry.register('test', interp);
    assert.equal(registry.get('test'), interp);
  });

  it('register() twice throws MachineAlreadyRegisteredError', () => {
    registry.register('dupe', Fixture.interpreter());
    assert.throws(
      () => registry.register('dupe', Fixture.interpreter()),
      (err: unknown) => {
        assert.ok(err instanceof MachineAlreadyRegisteredError);
        return true;
      }
    );
  });

  it('unregister() removes the entry', () => {
    registry.register('gone', Fixture.interpreter());
    registry.unregister('gone');
    assert.equal(registry.get('gone'), undefined);
  });

  const hasScenarios: Array<{
    description: string;
    setup: (r: MachineRegistry<SimpleState, SimpleEvent>) => void;
    name: string;
    expected: boolean;
  }> = [
    {
      description: 'has() returns true when registered',
      setup: (r) => { r.register('present', Fixture.interpreter()); },
      name: 'present',
      expected: true,
    },
    {
      description: 'has() returns false when not registered',
      setup: () => {},
      name: 'absent',
      expected: false,
    },
  ];
  for (const { description, setup, name, expected } of hasScenarios) {
    it(description, () => {
      setup(registry);
      assert.equal(registry.has(name), expected);
    });
  }

  it('list() returns all registered names', () => {
    registry.register('a', Fixture.interpreter());
    registry.register('b', Fixture.interpreter());
    const names = registry.list();
    assert.ok(names.includes('a'));
    assert.ok(names.includes('b'));
    assert.equal(names.length, 2);
  });

  it('two instances do not share state', () => {
    const other = MachineRegistry.create<SimpleState, SimpleEvent>();
    registry.register('isolated', Fixture.interpreter());
    assert.equal(registry.has('isolated'), true);
    assert.equal(other.has('isolated'), false);
    assert.deepEqual(other.list(), []);
  });
});
