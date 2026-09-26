import type { JSONSchema7 } from 'json-schema';

import type { DefineObjectAdditionalOnlyOptionsInterface } from '../../interfaces/DefineObjectAdditionalOnlyOptionsInterface.js';
import type { DefineObjectOptionsInterface } from '../../interfaces/DefineObjectOptionsInterface.js';
import type { DefineObjectPatternOnlyOptionsInterface } from '../../interfaces/DefineObjectPatternOnlyOptionsInterface.js';
import type { ObjectSchemaShapeInterface } from '../../interfaces/ObjectSchemaShapeInterface.js';
import type { SchemaNodeInterface } from '../../interfaces/SchemaNodeInterface.js';
import type { IdentityType } from '../IdentityType.js';
import type { NodeInputType } from '../NodeInputType.js';
import type { NodeStaticType } from '../NodeStaticType.js';
import type { ApplyArrayConstraintBrandsType } from './ApplyArrayConstraintBrandsType.js';
import type { ApplyNumberConstraintBrandsType } from './ApplyNumberConstraintBrandsType.js';
import type { ApplyObjectConstraintBrandsType } from './ApplyObjectConstraintBrandsType.js';
import type { ApplyStringConstraintBrandsType } from './ApplyStringConstraintBrandsType.js';
import type { InferAdditionalPropertiesInputType } from './InferAdditionalPropertiesInputType.js';
import type { InferAdditionalPropertiesStaticType } from './InferAdditionalPropertiesStaticType.js';
import type { InferDefaultBearingKeysType } from './InferDefaultBearingKeysType.js';
import type { InferIntersectionOfInputType } from './InferIntersectionOfInputType.js';
import type { InferIntersectionOfStaticType } from './InferIntersectionOfStaticType.js';
import type { InferObjectPropertiesInputType } from './InferObjectPropertiesInputType.js';
import type { InferObjectPropertiesStaticType } from './InferObjectPropertiesStaticType.js';
import type { InferOpenPrefixTupleStaticType } from './InferOpenPrefixTupleStaticType.js';
import type { InferPatternPropertiesInputType } from './InferPatternPropertiesInputType.js';
import type { InferPatternPropertiesStaticType } from './InferPatternPropertiesStaticType.js';
import type { InferTupleInputType } from './InferTupleInputType.js';
import type { InferTupleStaticType } from './InferTupleStaticType.js';
import type { InferUnionOfInputType } from './InferUnionOfInputType.js';
import type { InferUnionOfStaticType } from './InferUnionOfStaticType.js';

/**
 * TypeBox-style node constructors: each builds a schema literal and its own
 * `static`/`input` types from already-built child nodes, one level at a time.
 * `static` is the validated, brand-carrying output type; `input` is the same
 * shape with no constraint brand, for describing not-yet-validated caller
 * data. No constructor recurses into a child's `schema` — every nested
 * derivation is an indexed read of that child's own precomputed `static`/`input`.
 *
 * @module
 */
export class SchemaNode {
  public static defineString<const TSchema extends Record<string, unknown>>(
    schema: TSchema
  ): SchemaNodeInterface<TSchema, ApplyStringConstraintBrandsType<TSchema>, string> {
    return { 'schema': schema };
  }

  public static defineNumber<const TSchema extends Record<string, unknown>>(
    schema: TSchema
  ): SchemaNodeInterface<TSchema, ApplyNumberConstraintBrandsType<TSchema>, number> {
    return { 'schema': schema };
  }

  public static defineBoolean<const TSchema extends Record<string, unknown>>(
    schema: TSchema
  ): SchemaNodeInterface<TSchema, boolean> {
    return { 'schema': schema };
  }

  public static defineNull<const TSchema extends Record<string, unknown>>(
    schema: TSchema
  ): SchemaNodeInterface<TSchema, null> {
    return { 'schema': schema };
  }

  public static defineConst<const TValue>(value: TValue): SchemaNodeInterface<{ readonly 'const': TValue }, TValue>;
  public static defineConst<const TSchema extends Record<string, unknown>, const TValue>(
    schema: TSchema,
    value: TValue
  ): SchemaNodeInterface<TSchema & { readonly 'const': TValue }, TValue>;
  public static defineConst<const TSchema extends Record<string, unknown>, const TValue>(
    ...argumentList: [value: TValue] | [schema: TSchema, value: TValue]
  ): SchemaNodeInterface<{ readonly 'const': TValue }, TValue> | SchemaNodeInterface<TSchema & { readonly 'const': TValue }, TValue> {
    if (argumentList.length === 2) {
      const [schema, value] = argumentList;

      return { 'schema': { ...schema, 'const': value } };
    }
    const [value] = argumentList;

    return { 'schema': { 'const': value } };
  }

