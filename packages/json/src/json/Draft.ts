/** Immer-style copy-on-write drafting for arbitrary in-memory values. */

import type { PatchOperationEntity } from '../entities/PatchOperationEntity.js';
import type { DraftNodeInterface } from '../interfaces/DraftNodeInterface.js';

import { DataType } from './DataType.js';
import { Patch } from './Patch.js';

export class Draft {
  /** Return whether a value should be wrapped in a nested draft proxy. */
  protected static isDraftable<T>(value: T): value is object & T {
    const result = Array.isArray(value) || DataType.isPlainObject(value);
    return result;
  }

  /** Create a fresh draft node wrapping `base`. */
  protected static createNode<T extends object>(base: T): DraftNodeInterface<T> {
    return { 'base': base, 'children': new Map(), 'copy': undefined, 'isArray': Array.isArray(base), 'proxies': new Map() };
  }

  /** Copy an array or plain object without copying its child references. */
  protected static shallowCopy<T extends object>(value: T): T;
  protected static shallowCopy(value: object): object {
    const result = Array.isArray(value) ? Array.from(value) : { ...value };
    return result;
  }

  /** Copy-on-write: create `node.copy` from `node.base` on first mutation. */
  protected static ensureCopy<T extends object>(node: DraftNodeInterface<T>): T {
    node.copy ??= this.shallowCopy(node.base);
    const result = node.copy;
    return result;
  }

  /** Return `true` when `node` or any descendant carries a write. */
  protected static isDirty(node: DraftNodeInterface): boolean {
    if (node.copy !== undefined) {return true;}
    for (const child of node.children.values()) {if (this.isDirty(child)) {return true;}}
    return false;
  }

  /** Return the memoized child proxy for a nested draftable value. */
  protected static getChildProxy(node: DraftNodeInterface, key: PropertyKey, value: object): object {
    const existingChild = node.children.get(key);
    if (existingChild?.base === value) {
      const existingProxy = node.proxies.get(key);
      if (existingProxy !== undefined) {return existingProxy;}
    }
    const childNode = this.createNode(value);
    const childProxy = this.createProxy(childNode);
    node.children.set(key, childNode);
    node.proxies.set(key, childProxy);
    const result = childProxy;
    return result;
  }

  /** Build the Proxy handler for one draft node. */
  protected static createProxy<T extends object>(node: DraftNodeInterface<T>): T {
    const deletePropertyHandler: ProxyHandler<T>['deleteProperty'] = (_target, property) => {
      const copy = this.ensureCopy(node);
      node.children.delete(property);
      node.proxies.delete(property);
      const { 'deleteProperty': removeProperty } = Reflect;
      removeProperty(copy, property);
      return true;
    };
    const getHandler: ProxyHandler<T>['get'] = (_target, property) => {
      const source = node.copy ?? node.base;
      const value = Reflect.get(source, property, source);
      if (typeof property === 'symbol' || !this.isDraftable(value)) {
        const result = value;
        return result;
      }
      const result = this.getChildProxy(node, property, value);
      return result;
    };
    const getOwnPropertyDescriptorHandler: ProxyHandler<T>['getOwnPropertyDescriptor'] = (_target, property) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(node.copy ?? node.base, property);
      if (descriptor !== undefined) {descriptor.configurable = !(node.isArray && property === 'length');}
      return descriptor;
    };
    const hasHandler: ProxyHandler<T>['has'] = (_target, property) => {
      const result = Reflect.has(node.copy ?? node.base, property);
      return result;
    };
    const ownKeysHandler: ProxyHandler<T>['ownKeys'] = () => {
      const result = Reflect.ownKeys(node.copy ?? node.base);
      return result;
    };
    const setHandler: ProxyHandler<T>['set'] = (_target, property, value) => {
      const copy = this.ensureCopy(node);
      node.children.delete(property);
      node.proxies.delete(property);
      Reflect.set(copy, property, value);
      return true;
    };
    const result = new Proxy(this.shallowCopy(node.base), {
      'deleteProperty': deletePropertyHandler,
      'get': getHandler,
      'getOwnPropertyDescriptor': getOwnPropertyDescriptorHandler,
      'has': hasHandler,
      'ownKeys': ownKeysHandler,
      'set': setHandler
    });
    return result;
  }

  /** Recursively resolve a node to its finalized structurally shared value. */
  protected static finalize<T extends object>(node: DraftNodeInterface<T>): T {
    const childEntries: [PropertyKey, DraftNodeInterface, boolean][] = [];
    let anyChildDirty = false;
    for (const [key, childNode] of node.children.entries()) {
      const dirty = this.isDirty(childNode);
      childEntries.push([key, childNode, dirty]);
      if (dirty) {anyChildDirty = true;}
    }
    if (node.copy === undefined && !anyChildDirty) {return node.base;}
    const result = this.shallowCopy(node.copy ?? node.base);
    const childEntriesLength = childEntries.length;
    for (let index = 0; index < childEntriesLength; index += 1) {
      const entry = childEntries[index];
      if (entry === undefined) {
        continue;
      }
      const [key, childNode, dirty] = entry;
      if (dirty) {Reflect.set(result, key, this.finalize(childNode));}
    }
    return result;
  }

  /** Mutate a draft proxy and return a structurally shared result. */
  public static produce<T>(base: T, recipe: (draft: T) => void): T {
    if (!this.isDraftable(base)) {return base;}
    const result = this.finalize(this.produceNode(base, recipe));
    return result;
  }

  private static produceNode<T extends object>(base: T, recipe: (draft: T) => void): DraftNodeInterface<T> {
    const node = this.createNode(base);
    Reflect.apply(recipe, undefined, [this.createProxy(node)]);
    return node;
  }

  /** Produce the next value and the JSON Patch which recreates it. */
  public static producePatch<T>(base: T, recipe: (draft: T) => void): { 'next': T; 'patch': PatchOperationEntity.Type[] } {
    const next = this.produce(base, recipe);
    const patch = [...Patch.diff(base, next).operations];
    return { 'next': next, 'patch': patch };
  }
}
