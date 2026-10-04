import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const throttleOnlyInputSchema = {
  'additionalProperties': false,
  'properties': { 'throttle': { 'additionalProperties': false, 'properties': { 'concurrencyLimit': { 'type': 'number' } }, 'required': ['concurrencyLimit'], 'type': 'object' } },
  'required': ['throttle'],
  'type': 'object'
} as const;

const throttleOnlyInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'throttle': SchemaNode.defineObject({ 'type': 'object' } as const, { 'concurrencyLimit': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['concurrencyLimit'] as const, { 'additionalProperties': false, 'patternProperties': {} })
}, ['throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} });

class FsmScenarioCaseEntityBuilders {
  static wrapCaseSchema<const TShape extends string>(shape: TShape, expected: Record<string, unknown>, expectedRequired: readonly string[], input: Record<string, unknown> = throttleOnlyInputSchema) {const result = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': false, 'properties': expected, 'required': expectedRequired, 'type': 'object' },
      'input': input,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': shape }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  return result;}
}

const validateStatesSchema = FsmScenarioCaseEntityBuilders.wrapCaseSchema(
  'validate-states',
  { 'invalidState': { 'const': false }, 'validStates': { 'const': true } },
  ['invalidState', 'validStates'],
  {
    'additionalProperties': false,
    'properties': { 'invalidState': { 'minLength': 1, 'type': 'string' }, 'states': { 'items': { 'minLength': 1, 'type': 'string' }, 'type': 'array' } },
    'required': ['invalidState', 'states'],
    'type': 'object'
  }
);

const validateStatesNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'invalidState': SchemaNode.defineConst({}, false as const), 'validStates': SchemaNode.defineConst({}, true as const) }, ['invalidState', 'validStates'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
    'invalidState': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'states': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), undefined)
  }, ['invalidState', 'states'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'shape': SchemaNode.defineConst({}, 'validate-states' as const)
}, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const startsIdleSchema = FsmScenarioCaseEntityBuilders.wrapCaseSchema('starts-idle', { 'currentState': { 'const': 'idle' }, 'transitionCount': { 'const': 0 } }, ['currentState', 'transitionCount']);
const startsIdleNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'currentState': SchemaNode.defineConst({}, 'idle' as const), 'transitionCount': SchemaNode.defineConst({}, 0 as const) }, ['currentState', 'transitionCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  'input': throttleOnlyInputNode,
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'shape': SchemaNode.defineConst({}, 'starts-idle' as const)
}, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const idleToActiveSchema = FsmScenarioCaseEntityBuilders.wrapCaseSchema('idle-to-active', { 'from': { 'const': 'idle' }, 'to': { 'const': 'active' } }, ['from', 'to']);
const idleToActiveNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'from': SchemaNode.defineConst({}, 'idle' as const), 'to': SchemaNode.defineConst({}, 'active' as const) }, ['from', 'to'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  'input': throttleOnlyInputNode,
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'shape': SchemaNode.defineConst({}, 'idle-to-active' as const)
}, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const activeToIdleSchema = FsmScenarioCaseEntityBuilders.wrapCaseSchema(
  'active-to-idle',
  { 'currentState': { 'const': 'idle' }, 'from': { 'const': 'active' }, 'to': { 'const': 'idle' } },
  ['currentState', 'from', 'to']
);
const activeToIdleNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'currentState': SchemaNode.defineConst({}, 'idle' as const), 'from': SchemaNode.defineConst({}, 'active' as const), 'to': SchemaNode.defineConst({}, 'idle' as const) }, ['currentState', 'from', 'to'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  'input': throttleOnlyInputNode,
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'shape': SchemaNode.defineConst({}, 'active-to-idle' as const)
}, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const idleToDrainingSchema = FsmScenarioCaseEntityBuilders.wrapCaseSchema(
  'idle-to-draining',
  { 'currentState': { 'const': 'draining' }, 'from': { 'const': 'idle' }, 'to': { 'const': 'draining' } },
  ['currentState', 'from', 'to']
);
const idleToDrainingNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'currentState': SchemaNode.defineConst({}, 'draining' as const), 'from': SchemaNode.defineConst({}, 'idle' as const), 'to': SchemaNode.defineConst({}, 'draining' as const) }, ['currentState', 'from', 'to'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  'input': throttleOnlyInputNode,
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'shape': SchemaNode.defineConst({}, 'idle-to-draining' as const)
}, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const abortTransitionsToAbortedSchema = FsmScenarioCaseEntityBuilders.wrapCaseSchema('abort-transitions-to-aborted', { 'currentState': { 'const': 'aborted' }, 'to': { 'const': 'aborted' } }, ['currentState', 'to']);
const abortTransitionsToAbortedNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'currentState': SchemaNode.defineConst({}, 'aborted' as const), 'to': SchemaNode.defineConst({}, 'aborted' as const) }, ['currentState', 'to'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  'input': throttleOnlyInputNode,
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'shape': SchemaNode.defineConst({}, 'abort-transitions-to-aborted' as const)
}, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const doubleAbortNoSecondTransitionSchema = FsmScenarioCaseEntityBuilders.wrapCaseSchema('double-abort-no-second-transition', { 'abortedTransitionCount': { 'const': 1 } }, ['abortedTransitionCount']);
const doubleAbortNoSecondTransitionNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'abortedTransitionCount': SchemaNode.defineConst({}, 1 as const) }, ['abortedTransitionCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  'input': throttleOnlyInputNode,
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'shape': SchemaNode.defineConst({}, 'double-abort-no-second-transition' as const)
}, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const illegalTransitionThrowsSchema = FsmScenarioCaseEntityBuilders.wrapCaseSchema(
  'illegal-transition-throws',
  { 'errorMessage': { 'minLength': 1, 'type': 'string' } },
  ['errorMessage'],
  {
    'additionalProperties': false,
    'properties': {
      'illegalFrom': { 'const': 'idle' },
      'illegalTo': { 'const': 'active' },
      'throttle': { 'additionalProperties': false, 'properties': { 'concurrencyLimit': { 'type': 'number' } }, 'required': ['concurrencyLimit'], 'type': 'object' }
    },
    'required': ['illegalFrom', 'illegalTo', 'throttle'],
    'type': 'object'
  }
);

const illegalTransitionThrowsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['errorMessage'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
    'illegalFrom': SchemaNode.defineConst({}, 'idle' as const),
    'illegalTo': SchemaNode.defineConst({}, 'active' as const),
    'throttle': SchemaNode.defineObject({ 'type': 'object' } as const, { 'concurrencyLimit': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['concurrencyLimit'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  }, ['illegalFrom', 'illegalTo', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'shape': SchemaNode.defineConst({}, 'illegal-transition-throws' as const)
}, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** The eight scenario case shapes `fsm.loop.spec.ts` exercises. */
export namespace FsmScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      validateStatesSchema, startsIdleSchema, idleToActiveSchema, activeToIdleSchema, idleToDrainingSchema,
      abortTransitionsToAbortedSchema, doubleAbortNoSecondTransitionSchema, illegalTransitionThrowsSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    validateStatesNode, startsIdleNode, idleToActiveNode, activeToIdleNode, idleToDrainingNode,
    abortTransitionsToAbortedNode, doubleAbortNoSecondTransitionNode, illegalTransitionThrowsNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
