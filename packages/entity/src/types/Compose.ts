import { JsonObject } from '@studnicky/types/browser';

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
 * The private filter helpers are overloaded: a generic signature narrows the
 * return to the exact `Pick`/`Omit` the caller's branded `TSchema` promises,
 * while the implementation signature stays loose for the runtime loop.
 *
 * @module
 */
export class Compose {
  /** Copies `source`'s own properties whose key is present in `keySet`, preserving insertion order. */
  private static keepProperties<TProps extends Record<string, unknown>, TKeys extends keyof TProps & string>(
    source: TProps, keySet: ReadonlySet<TKeys>
  ): Pick<TProps, TKeys>;
  private static keepProperties(source: Record<string, unknown>, keySet: ReadonlySet<string>): Record<string, unknown> {
    const entries = Object.entries(source);
    const kept: [string, unknown][] = [];
    const entryCount = entries.length;

    for (let index = 0; index < entryCount; index += 1) {
      const entry = entries.at(index);

      if (entry !== undefined && keySet.has(entry[0])) {
        kept.push(entry);
      }
    }

    const result = JsonObject.fromEntries(kept);

    return result;
  }

  /** Copies `source`'s own properties whose key is absent from `keySet`, preserving insertion order. */
  private static dropProperties<TProps extends Record<string, unknown>, TKeys extends keyof TProps & string>(
    source: TProps, keySet: ReadonlySet<TKeys>
  ): Omit<TProps, TKeys>;
  private static dropProperties(source: Record<string, unknown>, keySet: ReadonlySet<string>): Record<string, unknown> {
    const entries = Object.entries(source);
    const kept: [string, unknown][] = [];
    const entryCount = entries.length;

    for (let index = 0; index < entryCount; index += 1) {
      const entry = entries.at(index);

      if (entry !== undefined && !keySet.has(entry[0])) {
        kept.push(entry);
      }
    }

    const result = JsonObject.fromEntries(kept);

    return result;
  }

  /** Copies `source`'s own members whose value is present in `keySet`, preserving insertion order. */
  private static keepValues<TValues extends string, TKeys extends TValues>(
    source: readonly TValues[], keySet: ReadonlySet<TKeys>
  ): Extract<TValues, TKeys>[];
  private static keepValues(source: readonly string[], keySet: ReadonlySet<string>): string[] {
    const kept: string[] = [];
    const sourceLength = source.length;

    for (let index = 0; index < sourceLength; index += 1) {
      const value = source.at(index);

      if (value !== undefined && keySet.has(value)) {
        kept.push(value);
      }
    }

    return kept;
  }

  /** Merges `extension`'s own properties over `base`'s, `extension` taking precedence on key collision. */
  private static mergeProperties<TBase extends Record<string, unknown>, TExtension extends Record<string, unknown>>(
    base: TBase, extension: TExtension
  ): Omit<TBase, keyof TExtension> & TExtension;
  private static mergeProperties(base: Record<string, unknown>, extension: Record<string, unknown>): Record<string, unknown> {
    return { ...base, ...extension };
  }

  /** Copies `source`'s own members whose value is absent from `keySet`, preserving insertion order. */
  private static dropValues<TValues extends string, TKeys extends TValues>(
    source: readonly TValues[], keySet: ReadonlySet<TKeys>
  ): Exclude<TValues, TKeys>[];
  private static dropValues(source: readonly string[], keySet: ReadonlySet<string>): string[] {
    const kept: string[] = [];
    const sourceLength = source.length;

    for (let index = 0; index < sourceLength; index += 1) {
      const value = source.at(index);

      if (value !== undefined && !keySet.has(value)) {
        kept.push(value);
      }
    }

    return kept;
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
