import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/**
 * The three scenario shapes `IdempotencyGuardConfig.loop.spec.ts` exercises: valid options
 * accepted, a range constraint (min/integer) violated by otherwise well-shaped options, and a
 * shape the `IdempotencyGuardOptionsEntity.InputType` itself forbids (missing/extra property).
 */
export namespace IdempotencyGuardConfigScenarioCaseEntity {
  const validOptionsSchema = {
    'additionalProperties': false,
    'properties': { 'capacity': { 'minimum': 1, 'type': 'integer' }, 'ttlMs': { 'minimum': 0, 'type': 'number' } },
    'required': ['capacity', 'ttlMs'],
    'type': 'object'
  } as const;
  const validOptionsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'capacity': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'ttlMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, ['capacity', 'ttlMs'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  /** Structurally matches `IdempotencyGuardOptionsEntity.InputType` — both keys present as numbers — but the numbers themselves violate `capacity`'s min/integer or `ttlMs`'s min constraint. */
  const rangeViolationOptionsSchema = {
    'additionalProperties': false,
    'properties': { 'capacity': { 'type': 'number' }, 'ttlMs': { 'type': 'number' } },
    'required': ['capacity', 'ttlMs'],
    'type': 'object'
  } as const;
  const rangeViolationOptionsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'capacity': SchemaNode.defineNumber({ 'type': 'number' } as const), 'ttlMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['capacity', 'ttlMs'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  /** Free-form — covers a shape `InputType` forbids at compile time (missing `capacity`/`ttlMs`, or an extra property). */
  const shapeViolationOptionsSchema = { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' } as const;
  const shapeViolationOptionsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} });

  const codeExpectedSchema = { 'additionalProperties': false, 'properties': { 'code': { 'minLength': 1, 'type': 'string' } }, 'required': ['code'], 'type': 'object' } as const;
  const codeExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'code': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['code'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const validExpectedSchema = { 'additionalProperties': false, 'properties': { 'valid': { 'const': false } }, 'required': ['valid'], 'type': 'object' } as const;
  const validExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'valid': SchemaNode.defineConst({}, false as const) }, ['valid'] as const, { 'additionalProperties': false, 'patternProperties': {} });

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
          'expected': codeExpectedSchema,
          'input': { 'additionalProperties': false, 'properties': { 'options': rangeViolationOptionsSchema }, 'required': ['options'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'rejects-range-violation' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': validExpectedSchema,
          'input': { 'additionalProperties': false, 'properties': { 'options': shapeViolationOptionsSchema }, 'required': ['options'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'rejects-shape-violation' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': validOptionsNode,
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'options': validOptionsNode }, ['options'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'accepts-valid-options' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': codeExpectedNode,
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'options': rangeViolationOptionsNode }, ['options'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'rejects-range-violation' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': validExpectedNode,
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'options': shapeViolationOptionsNode }, ['options'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'rejects-shape-violation' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
