import { Predicates } from '@studnicky/types/browser';

import { SCHEMA_ANCHOR_INDEX_CONSTANTS } from './constants/SchemaAnchorIndexConstants.js';
import { SchemaPointer } from './SchemaPointer.js';

/** One-time, whole-document index of every `$anchor`/`$dynamicAnchor` name to its JSON Pointer, memoised per root schema. */
export class SchemaAnchorIndex {
  private static readonly CACHE = new WeakMap<object, ReadonlyMap<string, string>>();

  public static resolve(rootSchema: unknown, anchorName: string): string | undefined {
    if (!Predicates.isRecord(rootSchema)) { return undefined; }
    let index = SchemaAnchorIndex.CACHE.get(rootSchema);
    if (index === undefined) {
      const built = new Map<string, string>();
      SchemaAnchorIndex.walk(rootSchema, '#', built);
      SchemaAnchorIndex.CACHE.set(rootSchema, built);
      index = built;
    }
    const result = index.get(anchorName);
    return result;
  }

  private static walk(node: unknown, pointer: string, index: Map<string, string>): void {
    if (!Predicates.isRecord(node)) { return; }
    const anchor = Reflect.get(node, '$anchor');
    if (Predicates.isString(anchor)) { index.set(anchor, pointer); }
    const dynamicAnchor = Reflect.get(node, '$dynamicAnchor');
    if (Predicates.isString(dynamicAnchor)) { index.set(dynamicAnchor, pointer); }

    SCHEMA_ANCHOR_INDEX_CONSTANTS.structuralChildKeys.forEach((key) => {
      SchemaAnchorIndex.walk(Reflect.get(node, key), SchemaPointer.append(pointer, key), index);
    });
    SCHEMA_ANCHOR_INDEX_CONSTANTS.structuralChildArrayKeys.forEach((key) => {
      const child: unknown = Reflect.get(node, key);
      if (!Predicates.isArray(child)) { return; }
      const count = child.length;
      for (let itemIndex = 0; itemIndex < count; itemIndex += 1) {
        SchemaAnchorIndex.walk(child[itemIndex], SchemaPointer.append(pointer, `${key}/${itemIndex}`), index);
      }
    });
    SCHEMA_ANCHOR_INDEX_CONSTANTS.structuralChildMapKeys.forEach((key) => {
      const child: unknown = Reflect.get(node, key);
      if (!Predicates.isRecord(child)) { return; }
      const propertyNames = Object.keys(child);
      const count = propertyNames.length;
      for (let nameIndex = 0; nameIndex < count; nameIndex += 1) {
        const propertyName = propertyNames[nameIndex]!;
        SchemaAnchorIndex.walk(Reflect.get(child, propertyName), SchemaPointer.append(pointer, `${key}/${propertyName}`), index);
      }
    });
  }
}
