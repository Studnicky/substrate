import { Predicates } from '@studnicky/types/browser';

import type { SchemaNodePlanInterface } from './interfaces/SchemaNodePlanInterface.js';

/** Performs the one traversal per node that extracts typed keyword fields; the compiler never re-reads raw JSON. */
export class SchemaNodePlanBuilder {
  public static build(schema: Record<string, unknown>, schemaPointer: string): SchemaNodePlanInterface {
    const legacyDependencies = SchemaNodePlanBuilder.splitLegacyDependencies(schema.dependencies);
    return {
      'additionalProperties': Reflect.get(schema, 'additionalProperties'),
      'allOf': SchemaNodePlanBuilder.asArray(schema.allOf),
      'anyOf': SchemaNodePlanBuilder.asArray(schema.anyOf),
      'const': Reflect.has(schema, 'const') ? { 'value': schema.const } : undefined,
      'contains': schema.contains,
      'contentEncoding': SchemaNodePlanBuilder.asString(schema.contentEncoding),
      'contentMediaType': SchemaNodePlanBuilder.asString(schema.contentMediaType),
      'default': Reflect.has(schema, 'default') ? { 'value': schema.default } : undefined,
      'defs': SchemaNodePlanBuilder.asMap(schema.$defs),
      'dependentRequired': SchemaNodePlanBuilder.mergeStringArrayMap(
        SchemaNodePlanBuilder.asStringArrayMap(schema.dependentRequired), legacyDependencies.required
      ),
      'dependentSchemas': SchemaNodePlanBuilder.mergeMap(SchemaNodePlanBuilder.asMap(schema.dependentSchemas), legacyDependencies.schemas),
      'dynamicAnchor': SchemaNodePlanBuilder.asString(schema.$dynamicAnchor),
      'dynamicReference': SchemaNodePlanBuilder.asString(schema.$dynamicRef),
      'else': schema.else,
      'enum': SchemaNodePlanBuilder.asArray(schema.enum),
      'exclusiveMaximum': SchemaNodePlanBuilder.asNumber(schema.exclusiveMaximum),
      'exclusiveMinimum': SchemaNodePlanBuilder.asNumber(schema.exclusiveMinimum),
      'format': SchemaNodePlanBuilder.asString(schema.format),
      'id': SchemaNodePlanBuilder.asString(schema.$id),
      'if': schema.if,
      'items': schema.items,
      'maximum': SchemaNodePlanBuilder.asNumber(schema.maximum),
      'maximumContains': SchemaNodePlanBuilder.asNumber(schema.maxContains),
      'maximumItems': SchemaNodePlanBuilder.asNumber(schema.maxItems),
      'maximumLength': SchemaNodePlanBuilder.asNumber(schema.maxLength),
      'maximumProperties': SchemaNodePlanBuilder.asNumber(schema.maxProperties),
      'minimum': SchemaNodePlanBuilder.asNumber(schema.minimum),
      'minimumContains': SchemaNodePlanBuilder.asNumber(schema.minContains),
      'minimumItems': SchemaNodePlanBuilder.asNumber(schema.minItems),
      'minimumLength': SchemaNodePlanBuilder.asNumber(schema.minLength),
      'minimumProperties': SchemaNodePlanBuilder.asNumber(schema.minProperties),
      'multipleOf': SchemaNodePlanBuilder.asNumber(schema.multipleOf),
      'not': schema.not,
      'oneOf': SchemaNodePlanBuilder.asArray(schema.oneOf),
      'pattern': SchemaNodePlanBuilder.asString(schema.pattern),
      'patternProperties': SchemaNodePlanBuilder.asMap(schema.patternProperties),
      'prefixItems': SchemaNodePlanBuilder.asArray(schema.prefixItems),
      'properties': SchemaNodePlanBuilder.asMap(schema.properties),
      'propertyNames': schema.propertyNames,
      'reference': SchemaNodePlanBuilder.asString(schema.$ref),
      'required': SchemaNodePlanBuilder.asStringArray(schema.required),
      'schemaPointer': schemaPointer,
      'thenSchema': schema.then,
      'type': SchemaNodePlanBuilder.asTypeList(schema.type),
      'unevaluatedItems': schema.unevaluatedItems,
      'unevaluatedProperties': schema.unevaluatedProperties,
      'uniqueItems': schema.uniqueItems === true
    };
  }

