import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { LayerBindingEntity } from '../layers/LayerBindingEntity.js';

/**
 * A matcher for a file permitted to resolve a closed-vocabulary token into an implementation
 * — a composition root. Reuses the layer-binding matcher vocabulary without its `layer`: the
 * question here is binary, so there is no name to resolve to.
 */
export namespace ResolutionSiteEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'pattern': LayerBindingEntity.Schema.properties.pattern,
      'unit': LayerBindingEntity.Schema.properties.unit
    },
    'required': ['unit'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'pattern': SchemaNode.defineString({
      'description': "The path segment (folder/package) or specifier prefix (module/dependency) to match. Unused, and omissible, for unit 'builtin'.",
      'type': 'string'
    } as const),
    'unit': SchemaNode.defineEnum({}, ['folder', 'package', 'module', 'dependency', 'builtin'] as const)
  }, ['unit'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