  public static defineEnum<const TValues extends readonly unknown[]>(
    values: TValues
  ): SchemaNodeInterface<{ readonly 'enum': TValues }, TValues[number]>;
  public static defineEnum<const TSchema extends Record<string, unknown>, const TValues extends readonly unknown[]>(
    schema: TSchema,
    values: TValues
  ): SchemaNodeInterface<TSchema & { readonly 'enum': TValues }, TValues[number]>;
  public static defineEnum<const TSchema extends Record<string, unknown>, const TValues extends readonly unknown[]>(
    ...argumentList: [values: TValues] | [schema: TSchema, values: TValues]
  ): SchemaNodeInterface<{ readonly 'enum': TValues }, TValues[number]> | SchemaNodeInterface<TSchema & { readonly 'enum': TValues }, TValues[number]> {
    if (argumentList.length === 2) {
      const [schema, values] = argumentList;

      return { 'schema': { ...schema, 'enum': values } };
    }
    const [values] = argumentList;

    return { 'schema': { 'enum': values } };
  }

  /** An empty schema (`{}`) matches any JSON value — sound derivation is `unknown`, never `any`, which would silence every consumer's own checking. */
  public static defineUnknown<const TSchema extends Record<string, unknown>>(
    schema: TSchema
  ): SchemaNodeInterface<TSchema, unknown> {
    return { 'schema': schema };
  }

  public static defineTuple<const TSchema extends Record<string, unknown>, const TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>(
    schema: TSchema,
    prefixItems: TItems
  ): SchemaNodeInterface<
    TSchema & { 'prefixItems': TItems },
    ApplyArrayConstraintBrandsType<TSchema>
      & InferOpenPrefixTupleStaticType<
        InferTupleStaticType<TItems>,
        TSchema['minItems'] extends infer TMinimumItemsCount extends number ? TMinimumItemsCount : 0,
        TSchema['items'] extends false ? true : TSchema['maxItems'] extends TItems['length'] ? true : false
      >,
    InferOpenPrefixTupleStaticType<
      InferTupleInputType<TItems>,
      TSchema['minItems'] extends infer TMinimumItemsCount extends number ? TMinimumItemsCount : 0,
      TSchema['items'] extends false ? true : TSchema['maxItems'] extends TItems['length'] ? true : false
    >
  > {
    return { 'schema': { ...schema, 'prefixItems': prefixItems } };
  }

  public static defineArray<
    const TSchema extends Record<string, unknown>,
    TItem extends SchemaNodeInterface<unknown, unknown>
  >(
    schema: TSchema,
    items: TItem
  ): SchemaNodeInterface<TSchema & { 'items': TItem }, ApplyArrayConstraintBrandsType<TSchema> & NodeStaticType<TItem>[], NodeInputType<TItem>[]>;
  public static defineArray<
    const TSchema extends Record<string, unknown>,
    TItem extends SchemaNodeInterface<unknown, unknown>,
    TContains extends SchemaNodeInterface<unknown, unknown>
  >(
    schema: TSchema,
    items: TItem,
    contains: TContains
  ): SchemaNodeInterface<
    TSchema & { 'contains': TContains; 'items': TItem },
    ApplyArrayConstraintBrandsType<TSchema, NodeStaticType<TContains>> & NodeStaticType<TItem>[],
    NodeInputType<TItem>[]
  >;
  public static defineArray<
    const TSchema extends Record<string, unknown>,
    TItem extends SchemaNodeInterface<unknown, unknown>,
    TContains extends SchemaNodeInterface<unknown, unknown>
  >(
    schema: TSchema,
    items: TItem,
    contains?: TContains
  ):
    | SchemaNodeInterface<TSchema & { 'items': TItem }, ApplyArrayConstraintBrandsType<TSchema> & NodeStaticType<TItem>[], NodeInputType<TItem>[]>
    | SchemaNodeInterface<
      TSchema & { 'contains': TContains; 'items': TItem },
      ApplyArrayConstraintBrandsType<TSchema, NodeStaticType<TContains>> & NodeStaticType<TItem>[],
      NodeInputType<TItem>[]
    > {
    if (contains !== undefined) {
      return { 'schema': { ...schema, 'contains': contains, 'items': items } };
    }

    return { 'schema': { ...schema, 'items': items } };
  }

