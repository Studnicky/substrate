import type { JSONSchema7 } from 'json-schema';

import type { DefineObjectOptionsInterface } from '../../interfaces/DefineObjectOptionsInterface.js';
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

  public static defineConst<const TValue>(value: TValue): SchemaNodeInterface<{ readonly 'const': TValue }, TValue> {
    return { 'schema': { 'const': value } };
  }

  public static defineEnum<const TValues extends readonly unknown[]>(
    values: TValues
  ): SchemaNodeInterface<{ readonly 'enum': TValues }, TValues[number]> {
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
    TItem extends SchemaNodeInterface<unknown, unknown>,
    TContains extends SchemaNodeInterface<unknown, unknown> | undefined = undefined
  >(
    schema: TSchema,
    items: TItem,
    contains?: TContains
  ): SchemaNodeInterface<
    TSchema & { 'contains'?: TContains; 'items': TItem },
    ApplyArrayConstraintBrandsType<TSchema, TContains extends SchemaNodeInterface<unknown, unknown> ? NodeStaticType<TContains> : never>
      & NodeStaticType<TItem>[],
    NodeInputType<TItem>[]
  > {
    const combinedSchema = { ...schema, 'contains': contains, 'items': items };

    // Runtime shape proven correct by the spread above; the cast restores the branded generic return type.
    return { 'schema': combinedSchema } as unknown as SchemaNodeInterface<
      TSchema & { 'contains'?: TContains; 'items': TItem },
      ApplyArrayConstraintBrandsType<TSchema, TContains extends SchemaNodeInterface<unknown, unknown> ? NodeStaticType<TContains> : never>
        & NodeStaticType<TItem>[],
      NodeInputType<TItem>[]
    >;
  }

  public static defineObject<
    TSchema extends Record<string, unknown>,
    TProps extends Record<string, SchemaNodeInterface<unknown, unknown>>,
    TRequired extends keyof TProps & string,
    TAdditional extends boolean | SchemaNodeInterface<unknown, unknown> = false,
    TPatternProps extends Record<string, SchemaNodeInterface<unknown, unknown>> = Record<never, never>
  >(
    schema: TSchema,
    properties: TProps,
    required: readonly TRequired[],
    options?: DefineObjectOptionsInterface<TAdditional, TPatternProps>
  ): SchemaNodeInterface<
    ObjectSchemaShapeInterface & TSchema & { 'additionalProperties'?: TAdditional; 'patternProperties'?: TPatternProps; 'properties': TProps; 'required': readonly TRequired[] },
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
    const combinedSchema = {
      ...schema,
      'additionalProperties': options?.additionalProperties,
      'patternProperties': options?.patternProperties,
      'properties': properties,
      'required': required
    };

    // Runtime shape proven correct by the spread above; the cast restores the branded generic return type.
    return { 'schema': combinedSchema } as unknown as SchemaNodeInterface<
      ObjectSchemaShapeInterface & TSchema & { 'additionalProperties'?: TAdditional; 'patternProperties'?: TPatternProps; 'properties': TProps; 'required': readonly TRequired[] },
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
  }

  public static defineAllOf<const TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>(
    branches: TItems
  ): SchemaNodeInterface<{ readonly 'allOf': TItems }, IdentityType<InferIntersectionOfStaticType<TItems>>, IdentityType<InferIntersectionOfInputType<TItems>>> {
    return { 'schema': { 'allOf': branches } };
  }

  public static defineAnyOf<const TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>(
    branches: TItems
  ): SchemaNodeInterface<{ readonly 'anyOf': TItems }, InferUnionOfStaticType<TItems>, InferUnionOfInputType<TItems>> {
    return { 'schema': { 'anyOf': branches } };
  }

  public static defineOneOf<const TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>(
    branches: TItems
  ): SchemaNodeInterface<{ readonly 'oneOf': TItems }, InferUnionOfStaticType<TItems>, InferUnionOfInputType<TItems>> {
    return { 'schema': { 'oneOf': branches } };
  }

  /** `not` has no sound positive representation: TypeScript's type system has no negation operator. */
  public static defineNot<const TInner extends SchemaNodeInterface<unknown, unknown>>(
    inner: TInner
  ): SchemaNodeInterface<{ readonly 'not': TInner }, unknown> {
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
   * `$ref`/`$defs` resolution: `pointer` is carried into the schema literal for the runtime
   * compiler; the derived type reads `target`'s own precomputed `static`/`input` directly,
   * the same indexed-access rule every other constructor follows. Passing `self` from
   * `defineRecursive` makes this the self-referential case — no schema walk, so no
   * recursion budget is spent.
   */
  public static defineReference<TTarget extends SchemaNodeInterface<unknown, unknown>>(
    pointer: string,
    _target: TTarget
  ): SchemaNodeInterface<Pick<JSONSchema7, '$ref'>, NodeStaticType<TTarget>, NodeInputType<TTarget>> {
    const schema: JSONSchema7 = { '$ref': pointer };
    return { 'schema': schema };
  }

  /** Self-reference for a recursive schema: `build` receives the node it is defining, TypeBox `Type.Recursive`-style. */
  public static defineRecursive<TSchema, TStatic, TInput = TStatic>(
    build: (self: SchemaNodeInterface<TSchema, TStatic, TInput>) => SchemaNodeInterface<TSchema, TStatic, TInput>
  ): SchemaNodeInterface<TSchema, TStatic, TInput> {
    const placeholder: { 'schema'?: TSchema } = {};
    const self = placeholder as SchemaNodeInterface<TSchema, TStatic, TInput>;
    const built = build(self);

    placeholder.schema = built.schema;

    return self;
  }
}
