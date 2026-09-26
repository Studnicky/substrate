import type { NodeStaticType } from '@studnicky/entity/types';

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
}