  public static defineObject<
    TSchema extends Record<string, unknown>,
    TProps extends Record<string, SchemaNodeInterface<unknown, unknown>>,
    TRequired extends keyof TProps & string
  >(
    schema: TSchema,
    properties: TProps,
    required: readonly TRequired[]
  ): SchemaNodeInterface<
    ObjectSchemaShapeInterface & TSchema & { 'additionalProperties': false; 'patternProperties': Record<never, never>; 'properties': TProps; 'required': readonly TRequired[] },
    IdentityType<ApplyObjectConstraintBrandsType<TSchema> & InferObjectPropertiesStaticType<TProps, TRequired | InferDefaultBearingKeysType<TProps>>>,
    IdentityType<InferObjectPropertiesInputType<TProps, TRequired>>
  >;
  public static defineObject<
    TSchema extends Record<string, unknown>,
    TProps extends Record<string, SchemaNodeInterface<unknown, unknown>>,
    TRequired extends keyof TProps & string,
    TAdditional extends boolean | SchemaNodeInterface<unknown, unknown>
  >(
    schema: TSchema,
    properties: TProps,
    required: readonly TRequired[],
    options: DefineObjectAdditionalOnlyOptionsInterface<TAdditional>
  ): SchemaNodeInterface<
    ObjectSchemaShapeInterface & TSchema & { 'additionalProperties': TAdditional; 'patternProperties': Record<never, never>; 'properties': TProps; 'required': readonly TRequired[] },
    IdentityType<
      ApplyObjectConstraintBrandsType<TSchema>
      & InferAdditionalPropertiesStaticType<TAdditional>
      & InferObjectPropertiesStaticType<TProps, TRequired | InferDefaultBearingKeysType<TProps>>
    >,
    IdentityType<InferAdditionalPropertiesInputType<TAdditional> & InferObjectPropertiesInputType<TProps, TRequired>>
  >;
  public static defineObject<
    TSchema extends Record<string, unknown>,
    TProps extends Record<string, SchemaNodeInterface<unknown, unknown>>,
    TRequired extends keyof TProps & string,
    TPatternProps extends Record<string, SchemaNodeInterface<unknown, unknown>>
  >(
    schema: TSchema,
    properties: TProps,
    required: readonly TRequired[],
    options: DefineObjectPatternOnlyOptionsInterface<TPatternProps>
  ): SchemaNodeInterface<
    ObjectSchemaShapeInterface & TSchema & { 'additionalProperties': false; 'patternProperties': TPatternProps; 'properties': TProps; 'required': readonly TRequired[] },
    IdentityType<
      ApplyObjectConstraintBrandsType<TSchema>
      & InferObjectPropertiesStaticType<TProps, TRequired | InferDefaultBearingKeysType<TProps>>
      & InferPatternPropertiesStaticType<TPatternProps>
    >,
    IdentityType<InferObjectPropertiesInputType<TProps, TRequired> & InferPatternPropertiesInputType<TPatternProps>>
  >;
  public static defineObject<
    TSchema extends Record<string, unknown>,
    TProps extends Record<string, SchemaNodeInterface<unknown, unknown>>,
    TRequired extends keyof TProps & string,
    TAdditional extends boolean | SchemaNodeInterface<unknown, unknown>,
    TPatternProps extends Record<string, SchemaNodeInterface<unknown, unknown>>
  >(
    schema: TSchema,
    properties: TProps,
    required: readonly TRequired[],
    options: Required<DefineObjectOptionsInterface<TAdditional, TPatternProps>>
  ): SchemaNodeInterface<
    ObjectSchemaShapeInterface & TSchema & { 'additionalProperties': TAdditional; 'patternProperties': TPatternProps; 'properties': TProps; 'required': readonly TRequired[] },
    IdentityType<
      ApplyObjectConstraintBrandsType<TSchema>
      & InferAdditionalPropertiesStaticType<TAdditional>
      & InferObjectPropertiesStaticType<TProps, TRequired | InferDefaultBearingKeysType<TProps>>
      & InferPatternPropertiesStaticType<TPatternProps>
    >,
    IdentityType<
      InferAdditionalPropertiesInputType<TAdditional>
      & InferObjectPropertiesInputType<TProps, TRequired>
      & InferPatternPropertiesInputType<TPatternProps>
    >
  >;
  public static defineObject<
    TSchema extends Record<string, unknown>,
    TProps extends Record<string, SchemaNodeInterface<unknown, unknown>>,
    TRequired extends keyof TProps & string,
    TAdditional extends boolean | SchemaNodeInterface<unknown, unknown>,
    TPatternProps extends Record<string, SchemaNodeInterface<unknown, unknown>>
  >(
    schema: TSchema,
    properties: TProps,
    required: readonly TRequired[],
    options?: DefineObjectOptionsInterface<TAdditional, TPatternProps>
  ):
    | SchemaNodeInterface<
      ObjectSchemaShapeInterface & TSchema & { 'additionalProperties': false; 'patternProperties': Record<never, never>; 'properties': TProps; 'required': readonly TRequired[] },
      IdentityType<ApplyObjectConstraintBrandsType<TSchema> & InferObjectPropertiesStaticType<TProps, TRequired | InferDefaultBearingKeysType<TProps>>>,
      IdentityType<InferObjectPropertiesInputType<TProps, TRequired>>
    >
    | SchemaNodeInterface<
      ObjectSchemaShapeInterface & TSchema & { 'additionalProperties': TAdditional; 'patternProperties': Record<never, never>; 'properties': TProps; 'required': readonly TRequired[] },
      IdentityType<
        ApplyObjectConstraintBrandsType<TSchema>
        & InferAdditionalPropertiesStaticType<TAdditional>
        & InferObjectPropertiesStaticType<TProps, TRequired | InferDefaultBearingKeysType<TProps>>
      >,
      IdentityType<InferAdditionalPropertiesInputType<TAdditional> & InferObjectPropertiesInputType<TProps, TRequired>>
    >
    | SchemaNodeInterface<
      ObjectSchemaShapeInterface & TSchema & { 'additionalProperties': false; 'patternProperties': TPatternProps; 'properties': TProps; 'required': readonly TRequired[] },
      IdentityType<
        ApplyObjectConstraintBrandsType<TSchema>
        & InferObjectPropertiesStaticType<TProps, TRequired | InferDefaultBearingKeysType<TProps>>
        & InferPatternPropertiesStaticType<TPatternProps>
      >,
      IdentityType<InferObjectPropertiesInputType<TProps, TRequired> & InferPatternPropertiesInputType<TPatternProps>>
    >
    | SchemaNodeInterface<
      ObjectSchemaShapeInterface & TSchema & { 'additionalProperties': TAdditional; 'patternProperties': TPatternProps; 'properties': TProps; 'required': readonly TRequired[] },
      IdentityType<
        ApplyObjectConstraintBrandsType<TSchema>
        & InferAdditionalPropertiesStaticType<TAdditional>
        & InferObjectPropertiesStaticType<TProps, TRequired | InferDefaultBearingKeysType<TProps>>
        & InferPatternPropertiesStaticType<TPatternProps>
      >,
      IdentityType<
        InferAdditionalPropertiesInputType<TAdditional>
        & InferObjectPropertiesInputType<TProps, TRequired>
        & InferPatternPropertiesInputType<TPatternProps>
      >
    > {
    const additionalProperties = options?.additionalProperties;
    const patternProperties = options?.patternProperties;

    if (additionalProperties !== undefined && patternProperties !== undefined) {
      return { 'schema': { ...schema, 'additionalProperties': additionalProperties, 'patternProperties': patternProperties, 'properties': properties, 'required': required } };
    }
    if (additionalProperties !== undefined) {
      return { 'schema': { ...schema, 'additionalProperties': additionalProperties, 'patternProperties': {}, 'properties': properties, 'required': required } };
    }
    if (patternProperties !== undefined) {
      return { 'schema': { ...schema, 'additionalProperties': false, 'patternProperties': patternProperties, 'properties': properties, 'required': required } };
    }

    return { 'schema': { ...schema, 'additionalProperties': false, 'patternProperties': {}, 'properties': properties, 'required': required } };
  }

