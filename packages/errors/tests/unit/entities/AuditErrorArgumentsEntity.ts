import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The constructor input of the `AuditError` fixture `subclass-extension.loop.spec.ts` extends `BaseError` with. */
export namespace AuditErrorArgumentsEntity {
  export const Schema = {
    'properties': {
      'auditId': { 'type': 'string' },
      'message': { 'type': 'string' },
      'policy': { 'type': 'string' }
    },
    'required': ['auditId', 'message', 'policy'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'auditId': SchemaNode.defineString({ 'type': 'string' } as const),
    'message': SchemaNode.defineString({ 'type': 'string' } as const),
    'policy': SchemaNode.defineString({ 'type': 'string' } as const)
  }, ['auditId', 'message', 'policy'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
