import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { RetryClassifierDescriptorEntity } from './RetryClassifierDescriptorEntity.js';

/** A serializable `RetryConfigInterface` fixture; `materializeRetryConfig` turns the classifier descriptor into a real function. */
export namespace RetryConfigDescriptorEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'errorClassifier': RetryClassifierDescriptorEntity.Schema,
      'maximumRetries': { 'type': 'number' }
    },
    'required': [],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'errorClassifier': RetryClassifierDescriptorEntity.Node,
    'maximumRetries': SchemaNode.defineNumber({ 'type': 'number' } as const)
  }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