  public static defineAllOf<const TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>(
    branches: TItems
  ): SchemaNodeInterface<{ readonly 'allOf': TItems }, IdentityType<InferIntersectionOfStaticType<TItems>>, IdentityType<InferIntersectionOfInputType<TItems>>>;
  public static defineAllOf<const TSchema extends Record<string, unknown>, const TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>(
    schema: TSchema,
    branches: TItems
  ): SchemaNodeInterface<TSchema & { readonly 'allOf': TItems }, IdentityType<InferIntersectionOfStaticType<TItems>>, IdentityType<InferIntersectionOfInputType<TItems>>>;
  public static defineAllOf<const TSchema extends Record<string, unknown>, const TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>(
    ...argumentList: [branches: TItems] | [schema: TSchema, branches: TItems]
  ):
    | SchemaNodeInterface<{ readonly 'allOf': TItems }, IdentityType<InferIntersectionOfStaticType<TItems>>, IdentityType<InferIntersectionOfInputType<TItems>>>
    | SchemaNodeInterface<TSchema & { readonly 'allOf': TItems }, IdentityType<InferIntersectionOfStaticType<TItems>>, IdentityType<InferIntersectionOfInputType<TItems>>> {
    if (argumentList.length === 2) {
      const [schema, branches] = argumentList;

      return { 'schema': { ...schema, 'allOf': branches } };
    }
    const [branches] = argumentList;

    return { 'schema': { 'allOf': branches } };
  }

