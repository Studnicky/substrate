/** defaultInterpreter — construct and drive an EffectInterpreter without optional identity settings. Run: npx tsx examples/defaultInterpreter.ts */

import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import assert from 'node:assert/strict';

import type { FsmStepInterface } from '../src/index.js';

import { EffectInterpreter, StateMachine } from '../src/index.js';

// #region usage
namespace DemoStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'variant': { 'enum': ['active', 'idle'], 'type': 'string' }
    },
    'required': ['variant'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}

namespace DemoEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'type': { 'enum': ['activate', 'deactivate'], 'type': 'string' }
    },
    'required': ['type'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}

class DemoMachine extends StateMachine<DemoStateEntity.Type, DemoEventEntity.Type> {
  static make(): DemoMachine { return new DemoMachine(); }

  override getInitialState(): DemoStateEntity.Type {
    return { 'variant': 'idle' };
  }

  override reduce(state: DemoStateEntity.Type, event: DemoEventEntity.Type): FsmStepInterface<DemoStateEntity.Type> {
    if (state.variant === 'idle' && event.type === 'activate') {
      return { 'effects': [], 'state': { 'variant': 'active' } };
    }
    if (state.variant === 'active' && event.type === 'deactivate') {
      return { 'effects': [], 'state': { 'variant': 'idle' } };
    }
    return { 'effects': [], 'state': state };
  }
}

const machine: DemoMachine = DemoMachine.make();
const interpreter: EffectInterpreter<DemoStateEntity.Type, DemoEventEntity.Type> = EffectInterpreter.create<
  DemoStateEntity.Type,
  DemoEventEntity.Type
>({ 'machine': machine });
interpreter.start();
await interpreter.send({ 'type': 'activate' });
interpreter.stop();

assert.deepStrictEqual(interpreter.getState(), { 'variant': 'active' });
// #endregion usage

console.log('defaultInterpreter: all assertions passed');
