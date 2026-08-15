import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

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

  // `validate` is called at runtime not only on options shaped exactly like `Type`, but also on
  // wider option objects declared by rules that extend this base shape with their own additional
  // properties (e.g. `AdapterOnlyImportOptionsEntity`, `DomainPurityOptionsEntity`) — those rules
  // spread `LayerOptionsEntity.Schema` into their OWN stricter `additionalProperties: false`
  // schema for their public ESLint options declaration, then narrow further with
  // `LayerOptionsEntity.validate` purely to confirm the shared base shape is present. Compiling
  // `Schema` (with its `additionalProperties: false`) directly here would reject every one of
  // those legitimate supersets, so `validate` is compiled from a lenient variant that only checks
  // the base shape's own properties/required fields and tolerates unrelated extras.
  const LenientSchema = {
    ...Schema,
    'additionalProperties': true
  } as const satisfies JSONSchema;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(LenientSchema);
}
