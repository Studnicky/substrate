/** traffic-light — basic state transitions with an EffectInterpreter. Run: npx tsx examples/traffic-light.ts */

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
  getInitialState(): TrafficState {
    return { 'variant': 'red' };
  }

  reduce(state: TrafficState, event: TrafficEvent): FsmStepType<TrafficState, TrafficEffect> {
    if (event.type === 'advance') {
      if (state.variant === 'red')   {return { 'effects': [], 'state': { 'variant': 'green' } };}
      if (state.variant === 'green') {return { 'effects': [{ 'tone': 'chime', 'variant': 'playSound' }], 'state': { 'variant': 'amber' } };}
      if (state.variant === 'amber') {return { 'effects': [], 'state': { 'variant': 'red' } };}
    }
    return { 'effects': [], 'state': state };
  }
}

const soundsPlayed: string[] = [];

const handlers: EffectHandlerMapType<TrafficEffect> = {
  'playSound': (effect) => {
    soundsPlayed.push(effect.tone);
  }
};

const machine = new TrafficLight();
const interpreter = new EffectInterpreter(machine, handlers, { 'machineId': 'test-light' });

const history: string[] = [];
const unsubscribe = interpreter.subscribe((state) => { history.push(state.variant); });

interpreter.start();

await interpreter.send({ 'type': 'advance' });
await interpreter.send({ 'type': 'advance' });
await interpreter.send({ 'type': 'advance' });

console.log('State after 3 advances:', interpreter.getState().variant);
console.log('Sound history:', soundsPlayed);
console.log('State history:', history);

unsubscribe();
interpreter.stop();
// #endregion usage

assert.equal(interpreter.getState().variant, 'red');
assert.deepEqual(soundsPlayed, ['chime']);
assert.deepEqual(history, ['red', 'green', 'amber', 'red']);

console.log('traffic-light: all assertions passed');
