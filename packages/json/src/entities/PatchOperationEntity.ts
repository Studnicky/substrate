import type { JSONSchema7Type } from 'json-schema';
import type { FromSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '../schema/SchemaValidator.js';

/** One fully specified RFC-6902 operation with the operands its opcode requires. */
export namespace PatchOperationEntity {
  export const Schema = {
    'additionalProperties': false,
    'oneOf': [
      { 'not': { 'properties': { 'from': {} }, 'required': ['from'] }, 'properties': { 'op': { 'const': 'add' }, 'path': {}, 'value': {} }, 'required': ['op', 'path', 'value'] },
      { 'not': { 'properties': { 'from': {} }, 'required': ['from'] }, 'properties': { 'op': { 'const': 'replace' }, 'path': {}, 'value': {} }, 'required': ['op', 'path', 'value'] },
      { 'not': { 'properties': { 'from': {} }, 'required': ['from'] }, 'properties': { 'op': { 'const': 'test' }, 'path': {}, 'value': {} }, 'required': ['op', 'path', 'value'] },
      {
        'not': {
          'anyOf': [
            { 'properties': { 'from': {} }, 'required': ['from'] },
            { 'properties': { 'value': {} }, 'required': ['value'] }
          ]
        },
        'properties': { 'op': { 'const': 'remove' }, 'path': {} },
        'required': ['op', 'path']
      },
      { 'not': { 'properties': { 'value': {} }, 'required': ['value'] }, 'properties': { 'from': {}, 'op': { 'const': 'copy' }, 'path': {} }, 'required': ['from', 'op', 'path'] },
      { 'not': { 'properties': { 'value': {} }, 'required': ['value'] }, 'properties': { 'from': {}, 'op': { 'const': 'move' }, 'path': {} }, 'required': ['from', 'op', 'path'] }
    ],
    'properties': {
      'from': { 'type': 'string' },
      'op': { 'enum': ['add', 'copy', 'move', 'remove', 'replace', 'test'] },
      'path': { 'type': 'string' },
      'value': {
        'anyOf': [
          { 'type': 'null' },
          { 'type': 'boolean' },
          { 'type': 'number' },
          { 'type': 'string' },
          { 'items': {}, 'plainJsonValue': true, 'type': 'array' },
          { 'additionalProperties': {}, 'plainJsonValue': true, 'type': 'object' }
        ],
        'plainJsonValue': true
      }
    },
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

  export const validate = SchemaValidator.compile<Type>(Schema);
  export const intake = SchemaValidator.compileIntake<Type>(Schema);
  export const create = SchemaValidator.compileCreate<Type>(Schema);
}
