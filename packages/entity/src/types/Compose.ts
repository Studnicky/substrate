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
 * The runtime `properties`/`required` filtering is generic over
 * `ObjectSchemaShapeInterface`, not over the caller's precise branded
 * `TSchema`; the return cast to the branded `SchemaNodeInterface` is the one
 * place per method where that precision is restored, proven correct by the
 * filter/merge operation directly above it.
 *
 * @module
 */
export class Compose {
  /** Copies `source`'s own properties whose key is present in `keySet`, preserving insertion order. */
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

  /** Copies `source`'s own members whose value is absent from `keySet`, preserving insertion order. */
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
    const keySet = new Set<string>(keys);
    const properties = Compose.keepProperties(node.schema.properties ?? {}, keySet);
    const required = Compose.keepValues(node.schema.required ?? [], keySet);

    const result: SchemaNodeInterface<
      PickSchemaType<TSchema, TKeys>,
      Pick<TStatic, TKeys>
    > = {
      'schema': {
        ...node.schema,
        'properties': properties as Pick<NonNullable<TSchema['properties']>, TKeys>,
        'required': required as Extract<NonNullable<TSchema['required']>[number], TKeys>[]
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
    const keySet = new Set<string>(keys);
    const properties = Compose.dropProperties(node.schema.properties ?? {}, keySet);
    const required = Compose.dropValues(node.schema.required ?? [], keySet);

    const result: SchemaNodeInterface<
      OmitSchemaType<TSchema, TKeys>,
      Omit<TStatic, TKeys>
    > = {
      'schema': {
        ...node.schema,
        'properties': properties as Omit<NonNullable<TSchema['properties']>, TKeys>,
        'required': required as Exclude<NonNullable<TSchema['required']>[number], TKeys>[]
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
    const properties = { ...node.schema.properties, ...extension.schema.properties };
    const required = [...new Set([...(node.schema.required ?? []), ...(extension.schema.required ?? [])])];

    const result: SchemaNodeInterface<
      ExtendSchemaType<TSchema, TExtensionSchema>,
      Omit<TStatic, keyof TExtensionStatic> & TExtensionStatic
    > = {
      'schema': {
        ...node.schema,
        'properties': properties as NonNullable<TExtensionSchema['properties']> & Omit<NonNullable<TSchema['properties']>, keyof NonNullable<TExtensionSchema['properties']>>,
        'required': required
      }
    };

    return result;
  }
}
