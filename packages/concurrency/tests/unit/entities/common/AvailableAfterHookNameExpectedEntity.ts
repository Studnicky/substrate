import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{availableAfter, hookName}` expected shape shared by several `Semaphore.loop.spec.ts` throwing-hook cases. */
export namespace AvailableAfterHookNameExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'availableAfter': { 'type': 'number' }, 'hookName': { 'minLength': 1, 'type': 'string' } },
    'required': ['availableAfter', 'hookName'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'availableAfter': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'hookName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    }, ['availableAfter', 'hookName'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
