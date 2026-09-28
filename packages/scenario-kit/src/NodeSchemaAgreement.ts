import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';

import { RuntimeError } from '@studnicky/errors/browser';
import { JsonObject, Predicates } from '@studnicky/types/browser';
import { isDeepStrictEqual } from 'node:util';

/** Proves a hand-authored `Schema` and its parallel `Node` describe the same shape. `Node`'s nested entries are `{schema: {...}}` wrapper objects, so this flattens them before comparing. */
export class NodeSchemaAgreement {
  private static readonly SCHEMA_LIST_KEYWORDS = ['allOf', 'anyOf', 'oneOf', 'prefixItems'] as const;
  /** JSON Schema 2020-12 annotation keywords never constrain instance validation, so either side may carry, omit, or word them differently. */
  private static readonly ANNOTATION_KEYWORDS = ['$comment', '$id', '$schema', 'default', 'deprecated', 'description', 'examples', 'readOnly', 'title', 'writeOnly'] as const;

  static assertMatches(schema: Record<string, unknown>, node: SchemaNodeInterface<unknown, unknown>): void {
    const nodeSchema = NodeSchemaAgreement.schemaOf(node);
    const flattenedNode = NodeSchemaAgreement.flattenSchema(nodeSchema);
    const flattenedSchema = NodeSchemaAgreement.flattenSchema(schema);
    if (!isDeepStrictEqual(flattenedSchema, flattenedNode)) {
      const error = RuntimeError.create(
        `Schema and Node disagree.\nSchema: ${JSON.stringify(schema)}\nNode (flattened): ${JSON.stringify(flattenedNode)}`
      );
      throw error;
    }
  }

  private static schemaOf(node: SchemaNodeInterface<unknown, unknown>): Record<string, unknown> {
    const candidate = node.schema;
    if (Predicates.isObject(candidate)) {
      return candidate;
    }
    const error = RuntimeError.create('A SchemaNode\'s own .schema must be an object.');
    throw error;
  }

