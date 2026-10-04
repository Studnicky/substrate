import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/**
 * A platform API whose use throws or rejects with a native error, identified by the declaration the
 * checker resolves: `owner` is the interface, class, or module (without a `node:` prefix) that
 * declares the member, the empty string for a global declaration, or `*` for any owner.
 */
export namespace PlatformCallEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'kind': {
        'description': "How the API is used: 'call' for a function or method call, 'construct' for a `new` expression, 'read' for a property read, 'iterate' for a `for await` loop over a value of the named type.",
        'enum': ['call', 'construct', 'read', 'iterate']
      },
      'member': {
        'description': "Name of the function, method, constructed class, or property; '*' matches every member of the owner.",
        'type': 'string'
      },
      'owner': {
        'description': "Name of the interface, class, or module declaring the member; '' for a global declaration; '*' for any owner.",
        'type': 'string'
      },
      'safeWhenLiteral': {
        'default': 'never',
        'description': "Arguments that make a use safe when they are literals: 'never' reports every use; 'firstArgument' reports a non-literal first argument; 'everyArgument' reports any non-literal argument; 'soleArgument' reports a single non-literal argument; 'firstArgumentLength' reports an object-literal first argument whose `length` is not a numeric literal; 'always' exempts the member: it never throws, and it shadows later entries of the list.",
        'enum': ['never', 'firstArgument', 'everyArgument', 'soleArgument', 'firstArgumentLength', 'always']
      }
    },
    'required': ['kind', 'member', 'owner'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'kind': SchemaNode.defineEnum({
      'description': "How the API is used: 'call' for a function or method call, 'construct' for a `new` expression, 'read' for a property read, 'iterate' for a `for await` loop over a value of the named type."
    } as const, ['call', 'construct', 'read', 'iterate'] as const),
    'member': SchemaNode.defineString({
      'description': "Name of the function, method, constructed class, or property; '*' matches every member of the owner.",
      'type': 'string'
    } as const),
    'owner': SchemaNode.defineString({
      'description': "Name of the interface, class, or module declaring the member; '' for a global declaration; '*' for any owner.",
      'type': 'string'
    } as const),
    'safeWhenLiteral': SchemaNode.defineEnum({
      'default': 'never',
      'description': "Arguments that make a use safe when they are literals: 'never' reports every use; 'firstArgument' reports a non-literal first argument; 'everyArgument' reports any non-literal argument; 'soleArgument' reports a single non-literal argument; 'firstArgumentLength' reports an object-literal first argument whose `length` is not a numeric literal; 'always' exempts the member: it never throws, and it shadows later entries of the list."
    } as const, ['never', 'firstArgument', 'everyArgument', 'soleArgument', 'firstArgumentLength', 'always'] as const)
  }, ['kind', 'member', 'owner'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
