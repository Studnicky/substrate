import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';

import { RuntimeError } from '@studnicky/errors/browser';
import { JsonObject, Predicates } from '@studnicky/types/browser';
import { isDeepStrictEqual } from 'node:util';

/** Proves a hand-authored `Schema` and its parallel `Node` describe the same shape. `Node`'s nested entries are `{schema: {...}}` wrapper objects, so this flattens them before comparing. */
export class NodeSchemaAgreement {
  private static readonly BRANCH_KEYWORDS = ['allOf', 'anyOf', 'oneOf'] as const;

  static assertMatches(schema: Record<string, unknown>, node: SchemaNodeInterface<unknown, unknown>): void {
    const nodeSchema = NodeSchemaAgreement.schemaOf(node);
    const flattenedNode = NodeSchemaAgreement.flattenSchema(nodeSchema);
    if (!isDeepStrictEqual(schema, flattenedNode)) {
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
      const result = NodeSchemaAgreement.flattenSchema(value.schema);
      return result;
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

  private static flattenSchema(schema: Record<string, unknown>): Record<string, unknown> {
    const flattened: Record<string, unknown> = { ...schema };

    const properties = schema.properties;
    if (Predicates.isObject(properties)) {
      JsonObject.write(flattened, 'properties', NodeSchemaAgreement.flattenMap(properties));
    }

    const additionalProperties = schema.additionalProperties;
    if (Predicates.isObject(additionalProperties) || typeof additionalProperties === 'boolean') {
      JsonObject.write(flattened, 'additionalProperties', NodeSchemaAgreement.flattenChild(additionalProperties));
    }

    const items = schema.items;
    if (Predicates.isObject(items) || typeof items === 'boolean') {
      JsonObject.write(flattened, 'items', NodeSchemaAgreement.flattenChild(items));
    }

    const keywordCount = NodeSchemaAgreement.BRANCH_KEYWORDS.length;
    for (let index = 0; index < keywordCount; index += 1) {
      const keyword = NodeSchemaAgreement.BRANCH_KEYWORDS[index]!;
      const branches: unknown = Reflect.get(schema, keyword);
      if (Array.isArray(branches) && branches.every(Predicates.isObject)) {
        JsonObject.write(flattened, keyword, NodeSchemaAgreement.flattenBranches(branches));
      }
    }

    return flattened;
  }
}
