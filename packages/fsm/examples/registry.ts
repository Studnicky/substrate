/** registry — MachineRegistry named singleton store and duplicate-registration guard. Run: npx tsx examples/registry.ts */

import assert from 'node:assert/strict';

// #region usage
import type { FsmStepType } from '../src/index.js';

import { EffectInterpreter, MachineAlreadyRegisteredError, MachineRegistry, StateMachine } from '../src/index.js';

type ToggleState = { readonly 'variant': 'on' } | { readonly 'variant': 'off' };
type ToggleEvent = { readonly 'type': 'toggle' };

class Toggle extends StateMachine<ToggleState, ToggleEvent> {
  static make(): Toggle { return new Toggle(); }

  getInitialState(): ToggleState {
    return { 'variant': 'off' };
  }

  reduce(state: ToggleState, event: ToggleEvent): FsmStepType<ToggleState> {
    if (event.type === 'toggle') {
      return { 'effects': [], 'state': { 'variant': state.variant === 'off' ? 'on' : 'off' } };
    }
    return { 'effects': [], 'state': state };
  }
}

const interpreter: EffectInterpreter<ToggleState, ToggleEvent> = EffectInterpreter.create({ 'machine': Toggle.make(), 'machineId': 'toggle-a' });
interpreter.start();

// Registry is empty before registration
assert.equal(MachineRegistry.has('toggle-a'), false);
assert.deepEqual(MachineRegistry.list(), []);

MachineRegistry.register('toggle-a', interpreter);
assert.equal(MachineRegistry.has('toggle-a'), true);
assert.deepEqual(MachineRegistry.list(), ['toggle-a']);

// Duplicate registration throws MachineAlreadyRegisteredError
assert.throws(
  () => { MachineRegistry.register('toggle-a', interpreter); },
  MachineAlreadyRegisteredError
);

// Retrieve and drive the machine through the registry
const found = MachineRegistry.get('toggle-a');
assert.ok(found !== undefined);

await found.send({ 'type': 'toggle' });
assert.equal(interpreter.getState().variant, 'on');

await found.send({ 'type': 'toggle' });
assert.equal(interpreter.getState().variant, 'off');

// Unknown name returns undefined
assert.equal(MachineRegistry.get('unknown'), undefined);

MachineRegistry.unregister('toggle-a');
assert.equal(MachineRegistry.has('toggle-a'), false);

interpreter.stop();

console.log('Registry state:', MachineRegistry.list());
// #endregion usage

console.log('registry: all assertions passed');
