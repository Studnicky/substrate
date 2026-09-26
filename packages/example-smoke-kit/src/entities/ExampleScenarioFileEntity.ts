import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { ExampleScenarioEntity } from './ExampleScenarioEntity.js';

/** The `{ cases: [...] }` shape every `examples.scenarios.json` file carries. */
export namespace ExampleScenarioFileEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'cases': { 'items': ExampleScenarioEntity.Schema, 'type': 'array' }
    },
    'required': ['cases'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cases': SchemaNode.defineArray({ 'type': 'array' } as const, ExampleScenarioEntity.Node, undefined) }, ['cases'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
