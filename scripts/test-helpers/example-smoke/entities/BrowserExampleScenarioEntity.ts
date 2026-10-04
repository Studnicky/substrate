import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** A smoke scenario for an example that correctly refuses to run outside a browser; asserts docs-playground registration instead of importing it. */
export namespace BrowserExampleScenarioEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'registeredInDocsPlayground': { 'const': true } },
        'required': ['registeredInDocsPlayground'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'file': { 'minLength': 1, 'type': 'string' } },
        'required': ['file'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'browser-example' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'registeredInDocsPlayground': SchemaNode.defineConst({}, true as const) }, ['registeredInDocsPlayground'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'file': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['file'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'browser-example' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
