import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const MUTEX_KEY_STATES = ['locked', 'queued', 'unlocked'] as const;

const validateStatesSchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': { 'invalidState': { 'const': false }, 'validStates': { 'const': true } },
      'required': ['invalidState', 'validStates'],
      'type': 'object'
    },
    'input': {
      'additionalProperties': false,
      'properties': {
        'invalidState': { 'minLength': 1, 'type': 'string' },
        'states': { 'items': { 'enum': MUTEX_KEY_STATES }, 'type': 'array' }
      },
      'required': ['invalidState', 'states'],
      'type': 'object'
    },
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'validate-states' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

class FsmScenarioCaseEntityBuilders {
  static transitionSchemaFor<const From extends string, const To extends string, const Shape extends string>(from: From, to: To, shape: Shape) {const result = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'from': { 'const': from },
          'key': { 'minLength': 1, 'type': 'string' },
          'to': { 'const': to }
        },
        'required': ['from', 'key', 'to'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'key': { 'minLength': 1, 'type': 'string' } },
        'required': ['key'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': shape }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  return result;}

  static transitionNodeFor<const From extends string, const To extends string, const Shape extends string>(from: From, to: To, shape: Shape) {const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'from': SchemaNode.defineConst({}, from),
      'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'to': SchemaNode.defineConst({}, to)
    }, ['from', 'key', 'to'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['key'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, shape)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  return result;}
}

const illegalTransitionSchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': { 'errorPattern': { 'minLength': 1, 'type': 'string' } },
      'required': ['errorPattern'],
      'type': 'object'
    },
    'input': {
      'additionalProperties': false,
      'properties': { 'key': { 'minLength': 1, 'type': 'string' } },
      'required': ['key'],
      'type': 'object'
    },
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'illegal-transition-throws' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

/** The discriminated scenario case shapes `fsm.loop.spec.ts` exercises against the mutex key-state FSM. */
export namespace FsmScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      validateStatesSchema,
      FsmScenarioCaseEntityBuilders.transitionSchemaFor('unlocked', 'locked', 'unlocked-to-locked'),
      FsmScenarioCaseEntityBuilders.transitionSchemaFor('locked', 'queued', 'locked-to-queued'),
      FsmScenarioCaseEntityBuilders.transitionSchemaFor('queued', 'locked', 'queued-to-locked'),
      FsmScenarioCaseEntityBuilders.transitionSchemaFor('locked', 'unlocked', 'locked-to-unlocked'),
      illegalTransitionSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'invalidState': SchemaNode.defineConst({}, false as const), 'validStates': SchemaNode.defineConst({}, true as const) }, ['invalidState', 'validStates'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'invalidState': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'states': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineEnum({}, MUTEX_KEY_STATES), undefined)
      }, ['invalidState', 'states'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'validate-states' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    FsmScenarioCaseEntityBuilders.transitionNodeFor('unlocked', 'locked', 'unlocked-to-locked'),
    FsmScenarioCaseEntityBuilders.transitionNodeFor('locked', 'queued', 'locked-to-queued'),
    FsmScenarioCaseEntityBuilders.transitionNodeFor('queued', 'locked', 'queued-to-locked'),
    FsmScenarioCaseEntityBuilders.transitionNodeFor('locked', 'unlocked', 'locked-to-unlocked'),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorPattern': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['errorPattern'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['key'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'illegal-transition-throws' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
