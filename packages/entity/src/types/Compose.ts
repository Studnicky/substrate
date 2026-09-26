import type { ObjectSchemaShapeInterface } from '../interfaces/ObjectSchemaShapeInterface.js';
import type { SchemaNodeInterface } from '../interfaces/SchemaNodeInterface.js';
import type { ExtendSchemaType } from './ExtendSchemaType.js';
import type { OmitSchemaType } from './OmitSchemaType.js';
import type { PartialSchemaType } from './PartialSchemaType.js';
import type { PickSchemaType } from './PickSchemaType.js';
import type { RequiredSchemaType } from './RequiredSchemaType.js';

/**
 * Schema-level composition: each method derives a new schema and a new
 * `static` type together, transforming both in lockstep at the same level —
 * never recursing into a property's own nested schema.
 *
 * Each private filter helper carries a single generic signature that its own
 * body proves directly: no separate looser implementation signature stands
 * between the promised type and what the body actually returns.
 *
 * @module
 */
export class Compose {
  /** Copies `source`'s own properties whose key is present in `keySet`, mutating a shallow copy in place. */
  private static keepProperties<TProps extends Record<string, unknown>, TKeys extends keyof TProps & string>(
    source: TProps, keySet: ReadonlySet<TKeys>
  ): Pick<TProps, TKeys> {
    const wideKeySet: ReadonlySet<string> = keySet;
    // Honest at every step: TKeys stay real values throughout, the rest are only ever "possibly present" — true before, during, and after deletion.
    // `& Record<string, unknown>` also proves to the deletion cost checker that this shape makes no fixed hidden-class contract to break.
    const result: Partial<Omit<TProps, TKeys>> & Pick<TProps, TKeys> & Record<string, unknown> = { ...source };
    const keys = Object.keys(result);
    const keyCount = keys.length;

    for (let index = 0; index < keyCount; index += 1) {
      const key = keys.at(index);

      if (key !== undefined && !wideKeySet.has(key)) {
        Reflect.deleteProperty(result, key);
      }
    }

    return result;
  }

  /** Copies `source`'s own properties whose key is absent from `keySet`, mutating a shallow copy in place. */
  private static dropProperties<TProps extends Record<string, unknown>, TKeys extends keyof TProps & string>(
    source: TProps, keySet: ReadonlySet<TKeys>
  ): Omit<TProps, TKeys> {
    const wideKeySet: ReadonlySet<string> = keySet;
    // Honest at every step: the non-TKeys keys stay real values throughout, TKeys are only ever "possibly present" — true before, during, and after deletion.
    // `& Record<string, unknown>` also proves to the deletion cost checker that this shape makes no fixed hidden-class contract to break.
    const result: Omit<TProps, TKeys> & Partial<Pick<TProps, TKeys>> & Record<string, unknown> = { ...source };
    const keys = Object.keys(result);
    const keyCount = keys.length;

    for (let index = 0; index < keyCount; index += 1) {
      const key = keys.at(index);

      if (key !== undefined && wideKeySet.has(key)) {
        Reflect.deleteProperty(result, key);
      }
    }

    return result;
  }

  /** Copies `source`'s own members whose value is present in `keySet`, preserving insertion order. */
  private static keepValues<TValues extends string, TKeys extends TValues>(
    source: readonly TValues[], keySet: ReadonlySet<TKeys>
  ): Extract<TValues, TKeys>[] {
    const wideKeySet: ReadonlySet<string> = keySet;
    const isKept = (value: TValues): value is Extract<TValues, TKeys> => {
      const kept = wideKeySet.has(value);

      return kept;
    };
    const result = source.filter(isKept);

    return result;
  }

  /** Merges `extension`'s own properties over `base`'s, `extension` taking precedence on key collision. */
  private static mergeProperties<TBase extends Record<string, unknown>, TExtension extends Record<string, unknown>>(
    base: TBase, extension: TExtension
  ): Omit<TBase, keyof TExtension> & TExtension {
    const result = { ...base, ...extension };

    return result;
  }

