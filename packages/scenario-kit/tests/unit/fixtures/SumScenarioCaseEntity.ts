import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** A single-shape case, no discriminant field — the `{description, expected, input, name}` pattern common across the fixture corpus. */
export namespace SumScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'sum': { 'type': 'number' } },
        'required': ['sum'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'a': { 'type': 'number' }, 'b': { 'type': 'number' } },
        'required': ['a', 'b'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['description', 'expected', 'input', 'name'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'sum': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['sum'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'a': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'b': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['a', 'b'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    }, ['description', 'expected', 'input', 'name'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
}
