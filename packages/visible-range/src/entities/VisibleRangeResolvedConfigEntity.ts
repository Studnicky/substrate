import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace VisibleRangeResolvedConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'count': { 'minimum': 0, 'type': 'integer' },
      'itemSize': { 'exclusiveMinimum': 0, 'type': 'number' },
      'mode': { 'enum': ['fixed', 'variable'], 'type': 'string' },
      'overscan': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['count', 'mode', 'overscan'],
    'type': 'object'
  } as const;

  /** Serializable state retained after visible-range configuration resolves. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'count': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'itemSize': SchemaNode.defineNumber({ 'exclusiveMinimum': 0, 'type': 'number' } as const), 'mode': SchemaNode.defineEnum({}, ['fixed', 'variable'] as const), 'overscan': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const) }, ['count', 'mode', 'overscan'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