  /** Copies `source`'s own members whose value is absent from `keySet`, preserving insertion order. */
  private static dropValues<TValues extends string, TKeys extends TValues>(
    source: readonly TValues[], keySet: ReadonlySet<TKeys>
  ): Exclude<TValues, TKeys>[] {
    const wideKeySet: ReadonlySet<string> = keySet;
    const isDropped = (value: TValues): value is TKeys => {
      const dropped = wideKeySet.has(value);

      return dropped;
    };
    const isKept = (value: TValues): value is Exclude<TValues, TKeys> => {
      const kept = !isDropped(value);

      return kept;
    };
    const result = source.filter(isKept);

    return result;
  }

  public static pick<
    TSchema extends ObjectSchemaShapeInterface,
    TStatic,
    TKeys extends keyof NonNullable<TSchema['properties']> & keyof TStatic & string
  >(
    node: SchemaNodeInterface<TSchema, TStatic>,
    keys: readonly TKeys[]
  ): SchemaNodeInterface<PickSchemaType<TSchema, TKeys>, Pick<TStatic, TKeys>> {
    const keySet = new Set<TKeys>(keys);
    const properties = Compose.keepProperties(node.schema.properties ?? {}, keySet);
    const required = Compose.keepValues(node.schema.required ?? [], keySet);

    const result: SchemaNodeInterface<
      PickSchemaType<TSchema, TKeys>,
      Pick<TStatic, TKeys>
    > = {
      'schema': {
        ...node.schema,
        'properties': properties,
        'required': required
      }
    };

    return result;
  }

  public static omit<
    TSchema extends ObjectSchemaShapeInterface,
    TStatic,
    TKeys extends keyof NonNullable<TSchema['properties']> & keyof TStatic & string
  >(
    node: SchemaNodeInterface<TSchema, TStatic>,
    keys: readonly TKeys[]
  ): SchemaNodeInterface<OmitSchemaType<TSchema, TKeys>, Omit<TStatic, TKeys>> {
    const keySet = new Set<TKeys>(keys);
    const properties = Compose.dropProperties(node.schema.properties ?? {}, keySet);
    const required = Compose.dropValues(node.schema.required ?? [], keySet);

    const result: SchemaNodeInterface<
      OmitSchemaType<TSchema, TKeys>,
      Omit<TStatic, TKeys>
    > = {
      'schema': {
        ...node.schema,
        'properties': properties,
        'required': required
      }
    };

    return result;
  }

  public static partial<TSchema extends ObjectSchemaShapeInterface, TStatic>(
    node: SchemaNodeInterface<TSchema, TStatic>
  ): SchemaNodeInterface<PartialSchemaType<TSchema>, Partial<TStatic>> {
    const result: SchemaNodeInterface<PartialSchemaType<TSchema>, Partial<TStatic>> = {
      'schema': { ...node.schema, 'required': [] }
    };

    return result;
  }

  public static require<TSchema extends ObjectSchemaShapeInterface, TStatic>(
    node: SchemaNodeInterface<TSchema, TStatic>
  ): SchemaNodeInterface<RequiredSchemaType<TSchema>, Required<TStatic>> {
    const required = Object.keys(node.schema.properties ?? {});
    const result: SchemaNodeInterface<RequiredSchemaType<TSchema>, Required<TStatic>> = {
      'schema': { ...node.schema, 'required': required }
    };

    return result;
  }

  public static extend<
    TSchema extends ObjectSchemaShapeInterface,
    TStatic,
    TExtensionSchema extends ObjectSchemaShapeInterface,
    TExtensionStatic
  >(
    node: SchemaNodeInterface<TSchema, TStatic>,
    extension: SchemaNodeInterface<TExtensionSchema, TExtensionStatic>
  ): SchemaNodeInterface<ExtendSchemaType<TSchema, TExtensionSchema>, Omit<TStatic, keyof TExtensionStatic> & TExtensionStatic> {
    const properties = Compose.mergeProperties<NonNullable<TSchema['properties']>, NonNullable<TExtensionSchema['properties']>>(
      node.schema.properties ?? {}, extension.schema.properties ?? {}
    );
    const required = [...new Set([...(node.schema.required ?? []), ...(extension.schema.required ?? [])])];

    const result: SchemaNodeInterface<
      ExtendSchemaType<TSchema, TExtensionSchema>,
      Omit<TStatic, keyof TExtensionStatic> & TExtensionStatic
    > = {
      'schema': {
        ...node.schema,
        'properties': properties,
        'required': required
      }
    };

    return result;
  }
}
