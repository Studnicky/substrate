/**
 * Draft — Immer-style "mutate a draft, get an immutable result" primitive.
 *
 * `Draft.produce` wraps a base value in a recursive, memoized `Proxy` (the
 * "draft"). Writes made to the draft inside `recipe` land on a copy-on-write
 * shadow, never on `base`. The returned value is a new plain object/array
 * reflecting only the paths that were written — every untouched branch is the
 * *same reference* as in `base` (structural sharing), so callers can cheaply
 * diff subtrees via `===`.
 *
 * `Draft.producePatch` runs the same mechanics and additionally returns the
 * RFC-6902 patch (this package's own `PatchOperationInterface` shape — see
 * `Patch.ts`) describing the difference between `base` and the result.
 * Replaying that patch through `Patch.create(patch).apply(base)` reproduces
 * `next`.
 *
 * Drafts contain canonical JSON values. Callers parse external values through
 * `JsonValueEntity.intake` before calling this API; nested plain objects and
 * arrays recurse into a new memoized proxy on first access.
 *
 * Subclass `Draft` and override any `protected static` step to customise
 * draftability or diffing.
 */

import { JsonValue } from '@studnicky/types';

import type { JsonObjectEntity } from '../entities/JsonObjectEntity.js';
import type { PatchOperationEntity } from '../entities/PatchOperationEntity.js';
import type { DraftNodeInterface } from '../interfaces/DraftNodeInterface.js';

import { SLASH_PATTERN, TILDE_PATTERN } from '../constants/JsonPointerConstants.js';
import { JsonValueEntity } from '../entities/JsonValueEntity.js';
import { DataType } from './DataType.js';

export class Draft {
  // ---------------------------------------------------------------------------
  // Protected steps — override in subclasses to customise draft behaviour
  // ---------------------------------------------------------------------------

  /** Return `true` when `value` should be wrapped in a nested draft proxy. */
  protected static isDraftable(
    value: JsonValueEntity.Type
  ): value is JsonObjectEntity.Type | JsonValueEntity.Type[] {
    const result = Array.isArray(value) || DataType.isPlainObject(value);
    return result;
  }

  /** Return a canonical JSON value or reject a non-JSON draft patch operand. */
  protected static requireJsonValue(value: JsonValueEntity.Type): JsonValueEntity.Type {
    if (!JsonValue.is(value)) {
      throw new TypeError('Draft patches require finite, acyclic JSON values');
    }

    return value;
  }

  /** Create a fresh draft node wrapping `base`. */
  protected static createNode(base: JsonValueEntity.Type): DraftNodeInterface {
    return {
      'base': base,
      'children': new Map<PropertyKey, DraftNodeInterface>(),
      'copy': undefined,
      'isArray': Array.isArray(base),
      'proxies': new Map<PropertyKey, object>()
    };
  }

  /** Copy-on-write: create `node.copy` from `node.base` on first mutation. */
  protected static ensureCopy(
    node: DraftNodeInterface
  ): Record<PropertyKey, JsonValueEntity.Type> | JsonValueEntity.Type[] {
    if (node.copy === undefined) {
      if (Array.isArray(node.base)) {
        node.copy = Array.from(node.base);
      } else if (DataType.isRecord(node.base)) {
        node.copy = { ...node.base };
      } else {
        node.copy = {};
      }
    }

    return node.copy;
  }

  /** Return `true` when `node` or any descendant carries a write. */
  protected static isDirty(node: DraftNodeInterface): boolean {
    if (node.copy !== undefined) {
      return true;
    }

    for (const child of node.children.values()) {
      if (this.isDirty(child)) {
        return true;
      }
    }

    return false;
  }

  /** Return (creating if needed) the memoized child proxy for `node[key]`. */
  protected static getChildProxy(
    node: DraftNodeInterface,
    key: PropertyKey,
    value: JsonObjectEntity.Type | JsonValueEntity.Type[]
  ): object {
    const existingChild = node.children.get(key);

    if (existingChild?.base === value) {
      const existingProxy = node.proxies.get(key);
      if (existingProxy !== undefined) {
        return existingProxy;
      }
    }

    const childNode = this.createNode(value);
    const childProxy = this.createProxy(childNode);

    node.children.set(key, childNode);
    node.proxies.set(key, childProxy);

    const result = childProxy;
    return result;
  }

