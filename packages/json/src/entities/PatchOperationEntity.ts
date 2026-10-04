import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { JsonValueNode } from '../schema/JsonValueNode.js';
import { JsonValueSchema } from '../schema/JsonValueSchema.js';

/** One fully specified RFC-6902 operation with the operands its opcode requires. */
export namespace PatchOperationEntity {
  // The shared schema declares the allowed operation fields once; `allOf` expresses opcode-specific constraints.
  export const Schema = {
    ...JsonValueSchema,
    'additionalProperties': false,
    'allOf': [
      { 'anyOf': [{ 'not': { 'properties': { 'op': { 'const': 'add' } } } }, { 'not': { 'properties': { 'from': {} }, 'required': ['from'] }, 'properties': { 'value': {} }, 'required': ['value'] }] },
      { 'anyOf': [{ 'not': { 'properties': { 'op': { 'const': 'replace' } } } }, { 'not': { 'properties': { 'from': {} }, 'required': ['from'] }, 'properties': { 'value': {} }, 'required': ['value'] }] },
      { 'anyOf': [{ 'not': { 'properties': { 'op': { 'const': 'test' } } } }, { 'not': { 'properties': { 'from': {} }, 'required': ['from'] }, 'properties': { 'value': {} }, 'required': ['value'] }] },
      {
        'anyOf': [
          { 'not': { 'properties': { 'op': { 'const': 'remove' } } } },
          {
            'not': {
              'anyOf': [
                { 'properties': { 'from': {} }, 'required': ['from'] },
                { 'properties': { 'value': {} }, 'required': ['value'] }
              ]
            }
          }
        ]
      },
      { 'anyOf': [{ 'not': { 'properties': { 'op': { 'const': 'copy' } } } }, { 'not': { 'properties': { 'value': {} }, 'required': ['value'] }, 'properties': { 'from': {} }, 'required': ['from'] }] },
      { 'anyOf': [{ 'not': { 'properties': { 'op': { 'const': 'move' } } } }, { 'not': { 'properties': { 'value': {} }, 'required': ['value'] }, 'properties': { 'from': {} }, 'required': ['from'] }] }
    ],
    'properties': {
      'from': { 'type': 'string' },
      'op': { 'enum': ['add', 'copy', 'move', 'remove', 'replace', 'test'] },
      'path': { 'type': 'string' },
      'value': { '$ref': '#/$defs/JsonValue' }
    },
    'required': ['op', 'path'],
    'title': 'PatchOperation',
    'type': 'object'
  } as const;

  // Each branch restates every field it needs (no sibling-schema defineAnyOf overload —
  // its static type is InferUnionOfStaticType alone, with no path to intersect a sibling).
  export const Node = SchemaNode.defineAnyOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'op': SchemaNode.defineConst({}, 'add' as const),
      'path': SchemaNode.defineString({ 'type': 'string' } as const),
      'value': SchemaNode.defineReference('#/$defs/JsonValue', JsonValueNode)
    }, ['op', 'path', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'from': SchemaNode.defineString({ 'type': 'string' } as const),
      'op': SchemaNode.defineConst({}, 'copy' as const),
      'path': SchemaNode.defineString({ 'type': 'string' } as const)
    }, ['from', 'op', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'from': SchemaNode.defineString({ 'type': 'string' } as const),
      'op': SchemaNode.defineConst({}, 'move' as const),
      'path': SchemaNode.defineString({ 'type': 'string' } as const)
    }, ['from', 'op', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'op': SchemaNode.defineConst({}, 'remove' as const),
      'path': SchemaNode.defineString({ 'type': 'string' } as const)
    }, ['op', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'op': SchemaNode.defineConst({}, 'replace' as const),
      'path': SchemaNode.defineString({ 'type': 'string' } as const),
      'value': SchemaNode.defineReference('#/$defs/JsonValue', JsonValueNode)
    }, ['op', 'path', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'op': SchemaNode.defineConst({}, 'test' as const),
      'path': SchemaNode.defineString({ 'type': 'string' } as const),
      'value': SchemaNode.defineReference('#/$defs/JsonValue', JsonValueNode)
    }, ['op', 'path', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
