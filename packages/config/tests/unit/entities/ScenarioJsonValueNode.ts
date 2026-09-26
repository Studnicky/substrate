import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';

import { SchemaNode } from '@studnicky/entity/types';

/** Finite, acyclic JSON data read out of a test fixture file — null/boolean/number/string/array/record, recursively. */
export type ScenarioJsonValue =
  | null
  | number
  | boolean
  | string
  | readonly ScenarioJsonValue[]
  | { readonly [key: string]: ScenarioJsonValue };

export interface ScenarioJsonValueSchemaInterface {
  readonly 'anyOf': readonly unknown[];
}

/** Self-contained recursive node (no cross-package `JSONSchema7` reference) so entities that embed it stay declaration-emit portable. */
export const ScenarioJsonValueNode: SchemaNodeInterface<ScenarioJsonValueSchemaInterface, ScenarioJsonValue> = SchemaNode.defineRecursive<
  ScenarioJsonValueSchemaInterface, ScenarioJsonValue
>((self) => {
  const built = SchemaNode.defineAnyOf([
    SchemaNode.defineNull({ 'type': 'null' } as const),
    SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    SchemaNode.defineNumber({ 'type': 'number' } as const),
    SchemaNode.defineString({ 'type': 'string' } as const),
    SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineReference('#/$defs/ScenarioJsonValue', self)),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [], { 'additionalProperties': SchemaNode.defineReference('#/$defs/ScenarioJsonValue', self) })
  ] as const);

  return built;
});

/** Raw JSON Schema `$defs` entry matching `ScenarioJsonValueNode`, spread into a caller's own `Schema` root. */
export const ScenarioJsonValueSchemaDefs = {
  'ScenarioJsonValue': {
    'anyOf': [
      { 'type': 'null' },
      { 'type': 'boolean' },
      { 'type': 'number' },
      { 'type': 'string' },
      { 'items': { '$ref': '#/$defs/ScenarioJsonValue' }, 'type': 'array' },
      { 'additionalProperties': { '$ref': '#/$defs/ScenarioJsonValue' }, 'type': 'object' }
    ]
  }
} as const;