  /** Build the `Proxy` handler for a single draft node. */
  protected static createProxy(node: DraftNodeInterface): object {
    const target: Record<PropertyKey, JsonValueEntity.Type> | JsonValueEntity.Type[] = node.isArray ? [] : {};

    const deletePropertyHandler = (_target: Record<PropertyKey, JsonValueEntity.Type> | JsonValueEntity.Type[], prop: PropertyKey): boolean => {
      const copy = this.ensureCopy(node);

      node.children.delete(prop);
      node.proxies.delete(prop);
      Reflect.deleteProperty(copy, prop);

      return true;
    };

    const getHandler = (_target: Record<PropertyKey, JsonValueEntity.Type> | JsonValueEntity.Type[], prop: PropertyKey): unknown => {
      const source = node.copy ?? node.base;

      if (source === null || typeof source !== 'object') {
        return undefined;
      }

      const rawValue: unknown = Reflect.get(source, prop, source);
      if (!JsonValueEntity.validate(rawValue)) {
        throw new TypeError('Draft node contains a non-JSON value');
      }
      const value = rawValue;

      if (typeof prop === 'symbol' || !this.isDraftable(value)) {
        return value;
      }

      const result = this.getChildProxy(node, prop, value);
      return result;
    };

    const getOwnPropertyDescriptorHandler = (_target: Record<PropertyKey, JsonValueEntity.Type> | JsonValueEntity.Type[], prop: PropertyKey): PropertyDescriptor | undefined => {
      const source = node.copy ?? node.base;

      if (source === null || typeof source !== 'object') {
        return undefined;
      }

      const descriptor = Reflect.getOwnPropertyDescriptor(source, prop);

      if (descriptor === undefined) {
        return undefined;
      }

      descriptor.configurable = !(node.isArray && prop === 'length');

      return descriptor;
    };

    const hasHandler = (_target: Record<PropertyKey, JsonValueEntity.Type> | JsonValueEntity.Type[], prop: PropertyKey): boolean => {
      const source = node.copy ?? node.base;

      if (source === null || typeof source !== 'object') {
        return false;
      }

      const result = Reflect.has(source, prop);
      return result;
    };

    const ownKeysHandler = (_target: Record<PropertyKey, JsonValueEntity.Type> | JsonValueEntity.Type[]): ArrayLike<string | symbol> => {
      const source = node.copy ?? node.base;

      if (source === null || typeof source !== 'object') {
        return [];
      }

      const result = Reflect.ownKeys(source);
      return result;
    };

    const setHandler = (_target: Record<PropertyKey, JsonValueEntity.Type> | JsonValueEntity.Type[], prop: PropertyKey, value: JsonValueEntity.Type): boolean => {
      const copy = this.ensureCopy(node);

      node.children.delete(prop);
      node.proxies.delete(prop);
      Reflect.set(copy, prop, value);

      return true;
    };

    const handler: ProxyHandler<Record<PropertyKey, JsonValueEntity.Type> | JsonValueEntity.Type[]> = {
      'deleteProperty': deletePropertyHandler,
      'get': getHandler,
      'getOwnPropertyDescriptor': getOwnPropertyDescriptorHandler,
      'has': hasHandler,
      'ownKeys': ownKeysHandler,
      'set': setHandler
    };

    return new Proxy(target, handler);
  }

  /** Recursively resolve a node to its finalized (structurally-shared) value. */
  protected static finalize(node: DraftNodeInterface): JsonValueEntity.Type {
    const childEntries: [PropertyKey, DraftNodeInterface, boolean][] = [];
    let anyChildDirty = false;

    for (const [key, childNode] of node.children.entries()) {
      const dirty = this.isDirty(childNode);

      childEntries.push([key, childNode, dirty]);

      if (dirty) {
        anyChildDirty = true;
      }
    }

    if (node.copy === undefined && !anyChildDirty) {
      return node.base;
    }

    const source = node.copy ?? node.base;
    let result: Record<PropertyKey, JsonValueEntity.Type> | JsonValueEntity.Type[];

    if (Array.isArray(source)) {
      result = Array.from(source);
    } else if (DataType.isRecord(source)) {
      result = { ...source };
    } else {
      return source;
    }

    const childEntryLength = childEntries.length;
    for (let index = 0; index < childEntryLength; index += 1) {
      const childEntry = childEntries[index];
      if (childEntry === undefined) {
        continue;
      }
      const [key, childNode, dirty] = childEntry;
      if (dirty) {
        Reflect.set(result, key, this.finalize(childNode));
      }
    }

    return result;
  }

