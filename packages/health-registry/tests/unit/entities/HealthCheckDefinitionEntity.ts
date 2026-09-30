import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** One health check a scenario registers: a fixed status, or an outcome (`throw`, `late-throw`, `timeout`) the check produces. */
export namespace HealthCheckDefinitionEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'delayMs': { 'type': 'number' },
      'metadata': { 'additionalProperties': { 'type': 'string' }, 'properties': {}, 'type': 'object' },
      'name': { 'type': 'string' },
      'outcome': { 'enum': ['healthy', 'late-throw', 'throw', 'timeout'], 'type': 'string' },
      'status': { 'enum': ['healthy', 'degraded', 'unhealthy'], 'type': 'string' },
      'timeoutMs': { 'type': 'number' }
    },
    'required': ['name'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'metadata': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineString({ 'type': 'string' } as const), 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'type': 'string' } as const),
    'outcome': SchemaNode.defineEnum({ 'type': 'string' } as const, ['healthy', 'late-throw', 'throw', 'timeout'] as const),
    'status': SchemaNode.defineEnum({ 'type': 'string' } as const, ['healthy', 'degraded', 'unhealthy'] as const),
    'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
  }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
