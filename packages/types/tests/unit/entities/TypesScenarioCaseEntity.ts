import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

const descriptionSchema = { 'minLength': 1, 'type': 'string' } as const;
const descriptionNode = SchemaNode.defineString(descriptionSchema);

/** Builds the `{ description, input?, name, outcome, shape }` envelope each branch shares; `input` and `outcome` are opaque runtime fixtures interpreted by the scenario's runner. */
class TypesScenarioBranchBuilders {
  static branchSchema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': descriptionSchema,
        'input': {},
        'name': descriptionSchema,
        'outcome': {},
        'shape': { 'const': shape }
      },
      'required': ['description', 'name', 'outcome', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static branchNode<const TShape extends string>(shape: TShape) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': descriptionNode,
      'input': SchemaNode.defineUnknown({}),
      'name': descriptionNode,
      'outcome': SchemaNode.defineUnknown({}),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'name', 'outcome', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** Every predicate and guard family `types.loop.spec.ts` drives from `types.scenarios.json`, discriminated by the `shape` const field. */
export namespace TypesScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      TypesScenarioBranchBuilders.branchSchema('asNumber'),
      TypesScenarioBranchBuilders.branchSchema('asStringOrNull'),
      TypesScenarioBranchBuilders.branchSchema('asRecordArray'),
      TypesScenarioBranchBuilders.branchSchema('isString'),
      TypesScenarioBranchBuilders.branchSchema('isNumber'),
      TypesScenarioBranchBuilders.branchSchema('isBoolean'),
      TypesScenarioBranchBuilders.branchSchema('isFunction'),
      TypesScenarioBranchBuilders.branchSchema('isObject'),
      TypesScenarioBranchBuilders.branchSchema('isNonNegativeInteger'),
      TypesScenarioBranchBuilders.branchSchema('isPositiveInteger'),
      TypesScenarioBranchBuilders.branchSchema('isArray'),
      TypesScenarioBranchBuilders.branchSchema('isDate'),
      TypesScenarioBranchBuilders.branchSchema('isError'),
      TypesScenarioBranchBuilders.branchSchema('isMap'),
      TypesScenarioBranchBuilders.branchSchema('isSet'),
      TypesScenarioBranchBuilders.branchSchema('isObjectLike'),
      TypesScenarioBranchBuilders.branchSchema('isRecord'),
      TypesScenarioBranchBuilders.branchSchema('isPlainObject'),
      TypesScenarioBranchBuilders.branchSchema('isNullish'),
      TypesScenarioBranchBuilders.branchSchema('isRegExp'),
      TypesScenarioBranchBuilders.branchSchema('isSymbol'),
      TypesScenarioBranchBuilders.branchSchema('isBigInt'),
      TypesScenarioBranchBuilders.branchSchema('isThenable'),
      TypesScenarioBranchBuilders.branchSchema('isIterable'),
      TypesScenarioBranchBuilders.branchSchema('isAsyncIterable'),
      TypesScenarioBranchBuilders.branchSchema('isArrayBufferView'),
      TypesScenarioBranchBuilders.branchSchema('isBlob'),
      TypesScenarioBranchBuilders.branchSchema('isFormData'),
      TypesScenarioBranchBuilders.branchSchema('isURL'),
      TypesScenarioBranchBuilders.branchSchema('isURLSearchParams'),
      TypesScenarioBranchBuilders.branchSchema('isHeaders'),
      TypesScenarioBranchBuilders.branchSchema('isRequest'),
      TypesScenarioBranchBuilders.branchSchema('isResponse'),
      TypesScenarioBranchBuilders.branchSchema('isAbortSignal'),
      TypesScenarioBranchBuilders.branchSchema('isReadableStream'),
      TypesScenarioBranchBuilders.branchSchema('empty-string'),
      TypesScenarioBranchBuilders.branchSchema('empty-object'),
      TypesScenarioBranchBuilders.branchSchema('empty-objectIdentity'),
      TypesScenarioBranchBuilders.branchSchema('empty-array'),
      TypesScenarioBranchBuilders.branchSchema('empty-arrayIdentity'),
      TypesScenarioBranchBuilders.branchSchema('empty-map'),
      TypesScenarioBranchBuilders.branchSchema('empty-mapIdentity'),
      TypesScenarioBranchBuilders.branchSchema('empty-set'),
      TypesScenarioBranchBuilders.branchSchema('empty-setIdentity'),
      TypesScenarioBranchBuilders.branchSchema('empty-isString'),
      TypesScenarioBranchBuilders.branchSchema('empty-isObject'),
      TypesScenarioBranchBuilders.branchSchema('empty-isArray'),
      TypesScenarioBranchBuilders.branchSchema('empty-isMap'),
      TypesScenarioBranchBuilders.branchSchema('empty-isSet'),
      TypesScenarioBranchBuilders.branchSchema('jsonObject-is'),
      TypesScenarioBranchBuilders.branchSchema('jsonObject-fromEntries'),
      TypesScenarioBranchBuilders.branchSchema('jsonObject-write'),
      TypesScenarioBranchBuilders.branchSchema('jsonValue-is'),
      TypesScenarioBranchBuilders.branchSchema('jsonValue-from')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    TypesScenarioBranchBuilders.branchNode('asNumber'),
    TypesScenarioBranchBuilders.branchNode('asStringOrNull'),
    TypesScenarioBranchBuilders.branchNode('asRecordArray'),
    TypesScenarioBranchBuilders.branchNode('isString'),
    TypesScenarioBranchBuilders.branchNode('isNumber'),
    TypesScenarioBranchBuilders.branchNode('isBoolean'),
    TypesScenarioBranchBuilders.branchNode('isFunction'),
    TypesScenarioBranchBuilders.branchNode('isObject'),
    TypesScenarioBranchBuilders.branchNode('isNonNegativeInteger'),
    TypesScenarioBranchBuilders.branchNode('isPositiveInteger'),
    TypesScenarioBranchBuilders.branchNode('isArray'),
    TypesScenarioBranchBuilders.branchNode('isDate'),
    TypesScenarioBranchBuilders.branchNode('isError'),
    TypesScenarioBranchBuilders.branchNode('isMap'),
    TypesScenarioBranchBuilders.branchNode('isSet'),
    TypesScenarioBranchBuilders.branchNode('isObjectLike'),
    TypesScenarioBranchBuilders.branchNode('isRecord'),
    TypesScenarioBranchBuilders.branchNode('isPlainObject'),
    TypesScenarioBranchBuilders.branchNode('isNullish'),
    TypesScenarioBranchBuilders.branchNode('isRegExp'),
    TypesScenarioBranchBuilders.branchNode('isSymbol'),
    TypesScenarioBranchBuilders.branchNode('isBigInt'),
    TypesScenarioBranchBuilders.branchNode('isThenable'),
    TypesScenarioBranchBuilders.branchNode('isIterable'),
    TypesScenarioBranchBuilders.branchNode('isAsyncIterable'),
    TypesScenarioBranchBuilders.branchNode('isArrayBufferView'),
    TypesScenarioBranchBuilders.branchNode('isBlob'),
    TypesScenarioBranchBuilders.branchNode('isFormData'),
    TypesScenarioBranchBuilders.branchNode('isURL'),
    TypesScenarioBranchBuilders.branchNode('isURLSearchParams'),
    TypesScenarioBranchBuilders.branchNode('isHeaders'),
    TypesScenarioBranchBuilders.branchNode('isRequest'),
    TypesScenarioBranchBuilders.branchNode('isResponse'),
    TypesScenarioBranchBuilders.branchNode('isAbortSignal'),
    TypesScenarioBranchBuilders.branchNode('isReadableStream'),
    TypesScenarioBranchBuilders.branchNode('empty-string'),
    TypesScenarioBranchBuilders.branchNode('empty-object'),
    TypesScenarioBranchBuilders.branchNode('empty-objectIdentity'),
    TypesScenarioBranchBuilders.branchNode('empty-array'),
    TypesScenarioBranchBuilders.branchNode('empty-arrayIdentity'),
    TypesScenarioBranchBuilders.branchNode('empty-map'),
    TypesScenarioBranchBuilders.branchNode('empty-mapIdentity'),
    TypesScenarioBranchBuilders.branchNode('empty-set'),
    TypesScenarioBranchBuilders.branchNode('empty-setIdentity'),
    TypesScenarioBranchBuilders.branchNode('empty-isString'),
    TypesScenarioBranchBuilders.branchNode('empty-isObject'),
    TypesScenarioBranchBuilders.branchNode('empty-isArray'),
    TypesScenarioBranchBuilders.branchNode('empty-isMap'),
    TypesScenarioBranchBuilders.branchNode('empty-isSet'),
    TypesScenarioBranchBuilders.branchNode('jsonObject-is'),
    TypesScenarioBranchBuilders.branchNode('jsonObject-fromEntries'),
    TypesScenarioBranchBuilders.branchNode('jsonObject-write'),
    TypesScenarioBranchBuilders.branchNode('jsonValue-is'),
    TypesScenarioBranchBuilders.branchNode('jsonValue-from')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