  public static defineAnyOf<const TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>(
    branches: TItems
  ): SchemaNodeInterface<{ readonly 'anyOf': TItems }, InferUnionOfStaticType<TItems>, InferUnionOfInputType<TItems>>;
  public static defineAnyOf<const TSchema extends Record<string, unknown>, const TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>(
    schema: TSchema,
    branches: TItems
  ): SchemaNodeInterface<TSchema & { readonly 'anyOf': TItems }, InferUnionOfStaticType<TItems>, InferUnionOfInputType<TItems>>;
  public static defineAnyOf<const TSchema extends Record<string, unknown>, const TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>(
    ...argumentList: [branches: TItems] | [schema: TSchema, branches: TItems]
  ):
    | SchemaNodeInterface<{ readonly 'anyOf': TItems }, InferUnionOfStaticType<TItems>, InferUnionOfInputType<TItems>>
    | SchemaNodeInterface<TSchema & { readonly 'anyOf': TItems }, InferUnionOfStaticType<TItems>, InferUnionOfInputType<TItems>> {
    if (argumentList.length === 2) {
      const [schema, branches] = argumentList;

      return { 'schema': { ...schema, 'anyOf': branches } };
    }
    const [branches] = argumentList;

    return { 'schema': { 'anyOf': branches } };
  }

  public static defineOneOf<const TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>(
    branches: TItems
  ): SchemaNodeInterface<{ readonly 'oneOf': TItems }, InferUnionOfStaticType<TItems>, InferUnionOfInputType<TItems>>;
  public static defineOneOf<const TSchema extends Record<string, unknown>, const TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>(
    schema: TSchema,
    branches: TItems
  ): SchemaNodeInterface<TSchema & { readonly 'oneOf': TItems }, InferUnionOfStaticType<TItems>, InferUnionOfInputType<TItems>>;
  public static defineOneOf<const TSchema extends Record<string, unknown>, const TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>(
    ...argumentList: [branches: TItems] | [schema: TSchema, branches: TItems]
  ):
    | SchemaNodeInterface<{ readonly 'oneOf': TItems }, InferUnionOfStaticType<TItems>, InferUnionOfInputType<TItems>>
    | SchemaNodeInterface<TSchema & { readonly 'oneOf': TItems }, InferUnionOfStaticType<TItems>, InferUnionOfInputType<TItems>> {
    if (argumentList.length === 2) {
      const [schema, branches] = argumentList;

      return { 'schema': { ...schema, 'oneOf': branches } };
    }
    const [branches] = argumentList;

    return { 'schema': { 'oneOf': branches } };
  }

  /** `not` has no sound positive representation: TypeScript's type system has no negation operator. */
  public static defineNot<const TInner extends SchemaNodeInterface<unknown, unknown>>(
    inner: TInner
  ): SchemaNodeInterface<{ readonly 'not': TInner }, unknown>;
  public static defineNot<const TSchema extends Record<string, unknown>, const TInner extends SchemaNodeInterface<unknown, unknown>>(
    schema: TSchema,
    inner: TInner
  ): SchemaNodeInterface<TSchema & { readonly 'not': TInner }, unknown>;
  public static defineNot<const TSchema extends Record<string, unknown>, const TInner extends SchemaNodeInterface<unknown, unknown>>(
    ...argumentList: [inner: TInner] | [schema: TSchema, inner: TInner]
  ): SchemaNodeInterface<{ readonly 'not': TInner }, unknown> | SchemaNodeInterface<TSchema & { readonly 'not': TInner }, unknown> {
    if (argumentList.length === 2) {
      const [schema, inner] = argumentList;

      return { 'schema': { ...schema, 'not': inner } };
    }
    const [inner] = argumentList;

    return { 'schema': { 'not': inner } };
  }

