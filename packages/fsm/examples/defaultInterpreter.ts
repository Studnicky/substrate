/** defaultInterpreter — construct and drive an EffectInterpreter without optional identity settings. Run: npx tsx examples/defaultInterpreter.ts */


import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';
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
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'variant': SchemaNode.defineEnum(['active', 'idle'] as const) }, ['variant'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
}

namespace DemoEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'type': { 'enum': ['activate', 'deactivate'], 'type': 'string' }
    },
    'required': ['type'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'type': SchemaNode.defineEnum(['activate', 'deactivate'] as const) }, ['type'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
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
>(machine);
interpreter.start();
await interpreter.send({ 'type': 'activate' });
interpreter.stop();

assert.deepStrictEqual(interpreter.getState(), { 'variant': 'active' });
// #endregion usage

console.log('defaultInterpreter: all assertions passed');
