import { Predicates } from '@studnicky/types/browser';

import type { SchemaNodePlanInterface } from './interfaces/SchemaNodePlanInterface.js';

/** Performs the one traversal per node that extracts typed keyword fields; the compiler never re-reads raw JSON. */
export class SchemaNodePlanBuilder {
  public static build(schema: Record<string, unknown>, schemaPointer: string): SchemaNodePlanInterface {
    return {
      'additionalProperties': Reflect.get(schema, 'additionalProperties'),
      'allOf': SchemaNodePlanBuilder.asArray(schema.allOf),
      'anyOf': SchemaNodePlanBuilder.asArray(schema.anyOf),
      'const': Reflect.has(schema, 'const') ? { 'value': schema.const } : undefined,
      'contains': schema.contains,
      'contentEncoding': Predicates.isString(schema.contentEncoding) ? schema.contentEncoding : undefined,
      'contentMediaType': Predicates.isString(schema.contentMediaType) ? schema.contentMediaType : undefined,
      'default': Reflect.has(schema, 'default') ? { 'value': schema.default } : undefined,
      'defs': SchemaNodePlanBuilder.asMap(schema.$defs),
      'dependentRequired': SchemaNodePlanBuilder.asStringArrayMap(schema.dependentRequired),
      'dependentSchemas': SchemaNodePlanBuilder.asMap(schema.dependentSchemas),
      'dynamicAnchor': Predicates.isString(schema.$dynamicAnchor) ? schema.$dynamicAnchor : undefined,
      'dynamicReference': Predicates.isString(schema.$dynamicRef) ? schema.$dynamicRef : undefined,
      'else': schema.else,
      'enum': SchemaNodePlanBuilder.asArray(schema.enum),
      'exclusiveMaximum': Predicates.isNumberType(schema.exclusiveMaximum) ? schema.exclusiveMaximum : undefined,
      'exclusiveMinimum': Predicates.isNumberType(schema.exclusiveMinimum) ? schema.exclusiveMinimum : undefined,
      'format': Predicates.isString(schema.format) ? schema.format : undefined,
      'id': Predicates.isString(schema.$id) ? schema.$id : undefined,
      'if': schema.if,
      'items': schema.items,
      'maximum': Predicates.isNumberType(schema.maximum) ? schema.maximum : undefined,
      'maximumContains': Predicates.isNumberType(schema.maxContains) ? schema.maxContains : undefined,
      'maximumItems': Predicates.isNumberType(schema.maxItems) ? schema.maxItems : undefined,
      'maximumLength': Predicates.isNumberType(schema.maxLength) ? schema.maxLength : undefined,
      'maximumProperties': Predicates.isNumberType(schema.maxProperties) ? schema.maxProperties : undefined,
      'minimum': Predicates.isNumberType(schema.minimum) ? schema.minimum : undefined,
      'minimumContains': Predicates.isNumberType(schema.minContains) ? schema.minContains : undefined,
      'minimumItems': Predicates.isNumberType(schema.minItems) ? schema.minItems : undefined,
      'minimumLength': Predicates.isNumberType(schema.minLength) ? schema.minLength : undefined,
      'minimumProperties': Predicates.isNumberType(schema.minProperties) ? schema.minProperties : undefined,
      'multipleOf': Predicates.isNumberType(schema.multipleOf) ? schema.multipleOf : undefined,
      'not': schema.not,
      'oneOf': SchemaNodePlanBuilder.asArray(schema.oneOf),
      'pattern': Predicates.isString(schema.pattern) ? schema.pattern : undefined,
      'patternProperties': SchemaNodePlanBuilder.asMap(schema.patternProperties),
      'prefixItems': SchemaNodePlanBuilder.asArray(schema.prefixItems),
      'properties': SchemaNodePlanBuilder.asMap(schema.properties),
      'propertyNames': schema.propertyNames,
      'reference': Predicates.isString(schema.$ref) ? schema.$ref : undefined,
      'required': SchemaNodePlanBuilder.asStringArray(schema.required),
      'schemaPointer': schemaPointer,
      'thenSchema': schema.then,
      'type': SchemaNodePlanBuilder.asTypeList(schema.type),
      'unevaluatedItems': schema.unevaluatedItems,
      'unevaluatedProperties': schema.unevaluatedProperties,
      'uniqueItems': schema.uniqueItems === true
    };
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
}
