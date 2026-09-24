import { Predicates } from '@studnicky/types/browser';

import type { SchemaResourceIndexInterface } from './interfaces/SchemaResourceIndexInterface.js';
import type { SchemaResourceInterface } from './interfaces/SchemaResourceInterface.js';

import { SCHEMA_RESOURCE_INDEX_CONSTANTS } from './constants/SchemaResourceIndexConstants.js';
import { SchemaPointer } from './SchemaPointer.js';
import { UriReference } from './UriReference.js';

interface WalkAccumulatorInterface {
  readonly 'anchors': Map<string, string>;
  readonly 'dynamicAnchors': Map<string, string>;
  readonly 'resources': Map<string, SchemaResourceInterface>;
}

/** One-time whole-document walk indexing every schema resource (`$id`) and every `$anchor`/`$dynamicAnchor`, scoped to its base URI. */
export class SchemaResourceIndex {
  public static build(rootSchema: unknown, remoteSchemas: ReadonlyMap<string, unknown>): SchemaResourceIndexInterface {
    const accumulator: WalkAccumulatorInterface = { 'anchors': new Map(), 'dynamicAnchors': new Map(), 'resources': new Map() };
    SchemaResourceIndex.registerEntryDocument(rootSchema, '', accumulator);
    remoteSchemas.forEach((remoteDocument, registrationUri) => {
      SchemaResourceIndex.registerEntryDocument(remoteDocument, registrationUri, accumulator);
      if (!accumulator.resources.has(registrationUri)) {
        accumulator.resources.set(registrationUri, { 'document': remoteDocument, 'parentBase': registrationUri, 'pointerPrefix': '#' });
      }
    });

    return { 'anchors': accumulator.anchors, 'dynamicAnchors': accumulator.dynamicAnchors, 'resources': accumulator.resources };
  }

  /** A document's own `$id`, if declared, is resolved (once, by `walk`) against `parentBase` — the URI it was retrieved by. */
  private static registerEntryDocument(document: unknown, parentBase: string, accumulator: WalkAccumulatorInterface): void {
    if (SchemaResourceIndex.declaredId(document) === undefined) {
      accumulator.resources.set(parentBase, { 'document': document, 'parentBase': parentBase, 'pointerPrefix': '#' });
    }
    SchemaResourceIndex.walk(document, '#', parentBase, document, accumulator);
  }

  private static declaredId(node: unknown): string | undefined {
    if (!Predicates.isRecord(node)) { return undefined; }
    const id = Reflect.get(node, '$id');
    const result = Predicates.isString(id) ? id : undefined;
    return result;
  }

  private static walk(node: unknown, pointer: string, currentBase: string, document: unknown, accumulator: WalkAccumulatorInterface): void {
    if (!Predicates.isRecord(node)) { return; }
    const declaredId = SchemaResourceIndex.declaredId(node);
    const effectiveBase = declaredId === undefined ? currentBase : UriReference.resolve(declaredId, currentBase).base;
    if (declaredId !== undefined) {
      accumulator.resources.set(effectiveBase, { 'document': document, 'parentBase': currentBase, 'pointerPrefix': pointer });
    }

    const anchor = Reflect.get(node, '$anchor');
    if (Predicates.isString(anchor)) { accumulator.anchors.set(`${effectiveBase}#${anchor}`, pointer); }
    const dynamicAnchor = Reflect.get(node, '$dynamicAnchor');
    if (Predicates.isString(dynamicAnchor)) {
      accumulator.anchors.set(`${effectiveBase}#${dynamicAnchor}`, pointer);
      accumulator.dynamicAnchors.set(`${effectiveBase}#${dynamicAnchor}`, pointer);
    }

    SCHEMA_RESOURCE_INDEX_CONSTANTS.structuralChildKeys.forEach((key) => {
      SchemaResourceIndex.walk(Reflect.get(node, key), SchemaPointer.append(pointer, key), effectiveBase, document, accumulator);
    });
    SCHEMA_RESOURCE_INDEX_CONSTANTS.structuralChildArrayKeys.forEach((key) => {
      const child: unknown = Reflect.get(node, key);
      if (!Predicates.isArray(child)) { return; }
      const count = child.length;
      const arrayKeyPointer = SchemaPointer.append(pointer, key);
      for (let itemIndex = 0; itemIndex < count; itemIndex += 1) {
        SchemaResourceIndex.walk(child[itemIndex], SchemaPointer.append(arrayKeyPointer, String(itemIndex)), effectiveBase, document, accumulator);
      }
    });
    SCHEMA_RESOURCE_INDEX_CONSTANTS.structuralChildMapKeys.forEach((key) => {
      const child: unknown = Reflect.get(node, key);
      if (!Predicates.isRecord(child)) { return; }
      const propertyNames = Object.keys(child);
      const count = propertyNames.length;
      const mapKeyPointer = SchemaPointer.append(pointer, key);
      for (let nameIndex = 0; nameIndex < count; nameIndex += 1) {
        const propertyName = propertyNames[nameIndex]!;
        SchemaResourceIndex.walk(Reflect.get(child, propertyName), SchemaPointer.append(mapKeyPointer, propertyName), effectiveBase, document, accumulator);
      }
    });
  }
}
