import { JsonValue } from '@studnicky/types/node';

/** Ajv schema keyword that admits only finite, acyclic plain JSON data. */
export const PLAIN_JSON_VALUE_KEYWORD = {
  'keyword': 'plainJsonValue',
  'schemaType': 'boolean',
  'validate': (enabled: boolean, value: object): boolean => {
    const result = !enabled || JsonValue.is(value);
    return result;
  }
} as const;
