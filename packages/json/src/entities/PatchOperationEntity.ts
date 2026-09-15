import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { JSONSchema7Type } from 'json-schema';
import type { FromSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

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

  export type Type = FromSchema<
    typeof Schema,
    {
      'deserialize': [{
        'output':
          | { 'op': 'add'; 'path': string; 'value': JSONSchema7Type }
          | { 'from': string; 'op': 'copy'; 'path': string }
          | { 'from': string; 'op': 'move'; 'path': string }
          | { 'op': 'remove'; 'path': string }
          | { 'op': 'replace'; 'path': string; 'value': JSONSchema7Type }
          | { 'op': 'test'; 'path': string; 'value': JSONSchema7Type };
        'pattern': { 'title': 'PatchOperation' };
      }]
    }
  >;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
