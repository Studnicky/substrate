import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The two scenario shapes `IdempotencyGuardConfig.loop.spec.ts` exercises: valid options accepted, invalid options rejected. */
export namespace IdempotencyGuardConfigScenarioCaseEntity {
  const validOptionsSchema = {
    'additionalProperties': false,
    'properties': { 'capacity': { 'minimum': 1, 'type': 'integer' }, 'ttlMs': { 'minimum': 0, 'type': 'number' } },
    'required': ['capacity', 'ttlMs'],
    'type': 'object'
  } as const;

  const validOptionsNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'capacity': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'ttlMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) },
    ['capacity', 'ttlMs'] as const,
    { 'additionalProperties': false }
  );

  const invalidOptionsSchema = { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' } as const;
  const invalidOptionsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true });

  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': validOptionsSchema,
          'input': { 'additionalProperties': false, 'properties': { 'options': validOptionsSchema }, 'required': ['options'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'accepts-valid-options' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'code': { 'minLength': 1, 'type': 'string' } }, 'required': ['code'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'options': invalidOptionsSchema }, 'required': ['options'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'rejects-invalid-options' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf([
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': validOptionsNode,
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'options': validOptionsNode }, ['options'] as const, { 'additionalProperties': false }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('accepts-valid-options' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'code': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) },
          ['code'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'options': invalidOptionsNode }, ['options'] as const, { 'additionalProperties': false }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('rejects-invalid-options' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    )
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
