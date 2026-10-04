import type { JsonValueEntity } from '@studnicky/json/entities';

import { SchemaNode } from '@studnicky/entity/types';

interface ScenarioJsonValueNodeSchemaInterface {
  readonly 'anyOf': readonly unknown[];
}

/** `$defs.ScenarioJsonValue` as a `SchemaNode`: the array/object branches `$reference` back to `self`, TypeBox `Type.Recursive`-style. */
export const ScenarioJsonValueNode = SchemaNode.defineRecursive<ScenarioJsonValueNodeSchemaInterface, JsonValueEntity.Type>((self) => {
  const built = SchemaNode.defineAnyOf({}, [
    SchemaNode.defineNull({ 'type': 'null' } as const),
    SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    SchemaNode.defineNumber({ 'type': 'number' } as const),
    SchemaNode.defineString({ 'type': 'string' } as const),
    SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineReference('#/$defs/ScenarioJsonValue', self), undefined),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [], { 'additionalProperties': SchemaNode.defineReference('#/$defs/ScenarioJsonValue', self), 'patternProperties': {} })
  ] as const);

  return built;
});