  private static asString(value: unknown): string | undefined {
    const result = Predicates.isString(value) ? value : undefined;
    return result;
  }

  private static asNumber(value: unknown): number | undefined {
    const result = Predicates.isNumberType(value) ? value : undefined;
    return result;
  }

  private static asArray(value: unknown): readonly unknown[] | undefined {
    const result = Predicates.isArray(value) ? value : undefined;
    return result;
  }

  private static asStringArray(value: unknown): readonly string[] {
    if (!Predicates.isArray(value)) {
      return [];
    }
    const result = value.filter(Predicates.isString);
    return result;
  }

  private static asTypeList(value: unknown): readonly string[] | undefined {
    if (Predicates.isString(value)) {
      const result = [value];
      return result;
    }
    if (Predicates.isArray(value)) {
      const result = value.filter(Predicates.isString);
      return result;
    }
    return undefined;
  }

  private static asMap(value: unknown): ReadonlyMap<string, unknown> {
    const result = new Map<string, unknown>();
    if (!Predicates.isRecord(value)) {
      return result;
    }
    const keys = Object.keys(value);
    const count = keys.length;
    for (let index = 0; index < count; index += 1) {
      const key = keys[index]!;
      result.set(key, Reflect.get(value, key));
    }
    return result;
  }

  private static asStringArrayMap(value: unknown): ReadonlyMap<string, readonly string[]> {
    const result = new Map<string, readonly string[]>();
    if (!Predicates.isRecord(value)) {
      return result;
    }
    const keys = Object.keys(value);
    const count = keys.length;
    for (let index = 0; index < count; index += 1) {
      const key = keys[index]!;
      result.set(key, SchemaNodePlanBuilder.asStringArray(Reflect.get(value, key)));
    }
    return result;
  }

  /** Draft4-7 legacy `dependencies`: an array entry is a `dependentRequired` trigger, a schema/boolean entry is a `dependentSchemas` trigger. */
  private static splitLegacyDependencies(
    value: unknown
  ): { readonly 'required': ReadonlyMap<string, readonly string[]>; readonly 'schemas': ReadonlyMap<string, unknown>; } {
    const required = new Map<string, readonly string[]>();
    const schemas = new Map<string, unknown>();
    if (!Predicates.isRecord(value)) {
      return { 'required': required, 'schemas': schemas };
    }
    const keys = Object.keys(value);
    const count = keys.length;
    for (let index = 0; index < count; index += 1) {
      const key = keys[index]!;
      const entry = Reflect.get(value, key);
      if (Predicates.isArray(entry)) {
        required.set(key, SchemaNodePlanBuilder.asStringArray(entry));
        continue;
      }
      schemas.set(key, entry);
    }
    return { 'required': required, 'schemas': schemas };
  }

  /** `dependentRequired`/`dependentSchemas` win on key collision with legacy `dependencies`. */
  private static mergeStringArrayMap(
    base: ReadonlyMap<string, readonly string[]>, legacy: ReadonlyMap<string, readonly string[]>
  ): ReadonlyMap<string, readonly string[]> {
    if (legacy.size === 0) { return base; }
    const result = new Map(legacy);
    base.forEach((entryValue, key) => { result.set(key, entryValue); });
    return result;
  }

  private static mergeMap(base: ReadonlyMap<string, unknown>, legacy: ReadonlyMap<string, unknown>): ReadonlyMap<string, unknown> {
    if (legacy.size === 0) { return base; }
    const result = new Map(legacy);
    base.forEach((entryValue, key) => { result.set(key, entryValue); });
    return result;
  }
}
