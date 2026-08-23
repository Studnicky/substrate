import type { ValidateFunction } from 'ajv';
import type {
  FromSchema, JSONSchema
} from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { LayerBindingEntity } from './LayerBindingEntity.js';

export namespace LayerOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'allowedImports': {
        'additionalProperties': {
          'items': { 'type': 'string' },
          'type': 'array'
        },
        'description': 'Override of the default allow-matrix: source layer name -> list of layers it may import from.',
        'type': 'object'
      },
      'bindings': {
        'description': 'Ordered list of matchers resolving a file path or an import specifier to a layer name -- folder, workspace package, internal module specifier, external dependency, or the Node builtin group. Evaluated in array order; the first binding whose kind applies to the resolution in progress and whose pattern matches wins. There is no implicit fallback: a folder-based project declares its own folder bindings the same as any other project declares its module or dependency bindings.',
        'items': LayerBindingEntity.Schema,
        'type': 'array'
      },
      'layers': {
        'description': 'Ordered list of enforced layer names, e.g. ["domain", "ports", "application", "adapters", "infrastructure"].',
        'items': { 'type': 'string' },
        'type': 'array'
      },
      'sourceRoot': {
        'description': 'Path segment(s) after which a folder/package binding\'s candidate segment appears, e.g. "src" or "packages".',
        'type': 'string'
      }
    },
    'required': [
      'bindings',
      'layers',
      'sourceRoot'
    ],
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
