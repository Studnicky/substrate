/** RFC-6902 JSON Patch operations for arbitrary object targets. */

import { RuntimeError } from '@studnicky/errors';
import { Predicates } from '@studnicky/types';

import { ESCAPED_SLASH_PATTERN, ESCAPED_TILDE_PATTERN, SLASH_PATTERN, TILDE_PATTERN } from '../constants/JsonPointerConstants.js';
import { JsonValueEntity } from '../entities/JsonValueEntity.js';
import { PatchOperationEntity } from '../entities/PatchOperationEntity.js';
import { PatchError } from '../errors/PatchError.js';
import { ARRAY_INDEX_PATTERN } from './constants/PatchConstants.js';
import { DataType } from './DataType.js';

interface PatchSubclassInterface<TInstance extends Patch> extends Function {
  create(operations?: unknown): TInstance;
  readonly 'prototype': TInstance;
}

class PatchInstance {
  static belongsTo<TInstance extends Patch>(constructor: PatchSubclassInterface<TInstance>, value: object): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

export class Patch {
  readonly #operations: readonly PatchOperationEntity.Type[];

  /** Construct a patch after validating each supplied operation. */
  public static create<TInstance extends Patch = Patch>(this: PatchSubclassInterface<TInstance>, operations?: unknown): TInstance {
    const argumentsList = operations === undefined ? [] : [operations];
    const result: unknown = Reflect.construct(this, argumentsList);
    if (!Predicates.isObjectLike(result) || !PatchInstance.belongsTo(this, result)) {
      throw RuntimeError.create('Patch.create() did not construct the requested subclass.');
    }
    return result;
  }

  /** Build the RFC-6902 patch that transforms one JSON value into another. */
  public static diff<TInstance extends Patch = Patch>(this: PatchSubclassInterface<TInstance>, before: unknown, after: unknown): TInstance {
    const base = JsonValueEntity.intake(before);
    const next = JsonValueEntity.intake(after);
    const operations: PatchOperationEntity.Type[] = [];
    Patch.diffValues(base, next, '', operations);
    const result = this.create(operations);
    return result;
  }

  protected constructor(operations: PropertyKey | bigint | boolean | object | null | undefined = []) {
    const candidates = Predicates.isArray(operations) ? operations : [operations];
    const parsedOperations: PatchOperationEntity.Type[] = [];
    const candidateLength = candidates.length;
    for (let index = 0; index < candidateLength; index += 1) {
      const candidate: unknown = candidates[index];
      parsedOperations.push(PatchOperationEntity.intake(candidate));
    }
    this.#operations = structuredClone(parsedOperations);
  }

  private static diffArray(base: unknown[], next: unknown[], path: string, operations: PatchOperationEntity.Type[]): void {
    if (base.length !== next.length) {
      operations.push({ 'op': 'replace', 'path': path, 'value': JsonValueEntity.intake(next) });
      return;
    }
    for (let index = 0; index < base.length; index += 1) {
      Patch.diffValues(base[index], next[index], `${path}/${index}`, operations);
    }
  }

  private static diffObject(base: object, next: object, path: string, operations: PatchOperationEntity.Type[]): void {
    const baseKeys = Object.keys(base);
    for (let index = 0; index < baseKeys.length; index += 1) {
      const key = baseKeys[index];
      if (key !== undefined && !(key in next)) {
        operations.push({ 'op': 'remove', 'path': `${path}/${key.replace(TILDE_PATTERN, '~0').replace(SLASH_PATTERN, '~1')}` });
      }
    }
    const nextKeys = Object.keys(next);
    for (let index = 0; index < nextKeys.length; index += 1) {
      const key = nextKeys[index];
      if (key === undefined) {
        continue;
      }
      const childPath = `${path}/${key.replace(TILDE_PATTERN, '~0').replace(SLASH_PATTERN, '~1')}`;
      if (!(key in base)) {
        operations.push({ 'op': 'add', 'path': childPath, 'value': JsonValueEntity.intake(Reflect.get(next, key)) });
      } else {
        Patch.diffValues(Reflect.get(base, key), Reflect.get(next, key), childPath, operations);
      }
    }
  }

  private static diffValues(base: unknown, next: unknown, path: string, operations: PatchOperationEntity.Type[]): void {
    if (Object.is(base, next)) {
      return;
    }
    if (Array.isArray(base) && Array.isArray(next)) {
      Patch.diffArray(base, next, path, operations);
      return;
    }
    if (DataType.isPlainObject(base) && DataType.isPlainObject(next)) {
      Patch.diffObject(base, next, path, operations);
      return;
    }
    operations.push({ 'op': 'replace', 'path': path, 'value': JsonValueEntity.intake(next) });
  }

