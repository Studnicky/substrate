import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{errorMessage}` expected shape for the `AsyncIter.loop.spec.ts` error-propagation case. */
export namespace ErrorMessageExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'errorMessage': { 'minLength': 1, 'type': 'string' } },
    'required': ['errorMessage'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) },
    ['errorMessage'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
