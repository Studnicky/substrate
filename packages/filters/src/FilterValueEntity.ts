import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/**
 * The JSON-safe value domain declarative filter configuration uses.
 * It is bounded to five levels of array/object nesting because the schema
 * cannot derive an unbounded self-referential type.
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
  } as const;

  const leafBranches = [
    SchemaNode.defineString({ 'type': 'string' } as const),
    SchemaNode.defineNumber({ 'type': 'number' } as const),
    SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    SchemaNode.defineNull({ 'type': 'null' } as const)
  ] as const;
  const level1Node = SchemaNode.defineAnyOf([
    ...leafBranches,
    SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineAnyOf(leafBranches)),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineAnyOf(leafBranches) })
  ]);
  const level2Node = SchemaNode.defineAnyOf([
    ...leafBranches,
    SchemaNode.defineArray({ 'type': 'array' } as const, level1Node),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': level1Node })
  ]);
  const level3Node = SchemaNode.defineAnyOf([
    ...leafBranches,
    SchemaNode.defineArray({ 'type': 'array' } as const, level2Node),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': level2Node })
  ]);
  const level4Node = SchemaNode.defineAnyOf([
    ...leafBranches,
    SchemaNode.defineArray({ 'type': 'array' } as const, level3Node),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': level3Node })
  ]);

  export const Node = SchemaNode.defineAnyOf([
    ...leafBranches,
    SchemaNode.defineArray({ 'type': 'array' } as const, level4Node),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': level4Node })
  ]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
