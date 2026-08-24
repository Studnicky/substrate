import type { JSONSchema7Type } from 'json-schema';
import type { FromSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '../schema/SchemaValidator.js';

/** One fully specified RFC-6902 operation with the operands its opcode requires. */
export namespace PatchOperationEntity {
  // The structural shape (properties/types/`additionalProperties: false`) is ONE flat schema, not
  // a `oneOf` of per-`op` branches: verified empirically that Ajv's `removeAdditional` (which
  // `SchemaValidator.compileIntake` enables globally for coercion) does not compose correctly with
  // `oneOf` OR with a conditional branch that itself redeclares `properties`/`additionalProperties`
  // — either shape silently corrupted valid input into `{}` before the matching branch's own
  // `required` check ever ran. The per-`op` requiredness and exclusivity (`add` needs `value` and
  // must not carry `from`; `remove` may carry neither; etc.) is instead expressed as `allOf` of
  // `anyOf`/`not` pairs — the classical `if A then B` ≡ `(not A) or B` rewrite — that carry only
  // `required`/`not`/`properties` markers naming a key with an EMPTY schema (never a real
  // `properties`/`additionalProperties` redeclaration) — confirmed empirically NOT to trigger the
  // corruption, because there is nothing in the conditional branches for `removeAdditional` to
  // disagree with the single flat schema about. This also keeps the schema free of a literal
  // `then` key, which `unicorn/no-thenable` otherwise (harmlessly, but noisily) mistakes for a
  // thenable object property.
  export const Schema = {
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
      'value': {
        'additionalProperties': {},
        'items': {},
        'plainJsonValue': true,
        'type': ['array', 'boolean', 'null', 'number', 'object', 'string']
      }
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

  export const validate = SchemaValidator.compile<Type>(Schema);
  export const intake = SchemaValidator.compileIntake<Type>(Schema);
  export const create = SchemaValidator.compileCreate<Type>(Schema);
}
