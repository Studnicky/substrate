import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const SCENARIO_SHAPES = ['code-value', 'empty-message', 'exit-code', 'instance-check', 'json-code', 'name-value', 'not-retryable'] as const;

const omittedTagSchema = {
  'additionalProperties': false,
  'properties': { '__shape': { 'const': 'undefined' } },
  'required': ['__shape'],
  'type': 'object'
} as const;

const omittedTagNode = SchemaNode.defineObject({ 'type': 'object' } as const, { '__shape': SchemaNode.defineConst({}, 'undefined' as const) }, ['__shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const exitCodeInputSchema = {
  'additionalProperties': false,
  'properties': { 'exitCode': { 'oneOf': [{ 'type': 'number' }, omittedTagSchema] } },
  'required': ['exitCode'],
  'type': 'object'
} as const;

const exitCodeInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'exitCode': SchemaNode.defineOneOf({}, [SchemaNode.defineNumber({ 'type': 'number' } as const), omittedTagNode]) }, ['exitCode'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** The scenario case shape `cli-exit-error.loop.spec.ts` exercises across CliExitError's own contract. */
export namespace CliExitErrorScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'code': { 'type': 'string' },
          'exitCode': { 'type': 'number' },
          'instanceOf': { 'items': { 'type': 'string' }, 'type': 'array' },
          'message': { 'type': 'string' },
          'name': { 'type': 'string' },
          'retryable': { 'type': 'boolean' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'code': { 'type': 'string' },
          'error': exitCodeInputSchema,
          'instanceOf': { 'items': { 'type': 'string' }, 'type': 'array' },
          'message': { 'type': 'string' },
          'name': { 'type': 'string' },
          'retryable': { 'type': 'boolean' }
        },
        'required': [],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': SCENARIO_SHAPES }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'code': SchemaNode.defineString({ 'type': 'string' } as const),
          'exitCode': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'instanceOf': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'message': SchemaNode.defineString({ 'type': 'string' } as const),
          'name': SchemaNode.defineString({ 'type': 'string' } as const),
          'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'code': SchemaNode.defineString({ 'type': 'string' } as const),
          'error': exitCodeInputNode,
          'instanceOf': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'message': SchemaNode.defineString({ 'type': 'string' } as const),
          'name': SchemaNode.defineString({ 'type': 'string' } as const),
          'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, SCENARIO_SHAPES)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