  /** Diff two arbitrary values, dispatching to `diffArray`/`diffObject` or emitting `replace`. */
  protected static diffValues(
    base: JsonValueEntity.Type,
    next: JsonValueEntity.Type,
    path: string,
    ops: PatchOperationEntity.Type[]
  ): void {
    if (base === next) {
      return;
    }

    if (Array.isArray(base) && Array.isArray(next)) {
      this.diffArray(base, next, path, ops);
      return;
    }

    if (DataType.isPlainObject(base) && DataType.isPlainObject(next)) {
      this.diffObject(base, next, path, ops);
      return;
    }

    ops.push({ 'op': 'replace', 'path': path, 'value': this.requireJsonValue(next) });
  }

  /** Diff two arrays index-wise, or emit a single `replace` when the length changed. */
  protected static diffArray(
    base: JsonValueEntity.Type[],
    next: JsonValueEntity.Type[],
    path: string,
    ops: PatchOperationEntity.Type[]
  ): void {
    if (base.length !== next.length) {
      ops.push({ 'op': 'replace', 'path': path, 'value': this.requireJsonValue(next) });
      return;
    }

    const length = base.length;
    for (let index = 0; index < length; index += 1) {
      const baseValue = base[index];
      const nextValue = next[index];
      if (baseValue === undefined || nextValue === undefined) {
        continue;
      }
      this.diffValues(baseValue, nextValue, `${path}/${index}`, ops);
    }
  }

  /** Diff two plain objects key-by-key, emitting `add`/`remove`/`replace` operations. */
  protected static diffObject(
    base: JsonObjectEntity.Type,
    next: JsonObjectEntity.Type,
    path: string,
    ops: PatchOperationEntity.Type[]
  ): void {
    const baseKeys = Object.keys(base);
    const baseKeyLength = baseKeys.length;
    for (let index = 0; index < baseKeyLength; index += 1) {
      const key = baseKeys[index];
      if (key === undefined) {
        continue;
      }
      if (!(key in next)) {
        ops.push({ 'op': 'remove', 'path': `${path}/${key.replace(TILDE_PATTERN, '~0').replace(SLASH_PATTERN, '~1')}` });
      }
    }

    const nextKeys = Object.keys(next);
    const nextKeyLength = nextKeys.length;
    for (let index = 0; index < nextKeyLength; index += 1) {
      const key = nextKeys[index];
      if (key === undefined) {
        continue;
      }
      const childPath = `${path}/${key.replace(TILDE_PATTERN, '~0').replace(SLASH_PATTERN, '~1')}`;

      if (!(key in base)) {
        const value = Reflect.get(next, key);
        ops.push({ 'op': 'add', 'path': childPath, 'value': this.requireJsonValue(value) });
        continue;
      }

      this.diffValues(Reflect.get(base, key), Reflect.get(next, key), childPath, ops);
    }
  }

  // ---------------------------------------------------------------------------
  // Public static API
  // ---------------------------------------------------------------------------

  /**
   * Mutate a draft proxy of parsed `base` inside `recipe` and return a new value
   * reflecting only the written paths.
   *
   * Unchanged branches are the same reference as in `base` (structural
   * sharing); `base` itself is never mutated. A recipe that writes nothing
   * returns `base` itself (reference identity).
   */
  public static produce<T extends JsonValueEntity.Type>(base: T, recipe: (draft: T) => void): T;
  public static produce(
    base: JsonValueEntity.Type,
    recipe: (draft: JsonValueEntity.Type) => void
  ): JsonValueEntity.Type;
  public static produce(
    base: JsonValueEntity.Type,
    recipe: (draft: JsonValueEntity.Type) => void
  ): JsonValueEntity.Type {
    const rootNode = this.createNode(base);
    const proxy = this.createProxy(rootNode);

    Reflect.apply(recipe, undefined, [proxy]);

    const result = this.finalize(rootNode);
    return result;
  }

  /**
   * Same mechanics as `produce`, additionally returning the RFC-6902 patch
   * (`PatchOperationEntity.Type[]`) describing the difference between `base` and
   * the result. `Patch.create(patch).apply(base)` reproduces `next`.
   */
  public static producePatch<T extends JsonValueEntity.Type>(
    base: T,
    recipe: (draft: T) => void
  ): { 'next': T; 'patch': PatchOperationEntity.Type[] };
  public static producePatch(
    base: JsonValueEntity.Type,
    recipe: (draft: JsonValueEntity.Type) => void
  ): { 'next': JsonValueEntity.Type; 'patch': PatchOperationEntity.Type[] } {
    this.requireJsonValue(base);
    const next: JsonValueEntity.Type = Reflect.apply(this.produce, this, [base, recipe]);
    this.requireJsonValue(next);
    const ops: PatchOperationEntity.Type[] = [];

    this.diffValues(base, next, '', ops);

    return { 'next': next, 'patch': ops };
  }
}
