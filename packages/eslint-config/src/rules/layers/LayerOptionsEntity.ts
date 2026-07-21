import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

export namespace LayerOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'aliasPrefixes': {
        'additionalProperties': { 'type': 'string' },
        'description': 'Map of path-alias prefixes (e.g. "@domain/") to their layer name.',
        'type': 'object'
      },
      'allowedImports': {
        'additionalProperties': {
          'items': { 'type': 'string' },
          'type': 'array'
        },
        'description': 'Override of the default allow-matrix: source layer name -> list of layers it may import from.',
        'type': 'object'
      },
      'layers': {
        'description': 'Ordered list of enforced layer names, e.g. ["domain", "ports", "application", "adapters", "infrastructure"].',
        'items': { 'type': 'string' },
        'type': 'array'
      },
      'sourceRoot': {
        'description': 'Path segment(s) after which the layer name appears, e.g. "src".',
        'type': 'string'
      }
    },
    'required': ['layers', 'sourceRoot'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  function isStringArray(value: unknown): boolean {
    if (!Array.isArray(value)) { return false; }

    const length = value.length;
    for (let index = 0; index < length; index += 1) {
      if (typeof value[index] !== 'string') { return false; }
    }
    return true;
  }

  function isStringRecord(value: unknown): boolean {
    if (!Guard.isObject(value)) { return false; }

    const keys = Object.keys(value);
    const length = keys.length;
    for (let index = 0; index < length; index += 1) {
      const key = keys[index];
      if (key === undefined || typeof value[key] !== 'string') { return false; }
    }
    return true;
  }

  function isStringArrayRecord(value: unknown): boolean {
    if (!Guard.isObject(value)) { return false; }

    const keys = Object.keys(value);
    const length = keys.length;
    for (let index = 0; index < length; index += 1) {
      const key = keys[index];
      if (key === undefined || !isStringArray(value[key])) { return false; }
    }
    return true;
  }

  export function validate(candidate: unknown): candidate is Type {
    if (!Guard.isObject(candidate)) { return false; }

    const aliasPrefixes = candidate.aliasPrefixes;
    const allowedImports = candidate.allowedImports;
    return isStringArray(candidate.layers)
      && typeof candidate.sourceRoot === 'string'
      && (aliasPrefixes === undefined || isStringRecord(aliasPrefixes))
      && (allowedImports === undefined || isStringArrayRecord(allowedImports));
  }
}
