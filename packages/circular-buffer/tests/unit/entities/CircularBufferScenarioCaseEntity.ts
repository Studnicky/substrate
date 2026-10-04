import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Unvalidated construction options: `construction-invalid-capacity` deliberately supplies a capacity `CircularBuffer.create()` itself rejects. */
const rawOptionsSchema = {
  'additionalProperties': false,
  'properties': { 'capacity': { 'type': 'number' }, 'overflow': { 'enum': ['overwrite', 'grow'], 'type': 'string' } },
  'required': [],
  'type': 'object'
} as const;

const rawOptionsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'capacity': SchemaNode.defineNumber({ 'type': 'number' } as const), 'overflow': SchemaNode.defineEnum({ 'type': 'string' } as const, ['overwrite', 'grow'] as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const growOperationNode = SchemaNode.defineOneOf({}, [
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'drainAll': SchemaNode.defineConst({}, true as const) }, ['drainAll'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'push': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const) }, ['push'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'shift': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const) }, ['shift'] as const, { 'additionalProperties': false, 'patternProperties': {} })
]);

const batchNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'itemCount': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
  'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined),
  'operations': SchemaNode.defineArray({ 'type': 'array' } as const, growOperationNode, undefined),
  'shiftEveryNth': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const),
  'startValue': SchemaNode.defineNumber({ 'type': 'number' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expectedObjectNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'doesNotThrow': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
  'drained': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined),
  'length': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
  'lengths': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), undefined),
  'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'preservedIdentity': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
  'shifted': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'shiftedMatchesPushed': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
  'shifts': SchemaNode.defineTuple({ 'items': false, 'minItems': 3, 'type': 'array' } as const, [SchemaNode.defineNull({ 'type': 'null' } as const), SchemaNode.defineNull({ 'type': 'null' } as const), SchemaNode.defineNull({ 'type': 'null' } as const)] as const),
  'value': SchemaNode.defineOneOf({}, [SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineNull({ 'type': 'null' } as const)])
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const expectedNode = SchemaNode.defineOneOf({}, [expectedObjectNode, SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined)]);

/** The scenario case shape `CircularBuffer.loop.spec.ts` exercises for `CircularBuffer` core push/shift/grow behavior. */
export namespace CircularBufferScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'oneOf': [
          {
            'additionalProperties': false,
            'properties': {
              'doesNotThrow': { 'type': 'boolean' },
              'drained': { 'items': { 'type': 'number' }, 'type': 'array' },
              'length': { 'minimum': 0, 'type': 'integer' },
              'lengths': { 'items': { 'minimum': 0, 'type': 'integer' }, 'type': 'array' },
              'message': { 'minLength': 1, 'type': 'string' },
              'preservedIdentity': { 'type': 'boolean' },
              'shifted': { 'type': 'number' },
              'shiftedMatchesPushed': { 'type': 'boolean' },
              'shifts': {
                'items': false,
                'minItems': 3,
                'prefixItems': [{ 'schema': { 'type': 'null' } }, { 'schema': { 'type': 'null' } }, { 'schema': { 'type': 'null' } }],
                'type': 'array'
              },
              'value': { 'oneOf': [{ 'type': 'number' }, { 'type': 'null' }] }
            },
            'required': [],
            'type': 'object'
          },
          { 'items': { 'type': 'number' }, 'type': 'array' }
        ]
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'batch': {
            'additionalProperties': false,
            'properties': {
              'itemCount': { 'minimum': 0, 'type': 'integer' },
              'items': { 'items': { 'type': 'number' }, 'type': 'array' },
              'operations': {
                'items': {
                  'oneOf': [
                    { 'additionalProperties': false, 'properties': { 'drainAll': { 'const': true } }, 'required': ['drainAll'], 'type': 'object' },
                    { 'additionalProperties': false, 'properties': { 'push': { 'minimum': 0, 'type': 'integer' } }, 'required': ['push'], 'type': 'object' },
                    { 'additionalProperties': false, 'properties': { 'shift': { 'minimum': 0, 'type': 'integer' } }, 'required': ['shift'], 'type': 'object' }
                  ]
                },
                'type': 'array'
              },
              'shiftEveryNth': { 'minimum': 1, 'type': 'integer' },
              'startValue': { 'type': 'number' }
            },
            'required': [],
            'type': 'object'
          },
          'options': rawOptionsSchema
        },
        'required': ['options'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'capacity-one-cycling', 'capacity-two-cycling', 'construction-capacity-one-empty', 'construction-custom-capacity-empty',
          'construction-default-empty', 'construction-invalid-capacity', 'fifo-order', 'grow-head-wraparound',
          'grow-multiple-cycles-preserves-order', 'grow-order-preserved-after-grow', 'grow-past-capacity',
          'grow-preserves-items-head-not-zero', 'grow-wraparound-order', 'length-reflects-count-not-capacity',
          'non-primitive-values', 'overwrite-capacity-one-holds-last', 'overwrite-fifo-after-multiple-evictions',
          'overwrite-length-stays-at-capacity', 'overwrite-oldest-evicted', 'push-after-shift-order',
          'push-increments-length', 'push-length-grow', 'push-length-overwrite', 'push-shift-cycling',
          'push-then-shift-then-push-again', 'shift-after-all-items-returns-undefined', 'shift-empty-does-not-throw',
          'shift-empty-returns-undefined', 'shift-empty-successive-returns-undefined', 'shift-first-item-and-decrements-length',
          'shift-only-item-and-leaves-empty'
        ]
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': expectedNode,
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': batchNode, 'options': rawOptionsNode }, ['options'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineEnum({}, [
      'capacity-one-cycling', 'capacity-two-cycling', 'construction-capacity-one-empty', 'construction-custom-capacity-empty',
      'construction-default-empty', 'construction-invalid-capacity', 'fifo-order', 'grow-head-wraparound',
      'grow-multiple-cycles-preserves-order', 'grow-order-preserved-after-grow', 'grow-past-capacity',
      'grow-preserves-items-head-not-zero', 'grow-wraparound-order', 'length-reflects-count-not-capacity',
      'non-primitive-values', 'overwrite-capacity-one-holds-last', 'overwrite-fifo-after-multiple-evictions',
      'overwrite-length-stays-at-capacity', 'overwrite-oldest-evicted', 'push-after-shift-order',
      'push-increments-length', 'push-length-grow', 'push-length-overwrite', 'push-shift-cycling',
      'push-then-shift-then-push-again', 'shift-after-all-items-returns-undefined', 'shift-empty-does-not-throw',
      'shift-empty-returns-undefined', 'shift-empty-successive-returns-undefined', 'shift-first-item-and-decrements-length',
      'shift-only-item-and-leaves-empty'
    ] as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
