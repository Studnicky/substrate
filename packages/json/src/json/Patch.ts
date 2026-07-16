/**
 * Patch — RFC-6902 JSON Patch operations.
 *
 * Supports: add, remove, replace, move, copy, test.
 * Paths must be JSON Pointer strings (RFC-6901): `/foo/bar`, `/items/0`.
 *
 * Subclass `Patch` and override any `protected` step to customise patch
 * behaviour. Static factories delegate through `this.make()` so a subclass
 * factory returns the subclass type.
 *
 * The default singleton `patch` is sufficient for most uses (prefer `Patch`
 * static factories for one-shot operations).
 */

import type { PatchOperationType, PatchOpVariantType } from '../types/index.js';

import { ESCAPED_SLASH_PATTERN, ESCAPED_TILDE_PATTERN } from '../constants/JsonPointerConstants.js';
import { PatchError } from '../errors/PatchError.js';

const VALID_OPS = new Set<PatchOpVariantType>(['add', 'copy', 'move', 'remove', 'replace', 'test']);

export class Patch {
  public readonly operations: readonly PatchOperationType[];

  /**
   * Canonical entry point — validates operations and returns a `Patch` instance.
   *
   * Subclasses inherit this as `SubClass.create(...)` and receive the subclass
   * type because `new this(...)` resolves to the receiver's concrete class.
   */
  public static create(operations: PatchOperationType | readonly PatchOperationType[] = []): Patch {
    return new this(operations);
  }

  protected constructor(operations: PatchOperationType | readonly PatchOperationType[] = []) {
    const ops: readonly PatchOperationType[] = Array.isArray(operations)
      ? (operations as readonly PatchOperationType[])
      : [operations as PatchOperationType];

    const opsLen = ops.length;
    for (let i = 0; i < opsLen; i += 1) {
      const operation = ops[i]!;
      if (!VALID_OPS.has(operation.op)) {
        throw new PatchError(
          `Invalid patch operation "${String(operation.op)}"; must be one of: ${[...VALID_OPS].join(', ')}`,
          String(operation.op),
          operation.path
        );
      }
    }

    this.operations = ops;
  }

  // ---------------------------------------------------------------------------
  // Protected factory seam — subclasses override to return their own type
  // ---------------------------------------------------------------------------

