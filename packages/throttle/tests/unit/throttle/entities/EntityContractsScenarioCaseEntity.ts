import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const openBagSchema = { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' } as const;
const openBagNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true });

const validateCaseSchema = <const TShape extends 'abort-options' | 'active-operation-state'>(shape: TShape) => ({
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': openBagSchema,
    'input': openBagSchema,
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': shape }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
}) as const;

const validateCaseNode = <const TShape extends 'abort-options' | 'active-operation-state'>(shape: TShape) => SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': openBagNode,
    'input': openBagNode,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst(shape)
  },
  ['description', 'expected', 'input', 'name', 'shape'] as const,
  { 'additionalProperties': false }
);

const abortOptionsSchema = validateCaseSchema('abort-options');
const abortOptionsNode = validateCaseNode('abort-options');
const activeOperationStateSchema = validateCaseSchema('active-operation-state');
const activeOperationStateNode = validateCaseNode('active-operation-state');

const errorConstructorsSchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': {
        'aborted': {
          'additionalProperties': false,
          'properties': { 'code': { 'minLength': 1, 'type': 'string' }, 'message': { 'minLength': 1, 'type': 'string' }, 'timeoutMs': { 'type': 'number' } },
          'required': ['code', 'message', 'timeoutMs'],
          'type': 'object'
        },
        'draining': {
          'additionalProperties': false,
          'properties': { 'code': { 'minLength': 1, 'type': 'string' }, 'message': { 'minLength': 1, 'type': 'string' } },
          'required': ['code', 'message'],
          'type': 'object'
        }
      },
      'required': ['aborted', 'draining'],
      'type': 'object'
    },
    'input': {
      'additionalProperties': false,
      'properties': {
        'aborted': {
          'additionalProperties': false,
          'properties': { 'message': { 'minLength': 1, 'type': 'string' }, 'timeoutMs': { 'type': 'number' } },
          'required': ['message', 'timeoutMs'],
          'type': 'object'
        },
        'draining': {
          'additionalProperties': false,
          'properties': { 'message': { 'minLength': 1, 'type': 'string' } },
          'required': ['message'],
          'type': 'object'
        }
      },
      'required': ['aborted', 'draining'],
      'type': 'object'
    },
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'error-constructors' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

const errorConstructorsNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'aborted': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'code': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['code', 'message', 'timeoutMs'] as const,
          { 'additionalProperties': false }
        ),
        'draining': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'code': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) },
          ['code', 'message'] as const,
          { 'additionalProperties': false }
        )
      },
      ['aborted', 'draining'] as const,
      { 'additionalProperties': false }
    ),
    'input': SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'aborted': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const) },
          ['message', 'timeoutMs'] as const,
          { 'additionalProperties': false }
        ),
        'draining': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) },
          ['message'] as const,
          { 'additionalProperties': false }
        )
      },
      ['aborted', 'draining'] as const,
      { 'additionalProperties': false }
    ),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst('error-constructors' as const)
  },
  ['description', 'expected', 'input', 'name', 'shape'] as const,
  { 'additionalProperties': false }
);

/** The three scenario case shapes `entity-contracts.loop.spec.ts` exercises. */
export namespace EntityContractsScenarioCaseEntity {
  export const Schema = { 'oneOf': [abortOptionsSchema, activeOperationStateSchema, errorConstructorsSchema] } as const;

  export const Node = SchemaNode.defineOneOf([abortOptionsNode, activeOperationStateNode, errorConstructorsNode] as const);
  export type Type = NodeStaticType<typeof Node>;
}
