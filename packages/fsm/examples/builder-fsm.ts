/** builder-fsm — construct an EffectInterpreter via the fluent builder API. Run: npx tsx packages/fsm/examples/builder-fsm.ts */

import assert from 'node:assert/strict';

// #region usage
import type { EffectHandlerMapType, FsmStepType } from '../src/index.js';

import { EffectInterpreter, StateMachine } from '../src/index.js';

type TrafficState =
  | { readonly 'variant': 'red' }
  | { readonly 'variant': 'green' }
  | { readonly 'variant': 'amber' };

type TrafficEvent = { readonly 'type': 'advance' };

type TrafficEffect = { readonly 'tone': string; readonly 'variant': 'playSound'; };

class TrafficLight extends StateMachine<TrafficState, TrafficEvent, TrafficEffect> {
  static make(): TrafficLight { return new TrafficLight(); }

  getInitialState(): TrafficState {
    return { 'variant': 'red' };
  }

  reduce(state: TrafficState, event: TrafficEvent): FsmStepType<TrafficState, TrafficEffect> {
    if (event.type === 'advance') {
      if (state.variant === 'red')   { return { 'effects': [], 'state': { 'variant': 'green' } }; }
      if (state.variant === 'green') { return { 'effects': [{ 'tone': 'chime', 'variant': 'playSound' }], 'state': { 'variant': 'amber' } }; }
      if (state.variant === 'amber') { return { 'effects': [], 'state': { 'variant': 'red' } }; }
    }
    return { 'effects': [], 'state': state };
  }
}

const soundsPlayed: string[] = [];

const handlers: EffectHandlerMapType<TrafficEffect> = {
  'playSound': (effect) => {
    soundsPlayed.push(effect.tone);
    console.log(`  effect handler: playSound tone="${effect.tone}"`);
  }
};

const machine: TrafficLight = TrafficLight.make();

const interpreter = EffectInterpreter.builder<TrafficState, TrafficEvent, TrafficEffect>()
  .withMachine(machine)
  .withHandlers(handlers)
  .withOptions({ 'machineId': 'builder-demo' })
  .build();

const history: string[] = [];
const unsubscribe = interpreter.subscribe((state) => { history.push(state.variant); });

interpreter.start();
console.log('started — initial state:', interpreter.getState().variant);

await interpreter.send({ 'type': 'advance' });
console.log('after advance 1:', interpreter.getState().variant);

await interpreter.send({ 'type': 'advance' });
console.log('after advance 2:', interpreter.getState().variant);

await interpreter.send({ 'type': 'advance' });
console.log('after advance 3:', interpreter.getState().variant);

console.log('State history:', history);
console.log('Sounds played:', soundsPlayed);

unsubscribe();
interpreter.stop();
// #endregion usage

assert.equal(interpreter.getState().variant, 'red');
assert.deepEqual(soundsPlayed, ['chime']);
assert.deepEqual(history, ['red', 'green', 'amber', 'red']);

console.log('builder-fsm: all assertions passed');