  private static flattenChild(value: object | boolean): object | boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (Predicates.isObject(value) && Predicates.isObject(value.schema)) {
      const wrapped = NodeSchemaAgreement.flattenSchema(value.schema);
      return wrapped;
    }
    /** A plain nested schema carries no wrapper, so it still needs normalizing at its own level. */
    if (Predicates.isObject(value)) {
      const plain = NodeSchemaAgreement.flattenSchema(value);
      return plain;
    }
    return value;
  }

  private static flattenMap(map: Record<string, unknown>): Record<string, unknown> {
    const keys = Object.keys(map);
    const entries = new Map<string, unknown>();
    const length = keys.length;
    for (let index = 0; index < length; index += 1) {
      const key = keys[index]!;
      const value: unknown = Reflect.get(map, key);
      const flattenedValue = Predicates.isObject(value) || typeof value === 'boolean' ? NodeSchemaAgreement.flattenChild(value) : value;
      entries.set(key, flattenedValue);
    }
    const result = JsonObject.fromEntries(entries);
    return result;
  }

  private static flattenBranches(branches: readonly object[]): object[] {
    const result: object[] = [];
    const length = branches.length;
    for (let index = 0; index < length; index += 1) {
      const branch = branches[index]!;
      const flattenedBranch = NodeSchemaAgreement.flattenChild(branch);
      if (typeof flattenedBranch !== 'boolean') {
        result.push(flattenedBranch);
      }
    }
    return result;
  }

  /** An empty `required` list and an absent `required` key validate identically, so neither side's choice is a disagreement. */
  private static dropEmptyRequired(schema: Record<string, unknown>): void {
    const required = schema.required;
    if (Array.isArray(required) && required.length === 0) {
      Reflect.deleteProperty(schema, 'required');
    }
  }

  /** An empty `properties` map and an absent `properties` key validate identically — neither constrains any instance property. */
  private static dropEmptyProperties(schema: Record<string, unknown>): void {
    const properties = schema.properties;
    if (Predicates.isObject(properties) && Object.keys(properties).length === 0) {
      Reflect.deleteProperty(schema, 'properties');
    }
  }

  private static dropAnnotationKeywords(schema: Record<string, unknown>): void {
    const keywordCount = NodeSchemaAgreement.ANNOTATION_KEYWORDS.length;
    for (let index = 0; index < keywordCount; index += 1) {
      Reflect.deleteProperty(schema, NodeSchemaAgreement.ANNOTATION_KEYWORDS[index]!);
    }
  }

  private static jsonTypeOf(value: unknown): string | undefined {
    if (value === null) {
      const result = 'null';
      return result;
    }
    if (typeof value === 'string' || typeof value === 'boolean') {
      const result = typeof value;
      return result;
    }
    if (typeof value === 'number') {
      const result = Number.isInteger(value) ? 'integer' : 'number';
      return result;
    }
    return undefined;
  }

  private static satisfiesDeclaredType(value: unknown, declaredType: string): boolean {
    const actualType = NodeSchemaAgreement.jsonTypeOf(value);
    const result = actualType === declaredType || (actualType === 'integer' && declaredType === 'number');
    return result;
  }

  /** A `type` sibling fully implied by `const`/`enum` narrows nothing further — dropping it changes no accepted instance. A mixed-type `enum` is left untouched: `type` is doing real work there. */
  private static dropRedundantType(schema: Record<string, unknown>): void {
    const declaredType = schema.type;
    if (typeof declaredType !== 'string') {
      return;
    }
    if ('const' in schema) {
      if (NodeSchemaAgreement.satisfiesDeclaredType(schema.const, declaredType)) {
        Reflect.deleteProperty(schema, 'type');
      }
      return;
    }
    const enumValues = schema.enum;
    const allMembersSatisfyType = Array.isArray(enumValues) && enumValues.length > 0 && enumValues.every((value) => {
      const satisfies = NodeSchemaAgreement.satisfiesDeclaredType(value, declaredType);
      return satisfies;
    });
    if (allMembersSatisfyType) {
      Reflect.deleteProperty(schema, 'type');
    }
  }

  /** `{type: [T1, T2, ...], ...rest}` and `anyOf: [{...rest, type: T1}, {...rest, type: T2}, ...]` accept the same instances under JSON Schema 2020-12 — a keyword like `minimum` carried onto a branch it does not apply to (e.g. the `null` branch) is a no-op there, since each keyword is only evaluated against instances of the type it constrains. */
  private static normalizeTypeArray(schema: Record<string, unknown>): Record<string, unknown> {
    const declaredType = schema.type;
    const isTypeArray = Array.isArray(declaredType) && declaredType.length >= 2 && declaredType.every((candidate) => {
      const isString = typeof candidate === 'string';
      return isString;
    });
    if (!isTypeArray || 'anyOf' in schema) {
      return schema;
    }
    const rest: Record<string, unknown> = { ...schema };
    Reflect.deleteProperty(rest, 'type');
    const branches = declaredType.map((branchType: string) => {
      const branch = { ...rest, 'type': branchType };
      return branch;
    });
    const result = { 'anyOf': branches };
    return result;
  }

  /** `additionalProperties: true` and an empty-schema `additionalProperties: {}` both impose the constraint JSON Schema 2020-12 already applies by default when the keyword is absent — dropping either leaves acceptance unchanged. `additionalProperties: false` is the one value that constrains, so it is never dropped. */
  private static dropOpenAdditionalProperties(schema: Record<string, unknown>): void {
    const additionalProperties = schema.additionalProperties;
    if (additionalProperties === true || (Predicates.isObject(additionalProperties) && Object.keys(additionalProperties).length === 0)) {
      Reflect.deleteProperty(schema, 'additionalProperties');
    }
  }

  private static flattenSchema(rawSchema: Record<string, unknown>): Record<string, unknown> {
    const schema = NodeSchemaAgreement.normalizeTypeArray(rawSchema);
    const flattened: Record<string, unknown> = { ...schema };

    NodeSchemaAgreement.dropAnnotationKeywords(flattened);
    NodeSchemaAgreement.dropEmptyRequired(flattened);

    const properties = schema.properties;
    if (Predicates.isObject(properties)) {
      JsonObject.write(flattened, 'properties', NodeSchemaAgreement.flattenMap(properties));
    }
    NodeSchemaAgreement.dropEmptyProperties(flattened);

    const additionalProperties = schema.additionalProperties;
    if (Predicates.isObject(additionalProperties) || typeof additionalProperties === 'boolean') {
      JsonObject.write(flattened, 'additionalProperties', NodeSchemaAgreement.flattenChild(additionalProperties));
    }
    NodeSchemaAgreement.dropOpenAdditionalProperties(flattened);

    const items = schema.items;
    if (Predicates.isObject(items) || typeof items === 'boolean') {
      JsonObject.write(flattened, 'items', NodeSchemaAgreement.flattenChild(items));
    }

    const keywordCount = NodeSchemaAgreement.SCHEMA_LIST_KEYWORDS.length;
    for (let index = 0; index < keywordCount; index += 1) {
      const keyword = NodeSchemaAgreement.SCHEMA_LIST_KEYWORDS[index]!;
      const branches: unknown = Reflect.get(schema, keyword);
      if (Array.isArray(branches) && branches.every(Predicates.isObject)) {
        JsonObject.write(flattened, keyword, NodeSchemaAgreement.flattenBranches(branches));
      }
    }

    NodeSchemaAgreement.dropRedundantType(flattened);

    return flattened;
  }
}
