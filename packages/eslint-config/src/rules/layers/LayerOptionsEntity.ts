import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
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
        'description': 'Override of the default allow-matrix: source layer name -> list of layers it may import from.',
        'patternProperties': {
          '.*': {
            'items': { 'type': 'string' },
            'type': 'array'
          }
        },
        'type': 'object'
      },
      'bindings': {
        'description': 'Ordered list of matchers resolving a file path or an import specifier to a layer name -- folder, workspace package, internal module specifier, external dependency, or the Node builtin group. Evaluated in array order; the first binding whose unit applies to the resolution in progress and whose pattern matches wins. There is no implicit fallback: a folder-based project declares its own folder bindings the same as any other project declares its module or dependency bindings.',
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

  // `validate` remains a predicate for callers checking the shared base shape inside a wider
  // derived option object. It therefore accepts those legitimate supersets. `intake` is the
  // closed base parser and strips properties that this schema does not declare; derived rules
  // must compile their own intake from a schema that spreads these properties before adding its
  // stricter `additionalProperties: false`, so their rule-specific fields survive parsing.
  const LenientSchema = {
    ...Schema,
    'additionalProperties': true
  } as const satisfies JSONSchema;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(LenientSchema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