  /** Return a deeply isolated projection of the patch operations. */
  public get operations(): readonly PatchOperationEntity.Type[] {
    const result = structuredClone(this.#operations);
    return result;
  }

  /** Apply this patch to `target` in place and return the same target. */
  public apply<T extends Record<string, unknown>>(target: T): T {
    const operationLength = this.#operations.length;
    for (let index = 0; index < operationLength; index += 1) {
      const operation = this.#operations[index];
      if (operation !== undefined) {
        this.applyOperation(target, structuredClone(operation));
      }
    }
    const result = target;
    return result;
  }

  /** Return `true` when the patch has no operations. */
  public isEmpty(): boolean {
    const result = this.#operations.length === 0;
    return result;
  }

  /** Human-readable summary of operations. */
  public toString(): string {
    const descriptions: string[] = [];
    const operationLength = this.#operations.length;
    for (let index = 0; index < operationLength; index += 1) {
      const operation = this.#operations[index];
      if (operation !== undefined) {
        descriptions.push(this.describeOp(operation));
      }
    }
    const result = descriptions.join(', ');
    return result;
  }

  /** Parse a JSON Pointer string into path segments. */
  protected parsePath(path: string): string[] {
    if (!path.startsWith('/') && path !== '') {throw new PatchError(`Path must start with /: ${path}`, 'parsePath', path);}
    if (path === '' || path === '/') {
      const result: string[] = [];
      return result;
    }
    const rawParts = path.slice(1).split('/');
    const result: string[] = [];
    const rawPartLength = rawParts.length;
    for (let index = 0; index < rawPartLength; index += 1) {
      const part = rawParts[index];
      if (part !== undefined) {
        result.push(part.replace(ESCAPED_SLASH_PATTERN, '/').replace(ESCAPED_TILDE_PATTERN, '~'));
      }
    }
    return result;
  }

  /** Read the value at `path` from `target`. */
  protected getValue(target: Record<string, unknown>, path: string): unknown {
    let current: unknown = target;
    const parts = this.parsePath(path);
    const partLength = parts.length;
    for (let index = 0; index < partLength; index += 1) {
      const part = parts[index];
      if (part === undefined) {
        continue;
      }
      if (!Predicates.isObjectLike(current) || !Reflect.has(current, part)) {
        throw new PatchError(`Path not found: ${path}`, 'getValue', path);
      }
      current = Reflect.get(current, part);
    }
    return current;
  }

  /** Return `true` when `path` resolves to a value in `target`. */
  protected hasValue(target: Record<string, unknown>, path: string): boolean {
    try {
      this.getValue(target, path);
      return true;
    } catch {
      return false;
    }
  }

  /** Write `value` at `path`, creating intermediate objects. */
  protected setValue(target: Record<string, unknown>, path: string, value: JsonValueEntity.Type): void {
    const parts = this.parsePath(path);
    if (parts.length === 0) {return;}
    let current: unknown = target;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const part = parts[index]!;
      if (!Predicates.isObjectLike(current)) {throw new PatchError(`Intermediate path not traversable: ${path}`, 'setValue', path);}
      if (!Reflect.has(current, part)) {Reflect.set(current, part, {});}
      current = Reflect.get(current, part);
    }
    const lastPart = parts.at(-1);
    if (lastPart === undefined || !Predicates.isObjectLike(current)) {
      throw new PatchError(`Cannot set on non-object at: ${path}`, 'setValue', path);
    }
    Reflect.set(current, lastPart, value);
  }

  /** Remove the value at `path` from `target`. */
  protected removeValue(target: Record<string, unknown>, path: string): void {
    const parts = this.parsePath(path);
    if (parts.length === 0) {return;}
    let current: unknown = target;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const part = parts[index]!;
      if (!Predicates.isObjectLike(current) || !Reflect.has(current, part)) {
        throw new PatchError(`Path not found: ${path}`, 'removeValue', path);
      }
      current = Reflect.get(current, part);
    }
    const lastPart = parts.at(-1);
    if (lastPart === undefined || !Predicates.isObjectLike(current)) {
      throw new PatchError(`Cannot remove from non-object: ${path}`, 'removeValue', path);
    }
    if (Array.isArray(current)) {
      if (!ARRAY_INDEX_PATTERN.test(lastPart)) {throw new PatchError(`Invalid array index in path: ${path}`, 'removeValue', path);}
      current.splice(Number(lastPart), 1);
      return;
    }
    Reflect.deleteProperty(current, lastPart);
  }

