import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BoundedJsonValueEntity } from '../../helpers/entities/BoundedJsonValueEntity.js';

/** The `undici-config-merge.loop.spec.ts` scenario case shape. */
export namespace UndiciConfigMergeScenarioCaseEntity {
  const operations = ['create-client', 'create-dispatcher', 'defaults', 'validate-dispatcher'] as const;
  const outcomeShapes = ['defaults', 'dispatcher', 'fetch-client', 'ok', 'throws'] as const;

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'messageIncludes': { 'items': { 'minLength': 1, 'type': 'string' }, 'type': 'array' },
          'shape': { 'enum': outcomeShapes },
          'values': { 'additionalProperties': BoundedJsonValueEntity.Schema, 'properties': {}, 'required': [], 'type': 'object' }
        },
        'required': ['shape'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'dispatcher': { 'additionalProperties': BoundedJsonValueEntity.Schema, 'properties': {}, 'required': [], 'type': 'object' },
          'fetchClient': { 'additionalProperties': BoundedJsonValueEntity.Schema, 'properties': {}, 'required': [], 'type': 'object' }
        },
        'required': [],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'operation': { 'enum': operations }
    },
    'required': ['description', 'expected', 'input', 'name', 'operation'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'messageIncludes': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), undefined),
          'shape': SchemaNode.defineEnum({}, outcomeShapes),
          'values': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': BoundedJsonValueEntity.Node, 'patternProperties': {} })
        }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'dispatcher': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': BoundedJsonValueEntity.Node, 'patternProperties': {} }),
          'fetchClient': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': BoundedJsonValueEntity.Node, 'patternProperties': {} })
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'operation': SchemaNode.defineEnum({}, operations)
    }, ['description', 'expected', 'input', 'name', 'operation'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