  /**
   * Create a new `Patch` instance from a list of operations.
   *
   * Subclasses override this to return an instance of the subclass, enabling
   * static factory methods (`add`, `remove`, etc.) to return the correct type
   * when called on the subclass constructor.
   */
  protected static make(ops: PatchOperationType | readonly PatchOperationType[]): Patch {
    const result = new this(ops);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Static factory methods
  // ---------------------------------------------------------------------------

  /** Create a patch that adds `value` at `path`. */
  public static add(path: string, value: unknown): Patch {
    const result = this.make({ 'op': 'add', 'path': path, 'value': value });
    return result;
  }

  /** Combine multiple patches into a single patch. */
  public static combine(...patches: readonly Patch[]): Patch {
    const ops = patches.flatMap((p) => {
      const patchOps: PatchOperationType[] = [...p.operations];
      return patchOps;
    });

    return this.make(ops);
  }

  /** Create a patch that copies a value from `from` to `path`. */
  public static copy(from: string, path: string): Patch {
    const result = this.make({ 'from': from, 'op': 'copy', 'path': path });
    return result;
  }

  /** Deserialize a patch from a plain-object representation. */
  public static fromPlain(plain: { readonly 'operations': readonly PatchOperationType[] }): Patch {
    const result = this.make(plain.operations);
    return result;
  }

  /** Create a patch that moves a value from `from` to `path`. */
  public static move(from: string, path: string): Patch {
    const result = this.make({ 'from': from, 'op': 'move', 'path': path });
    return result;
  }

  /** Create a patch that removes the value at `path`. */
  public static remove(path: string): Patch {
    const result = this.make({ 'op': 'remove', 'path': path });
    return result;
  }

  /** Create a patch that replaces the value at `path` with `value`. */
  public static replace(path: string, value: unknown): Patch {
    const result = this.make({ 'op': 'replace', 'path': path, 'value': value });
    return result;
  }

  /** Create a patch that tests the value at `path` equals `value`. */
  public static test(path: string, value: unknown): Patch {
    const result = this.make({ 'op': 'test', 'path': path, 'value': value });
    return result;
  }

  // ---------------------------------------------------------------------------
  // Instance methods
  // ---------------------------------------------------------------------------

  /**
   * Apply this patch to `target` (mutates target in-place, per RFC-6902).
   *
   * Throws `PatchError` if any operation cannot be applied.
   */
  public apply(target: Record<string, unknown>): Record<string, unknown> {
    for (const op of this.operations) {
      this.applyOperation(target, op);
    }

    return target;
  }

  /** Return `true` when the patch has no operations. */
  public isEmpty(): boolean {
    return this.operations.length === 0;
  }

  /** Return a copy of the operations array. */
  public getOperations(): PatchOperationType[] {
    const ops: PatchOperationType[] = [...this.operations];
    return ops;
  }

  /** Serialize to a plain object. */
  public toPlain(): { readonly 'operations': readonly PatchOperationType[] } {
    const plain = { 'operations': this.operations };
    return plain;
  }

  /** Human-readable summary of operations. */
  public toString(): string {
    const result = this.operations
      .map((op) => { const result = this.describeOp(op); return result; })
      .join(', ');
    return result;
  }

  // ---------------------------------------------------------------------------
  // Protected implementation steps — override to customise behaviour
  // ---------------------------------------------------------------------------

  /** Parse a JSON Pointer string into path segments. */
  protected parsePath(path: string): string[] {
    if (!path.startsWith('/') && path !== '') {
      throw new PatchError(`Path must start with /: ${path}`, 'parsePath', path);
    }
    if (path === '' || path === '/') {
      return [];
    }

    return path.slice(1).split('/').map((part) =>
    { const result = part.replace(ESCAPED_SLASH_PATTERN, '/').replace(ESCAPED_TILDE_PATTERN, '~'); return result; }
    );
  }

  /** Read the value at `path` from `target`. */
  protected getValue(target: Record<string, unknown>, path: string): unknown {
    const parts = this.parsePath(path);
    let current: unknown = target;

    const partsLen = parts.length;
    for (let i = 0; i < partsLen; i++) {
      const part = parts[i]!;

      if (current === null || current === undefined) {
        throw new PatchError(`Path not found: ${path}`, 'getValue', path);
      }
      if (typeof current !== 'object') {
        throw new PatchError(`Path not found: ${path}`, 'getValue', path);
      }
      const asRecord = current as Record<string, unknown>;

      if (!(part in asRecord)) {
        throw new PatchError(`Path not found: ${path}`, 'getValue', path);
      }
      current = asRecord[part];
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

  /** Write `value` at `path` in `target`, creating intermediate objects. */
  protected setValue(target: Record<string, unknown>, path: string, value: unknown): void {
    const parts = this.parsePath(path);

    if (parts.length === 0) {
      // Replace root — not applicable to in-place mutation; caller must handle
      return;
    }

    let current: unknown = target;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      if (part === undefined) {
        break;
      }

      if (current === null || typeof current !== 'object') {
        throw new PatchError(`Intermediate path not traversable: ${path}`, 'setValue', path);
      }

      const asRecord = current as Record<string, unknown>;

      if (!(part in asRecord)) {
        asRecord[part] = {};
      }
      current = asRecord[part];
    }

    const lastPart = parts.at(-1);

    if (lastPart === undefined) {
      return;
    }

    if (current === null || typeof current !== 'object') {
      throw new PatchError(`Cannot set on non-object at: ${path}`, 'setValue', path);
    }

    (current as Record<string, unknown>)[lastPart] = value;
  }

  /** Remove the value at `path` from `target`. */
  protected removeValue(target: Record<string, unknown>, path: string): void {
    const parts = this.parsePath(path);

    if (parts.length === 0) {
      return;
    }

    let current: unknown = target;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      if (part === undefined) {
        break;
      }

      if (current === null || typeof current !== 'object') {
        throw new PatchError(`Path not found: ${path}`, 'removeValue', path);
      }

      const asRecord = current as Record<string, unknown>;

      if (!(part in asRecord)) {
        throw new PatchError(`Path not found: ${path}`, 'removeValue', path);
      }
      current = asRecord[part];
    }

    const lastPart = parts.at(-1);

    if (lastPart === undefined) {
      return;
    }

    if (current === null || typeof current !== 'object') {
      throw new PatchError(`Cannot remove from non-object: ${path}`, 'removeValue', path);
    }

    if (Array.isArray(current)) {
      const idx = parseInt(lastPart, 10);

      current.splice(idx, 1);
    } else {
      const asRecord = current as Record<string, unknown>;

      Reflect.deleteProperty(asRecord, lastPart);
    }
  }

  /** Apply a single RFC-6902 `add` operation. */
  private applyAdd(target: Record<string, unknown>, op: PatchOperationType): void {
    this.setValue(target, op.path, op.value);
  }

  /** Apply a single RFC-6902 `replace` operation. */
  private applyReplace(target: Record<string, unknown>, op: PatchOperationType): void {
    if (!this.hasValue(target, op.path)) {
      throw new PatchError(
        `Cannot replace non-existent path: ${op.path}`,
        op.op,
        op.path
      );
    }
    this.setValue(target, op.path, op.value);
  }

  /** Apply a single RFC-6902 `remove` operation. */
  private applyRemove(target: Record<string, unknown>, op: PatchOperationType): void {
    this.removeValue(target, op.path);
  }

  /** Apply a single RFC-6902 `copy` operation. */
  private applyCopy(target: Record<string, unknown>, op: PatchOperationType): void {
    if (op.from === undefined) {
      throw new PatchError('copy operation requires "from"', op.op, op.path);
    }
    const copied = this.getValue(target, op.from);

    this.setValue(target, op.path, copied);
  }

  /** Apply a single RFC-6902 `move` operation. */
  private applyMove(target: Record<string, unknown>, op: PatchOperationType): void {
    if (op.from === undefined) {
      throw new PatchError('move operation requires "from"', op.op, op.path);
    }
    const moved = this.getValue(target, op.from);

    this.removeValue(target, op.from);
    this.setValue(target, op.path, moved);
  }

  /** Apply a single RFC-6902 `test` operation. */
  private applyTest(target: Record<string, unknown>, op: PatchOperationType): void {
    const actual = this.getValue(target, op.path);

    if (actual !== op.value) {
      throw new PatchError(
        `Test failed at ${op.path}: expected ${String(op.value)}, got ${String(actual)}`,
        op.op,
        op.path
      );
    }
  }

  private static readonly operationAppliers: Record<
    string,
    (self: Patch, target: Record<string, unknown>, op: PatchOperationType) => void
  > = {
    'add': (self, target, op) => { self.applyAdd(target, op); },
    'copy': (self, target, op) => { self.applyCopy(target, op); },
    'move': (self, target, op) => { self.applyMove(target, op); },
    'remove': (self, target, op) => { self.applyRemove(target, op); },
    'replace': (self, target, op) => { self.applyReplace(target, op); },
    'test': (self, target, op) => { self.applyTest(target, op); }
  };

  /** Apply a single RFC-6902 operation to `target`. */
  protected applyOperation(target: Record<string, unknown>, op: PatchOperationType): void {
    const applier = Patch.operationAppliers[op.op];

    if (applier === undefined) {
      throw new PatchError(`Unknown patch operation: ${String(op.op)}`, String(op.op), op.path);
    }
    applier(this, target, op);
  }

  /** Produce a human-readable description of a single operation. */
  protected describeOp(op: PatchOperationType): string {
    switch (op.op) {
      case 'add':
        return `ADD ${op.path} = ${JSON.stringify(op.value)}`;
      case 'copy':
        return `COPY ${op.from ?? '?'} → ${op.path}`;
      case 'move':
        return `MOVE ${op.from ?? '?'} → ${op.path}`;
      case 'remove':
        return `REMOVE ${op.path}`;
      case 'replace':
        return `REPLACE ${op.path} = ${JSON.stringify(op.value)}`;
      case 'test':
        return `TEST ${op.path} = ${JSON.stringify(op.value)}`;
      default:
        return `${String(op.op).toUpperCase()} ${op.path}`;
    }
  }
}
