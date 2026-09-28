import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { LogStatusEntity } from '../../../src/entities/LogStatusEntity.js';

const nameSchema = { 'minLength': 1, 'type': 'string' } as const;
const nameNode = SchemaNode.defineString(nameSchema);
/** `LogStatusEntity.Node`'s own schema carries only `enum` (no `description`/`type`); this mirrors that flattened shape. */
const logStatusEnumSchema = { 'enum': LogStatusEntity.Schema.enum } as const;

const SHAPES = [
  'is-failure-false', 'is-failure-true', 'is-lifecycle-false', 'is-lifecycle-true', 'is-success-false', 'is-success-true',
  'status-categories-failure', 'status-categories-lifecycle', 'status-categories-retry', 'status-categories-success',
  'status-failure-values', 'status-lifecycle-values', 'status-retry-values', 'status-success-values'
] as const;

/** `LogStatus` scenario cases: every shape shares the `{values: LogStatusEntity.Type[]}` expected/input structure, discriminated by `shape`. */
export namespace LogStatusScenarioCaseEntity {
  const valuesSchema = {
    'additionalProperties': false,
    'properties': { 'values': { 'items': logStatusEnumSchema, 'type': 'array' } },
    'required': ['values'],
    'type': 'object'
  } as const;
  const valuesNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': SchemaNode.defineArray({ 'type': 'array' } as const, LogStatusEntity.Node, undefined) }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const emptyInputSchema = { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' } as const;
  const emptyInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': nameSchema,
      'expected': valuesSchema,
      'input': emptyInputSchema,
      'name': nameSchema,
      'shape': { 'enum': SHAPES }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': valuesNode,
      'input': emptyInputNode,
      'name': nameNode,
      'shape': SchemaNode.defineEnum({}, SHAPES)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
