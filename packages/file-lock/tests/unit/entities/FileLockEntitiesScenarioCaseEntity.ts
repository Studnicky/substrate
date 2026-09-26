import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const ENTITY_NAMES = ['FileLockOptionsEntity', 'FileLockPathStateEntity'] as const;

const SHAPES = [
  'reject-empty-path', 'reject-incomplete-path-state', 'reject-non-positive-pollMs',
  'reject-non-positive-timeoutMs', 'reject-unexpected-property', 'valid-entities'
] as const;

/** `value` is deliberately heterogeneous per row — some rows are valid entity literals, some are malformed on purpose — so it stays `unknown`, never a fabricated concrete shape. */
const validationSchema = {
  'additionalProperties': false,
  'properties': { 'entity': { 'enum': ENTITY_NAMES }, 'expected': { 'type': 'boolean' }, 'value': {} },
  'required': ['entity', 'expected', 'value'],
  'type': 'object'
} as const;

const ValidationNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'entity': SchemaNode.defineEnum(ENTITY_NAMES), 'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'value': SchemaNode.defineUnknown({} as const) },
  ['entity', 'expected', 'value'] as const,
  { 'additionalProperties': false }
);

/** The single `entities.loop.spec.ts` scenario shape. */
export namespace FileLockEntitiesScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' } },
        'required': ['validationResults'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'validations': { 'items': validationSchema, 'type': 'array' } },
        'required': ['validations'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': SHAPES }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'validationResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const)) },
        ['validationResults'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'validations': SchemaNode.defineArray({ 'type': 'array' } as const, ValidationNode) },
        ['validations'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(SHAPES)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
