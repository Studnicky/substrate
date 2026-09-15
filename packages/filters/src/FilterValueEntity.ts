import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/**
 * The JSON-safe value domain declarative filter configuration uses.
 * It is bounded to five levels of array/object nesting because json-schema-to-ts
 * cannot derive an unbounded self-referential schema.
 */
export namespace FilterValueEntity {
  const leaf = {
    'anyOf': [{ 'type': 'string' }, { 'type': 'number' }, { 'type': 'boolean' }, { 'type': 'null' }]
  } as const;
  const level1 = {
    'anyOf': [
      ...leaf.anyOf,
      { 'items': leaf, 'type': 'array' },
      { 'additionalProperties': leaf, 'type': 'object' }
    ]
  } as const;
  const level2 = {
    'anyOf': [
      ...leaf.anyOf,
      { 'items': level1, 'type': 'array' },
      { 'additionalProperties': level1, 'type': 'object' }
    ]
  } as const;
  const level3 = {
    'anyOf': [
      ...leaf.anyOf,
      { 'items': level2, 'type': 'array' },
      { 'additionalProperties': level2, 'type': 'object' }
    ]
  } as const;
  const level4 = {
    'anyOf': [
      ...leaf.anyOf,
      { 'items': level3, 'type': 'array' },
      { 'additionalProperties': level3, 'type': 'object' }
    ]
  } as const;

  export const Schema = {
    'anyOf': [
      ...leaf.anyOf,
      { 'items': level4, 'type': 'array' },
      { 'additionalProperties': level4, 'type': 'object' }
    ]
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
