import type { JSONSchema7Type } from 'json-schema';

import { SchemaNode } from '@studnicky/entity/types';

interface JsonValueNodeSchemaInterface {
  readonly 'anyOf': readonly unknown[];
}

/** `$defs.JsonValue` as a `SchemaNode`: the array/object branches `$reference` back to `self`, TypeBox `Type.Recursive`-style. */
export const JsonValueNode = SchemaNode.defineRecursive<JsonValueNodeSchemaInterface, JSONSchema7Type>((self) => {
  const built = SchemaNode.defineAnyOf([
    SchemaNode.defineNull({ 'type': 'null' } as const),
    SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    SchemaNode.defineNumber({ 'type': 'number' } as const),
    SchemaNode.defineString({ 'type': 'string' } as const),
    SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineReference('#/$defs/JsonValue', self)),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [], { 'additionalProperties': SchemaNode.defineReference('#/$defs/JsonValue', self) })
  ] as const);

  return built;
});