  /**
   * Sound over-approximation of `if`/`then`/`else`: TypeScript cannot express the `if`
   * predicate as a type-level filter. Fields carry the `Schema` suffix — a bare `then` key
   * on an object literal reads as a thenable, the same reason the compiler's own
   * `SchemaNodePlanInterface` calls it `thenSchema` rather than `then`.
   */
  public static defineConditional<
    TIf extends SchemaNodeInterface<unknown, unknown>,
    TThen extends SchemaNodeInterface<unknown, unknown>,
    TElse extends SchemaNodeInterface<unknown, unknown>
  >(
    when: TIf,
    thenBranch: TThen,
    elseBranch: TElse
  ): SchemaNodeInterface<
    { readonly 'elseSchema': TElse; readonly 'ifSchema': TIf; readonly 'thenSchema': TThen },
    NodeStaticType<TThen> | NodeStaticType<TElse>,
    NodeInputType<TThen> | NodeInputType<TElse>
  > {
    return { 'schema': { 'elseSchema': elseBranch, 'ifSchema': when, 'thenSchema': thenBranch } };
  }

  /**
   * Wraps an already-built node with sibling schema keys, without restating its shape:
   * the derived type reads `target`'s own precomputed `static`/`input` directly, the same
   * indexed-access rule every other constructor follows — only `schema` is new.
   *
   * This REPLACES `target`'s own schema rather than merging it — correct for `$ref`/`$defs`
   * resolution (`defineReference`, `defineRecursive`'s self case), where inlining a
   * self-referential or recursive target's own schema would recurse forever. A caller that
   * wants `target`'s structural schema preserved, with extra sibling keys layered on top
   * (e.g. attaching a `default`), needs `defineAnnotated` instead.
   */
  public static defineDecorated<const TSchema extends Record<string, unknown>, TTarget extends SchemaNodeInterface<unknown, unknown>>(
    schema: TSchema,
    _target: TTarget
  ): SchemaNodeInterface<TSchema, NodeStaticType<TTarget>, NodeInputType<TTarget>> {
    return { 'schema': schema };
  }

  /** Layers sibling schema keys (e.g. `default`) onto `target`'s own schema without discarding it — unlike `defineDecorated`, which replaces it. */
  public static defineAnnotated<const TSchema extends Record<string, unknown>, TTargetSchema, TTarget extends SchemaNodeInterface<TTargetSchema, unknown>>(
    schema: TSchema,
    target: TTarget
  ): SchemaNodeInterface<TSchema & TTargetSchema, NodeStaticType<TTarget>, NodeInputType<TTarget>> {
    const merged = { ...target.schema, ...schema };
    return { 'schema': merged };
  }

  /**
   * `$ref`/`$defs` resolution, as a `defineDecorated` specialisation: `pointer`/`title`
   * are the decoration, `target` supplies the derived `static`/`input`. Passing `self` from
   * `defineRecursive` makes this the self-referential case — no schema walk, so no
   * recursion budget is spent.
   */
  public static defineReference<TTarget extends SchemaNodeInterface<unknown, unknown>>(
    pointer: string,
    target: TTarget,
    title?: string
  ): SchemaNodeInterface<Readonly<Partial<Record<'title', string>> & Record<'$ref', string>>, NodeStaticType<TTarget>, NodeInputType<TTarget>> {
    if (title === undefined) {
      const result = SchemaNode.defineDecorated({ '$ref': pointer } satisfies JSONSchema7, target);

      return result;
    }
    const result = SchemaNode.defineDecorated({ '$ref': pointer, 'title': title } satisfies JSONSchema7, target);

    return result;
  }

  /** Self-reference for a recursive schema: `build` receives the node it is defining, TypeBox `Type.Recursive`-style. */
  public static defineRecursive<TSchema, TStatic, TInput = TStatic>(
    build: (self: SchemaNodeInterface<TSchema, TStatic, TInput>) => SchemaNodeInterface<TSchema, TStatic, TInput>
  ): SchemaNodeInterface<TSchema, TStatic, TInput> {
    const resolution: { 'schema'?: TSchema } = {};
    const self: SchemaNodeInterface<TSchema, TStatic, TInput> = {
      get 'schema'(): TSchema {
        const resolved = resolution.schema;
        if (resolved === undefined) {
          throw new Error('recursive schema node read before its own build() resolved it');
        }
        return resolved;
      }
    };
    const built = build(self);

    resolution.schema = built.schema;

    return self;
  }
}
