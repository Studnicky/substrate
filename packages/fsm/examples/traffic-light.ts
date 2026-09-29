/**
 * traffic-light — progress a Northstar Books order through legal fulfilment
 * states. A pipeline effect validates, prices, and routes the submitted order.
 *
 * Run: npx tsx examples/traffic-light.ts
 */

import type { EntityCreateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';
import { Pipeline } from '@studnicky/pipeline/node';
import assert from 'node:assert/strict';

import type { FsmStepInterface, PipelineEffectInterface } from '../src/index.js';

import { EffectInterpreter, PipelineEffectHandler, StateMachine } from '../src/index.js';

// #region usage
namespace NorthstarFulfilmentStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'variant': { 'enum': ['draft', 'processing', 'ready-to-ship', 'shipped'], 'type': 'string' }
    },
    'required': ['variant'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'variant': SchemaNode.defineEnum({}, ['draft', 'processing', 'ready-to-ship', 'shipped'] as const) }, ['variant'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}

namespace NorthstarFulfilmentEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'stages': { 'items': { 'type': 'string' }, 'type': 'array' },
      'type': { 'enum': ['ship', 'submit', 'validated'], 'type': 'string' }
    },
    'required': ['stages', 'type'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'stages': SchemaNode.defineArray({}, SchemaNode.defineString({}), undefined), 'type': SchemaNode.defineEnum({}, ['ship', 'submit', 'validated'] as const) }, ['stages', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}

interface NorthstarFulfilmentEffectInterface extends PipelineEffectInterface<NorthstarFulfilmentEventEntity.Type> {}

class NorthstarFulfilmentMachine extends StateMachine<
  NorthstarFulfilmentStateEntity.Type,
  NorthstarFulfilmentEventEntity.Type,
  NorthstarFulfilmentEffectInterface
> {
  static make(): NorthstarFulfilmentMachine { return new NorthstarFulfilmentMachine(); }

  getInitialState(): NorthstarFulfilmentStateEntity.Type {
    const state = NorthstarFulfilmentStateEntity.create({ 'variant': 'draft' });
    return state;
  }

  reduce(
    state: NorthstarFulfilmentStateEntity.Type,
    event: NorthstarFulfilmentEventEntity.Type
  ): FsmStepInterface<NorthstarFulfilmentStateEntity.Type, NorthstarFulfilmentEffectInterface> {
    if (state.variant === 'draft' && event.type === 'submit') {
      const step: FsmStepInterface<NorthstarFulfilmentStateEntity.Type, NorthstarFulfilmentEffectInterface> = {
        'effects': [{ 'event': NorthstarFulfilmentEventEntity.create({ 'stages': [], 'type': 'validated' }), 'variant': 'pipeline' }],
        'state': NorthstarFulfilmentStateEntity.create({ 'variant': 'processing' })
      };
      return step;
    }
    if (state.variant === 'processing' && event.type === 'validated') {
      if (event.stages.join(',') !== 'validate,price,route') {
        throw new Error('Northstar Books order pipeline did not finish every fulfilment stage');
      }
      const step: FsmStepInterface<NorthstarFulfilmentStateEntity.Type, NorthstarFulfilmentEffectInterface> = {
        'effects': [],
        'state': NorthstarFulfilmentStateEntity.create({ 'variant': 'ready-to-ship' })
      };
      return step;
    }
    if (state.variant === 'ready-to-ship' && event.type === 'ship') {
      const step: FsmStepInterface<NorthstarFulfilmentStateEntity.Type, NorthstarFulfilmentEffectInterface> = {
        'effects': [],
        'state': NorthstarFulfilmentStateEntity.create({ 'variant': 'shipped' })
      };
      return step;
    }
    const step: FsmStepInterface<NorthstarFulfilmentStateEntity.Type, NorthstarFulfilmentEffectInterface> = {
      'effects': [],
      'state': state
    };
    return step;
  }

  protected override isTerminated(state: NorthstarFulfilmentStateEntity.Type): boolean {
    const terminated = state.variant === 'shipped';
    return terminated;
  }
}

const fulfilmentPipeline = Pipeline.create<NorthstarFulfilmentEventEntity.Type>([
  (event) => {
    const result: NorthstarFulfilmentEventEntity.Type = event.type === 'validated'
      ? NorthstarFulfilmentEventEntity.create({ 'stages': [...event.stages, 'validate'], 'type': 'validated' })
      : event;
    return result;
  },
  (event) => {
    const result: NorthstarFulfilmentEventEntity.Type = event.type === 'validated'
      ? NorthstarFulfilmentEventEntity.create({ 'stages': [...event.stages, 'price'], 'type': 'validated' })
      : event;
    return result;
  },
  (event) => {
    const result: NorthstarFulfilmentEventEntity.Type = event.type === 'validated'
      ? NorthstarFulfilmentEventEntity.create({ 'stages': [...event.stages, 'route'], 'type': 'validated' })
      : event;
    return result;
  }
]);

const machine = NorthstarFulfilmentMachine.make();
const interpreter = EffectInterpreter.create(machine, {
  'handler': PipelineEffectHandler.create(fulfilmentPipeline),
  'machineId': 'northstar-order-9780132350884'
});

interpreter.start();
await interpreter.send(NorthstarFulfilmentEventEntity.create({ 'stages': [], 'type': 'ship' }));
assert.equal(interpreter.getState().variant, 'draft');

await interpreter.send(NorthstarFulfilmentEventEntity.create({ 'stages': [], 'type': 'submit' }));
assert.equal(interpreter.getState().variant, 'ready-to-ship');

await interpreter.send(NorthstarFulfilmentEventEntity.create({ 'stages': [], 'type': 'ship' }));
const status = interpreter.getState().variant;
console.log(`Northstar Books order 9780132350884 is ${status}`);
interpreter.stop();
// #endregion usage

assert.equal(interpreter.getState().variant, 'shipped');

console.log('traffic-light: all assertions passed');