  private applyAdd(target: Record<string, unknown>, operation: PatchOperationEntity.Type): void {
    this.setValue(target, operation.path, this.requireValue(operation));
  }

  private resolveReplaceTarget(target: Record<string, unknown>, path: string): { 'container': object; 'key': string } | undefined {
    const parts = this.parsePath(path);
    if (parts.length === 0) {return undefined;}
    let current: unknown = target;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const part = parts[index]!;
      if (!Predicates.isObjectLike(current) || !Reflect.has(current, part)) {
        throw new PatchError(`Cannot replace non-existent path: ${path}`, 'replace', path);
      }
      current = Reflect.get(current, part);
    }
    const key = parts.at(-1)!;
    if (!Predicates.isObjectLike(current) || !Reflect.has(current, key)) {
      throw new PatchError(`Cannot replace non-existent path: ${path}`, 'replace', path);
    }
    return { 'container': current, 'key': key };
  }

  private applyReplace(target: Record<string, unknown>, operation: PatchOperationEntity.Type): void {
    const resolved = this.resolveReplaceTarget(target, operation.path);
    if (resolved !== undefined) {Reflect.set(resolved.container, resolved.key, this.requireValue(operation));}
  }

  private applyRemove(target: Record<string, unknown>, operation: PatchOperationEntity.Type): void {
    this.removeValue(target, operation.path);
  }

  private applyCopy(target: Record<string, unknown>, operation: PatchOperationEntity.Type): void {
    this.setValue(target, operation.path, JsonValueEntity.intake(this.getValue(target, this.requireFrom(operation))));
  }

  private applyMove(target: Record<string, unknown>, operation: PatchOperationEntity.Type): void {
    const from = this.requireFrom(operation);
    const moved = JsonValueEntity.intake(this.getValue(target, from));
    this.removeValue(target, from);
    this.setValue(target, operation.path, moved);
  }

  private applyTest(target: Record<string, unknown>, operation: PatchOperationEntity.Type): void {
    const actual = this.getValue(target, operation.path);
    const expected = this.requireValue(operation);
    if (!DataType.deepEqual(actual, expected)) {
      throw new PatchError(`Test failed at ${operation.path}: expected ${String(expected)}, got ${String(actual)}`, operation.op, operation.path);
    }
  }

  readonly #operationAppliers = new Map<string, (target: Record<string, unknown>, operation: PatchOperationEntity.Type) => void>([
    ['add', (target, operation) => { this.applyAdd(target, operation); }],
    ['copy', (target, operation) => { this.applyCopy(target, operation); }],
    ['move', (target, operation) => { this.applyMove(target, operation); }],
    ['remove', (target, operation) => { this.applyRemove(target, operation); }],
    ['replace', (target, operation) => { this.applyReplace(target, operation); }],
    ['test', (target, operation) => { this.applyTest(target, operation); }]
  ]);

  /** Apply a single RFC-6902 operation to `target`. */
  protected applyOperation(target: Record<string, unknown>, operation: PatchOperationEntity.Type): void {
    const applier = this.#operationAppliers.get(operation.op);
    if (applier === undefined) {throw new PatchError(`Unsupported operation: ${operation.op}`, operation.op, operation.path);}
    applier(target, operation);
  }

  /** Produce a human-readable description of a single operation. */
  protected describeOp(operation: PatchOperationEntity.Type): string {
    if (operation.op === 'add' || operation.op === 'replace' || operation.op === 'test') {
      return `${operation.op.toUpperCase()} ${operation.path} = ${JSON.stringify(this.requireValue(operation))}`;
    }
    if (operation.op === 'copy' || operation.op === 'move') {
      return `${operation.op.toUpperCase()} ${this.requireFrom(operation)} → ${operation.path}`;
    }
    return `REMOVE ${operation.path}`;
  }

  private requireValue(operation: PatchOperationEntity.Type): JsonValueEntity.Type {
    if (!('value' in operation)) {throw new PatchError(`${operation.op} operation requires "value"`, operation.op, operation.path);}
    return operation.value;
  }

  private requireFrom(operation: PatchOperationEntity.Type): string {
    if (!('from' in operation)) {throw new PatchError(`${operation.op} operation requires "from"`, operation.op, operation.path);}
    return operation.from;
  }

}
