import type { JSONSchema7 } from 'json-schema';

/** Reusable standard JSON Schema definitions for recursive JSON data. */
export const JsonValueSchema: { readonly '$defs': Readonly<Record<string, JSONSchema7>> } = {
  '$defs': {
    'JsonValue': {
      'anyOf': [
        { 'type': 'null' },
        { 'type': 'boolean' },
        { 'type': 'number' },
        { 'type': 'string' },
        { 'items': { '$ref': '#/$defs/JsonValue' }, 'type': 'array' },
        { 'additionalProperties': { '$ref': '#/$defs/JsonValue' }, 'type': 'object' }
      ]
    }
  }
};
