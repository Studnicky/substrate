import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Compact rollup of deduplicated paths and keywords with a total error count. */
export namespace ValidationAggregateViewEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationAggregateView',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'count': { 'type': 'number' },
      'keywords': {
        'items': { 'type': 'string' },
        'type': 'array'
      },
      'paths': {
        'items': { 'type': 'string' },
        'type': 'array'
      }
    },
    'required': ['count', 'keywords', 'paths'],
    'title': 'ValidationAggregateView',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ValidationAggregateView', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ValidationAggregateView', 'type': 'object' } as const, { 'count': SchemaNode.defineNumber({ 'type': 'number' } as const), 'keywords': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined), 'paths': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['count', 'keywords', 'paths'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
