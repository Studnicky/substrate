import type ts from 'typescript';

import { Predicates } from '@studnicky/types';

// `esTreeNodeToTSNodeMap` is `Map`-shaped under some parser configurations and
// `WeakMap`-shaped under others (e.g. `@typescript-eslint/parser`'s
// `projectService`/`allowDefaultProject` mode) — both expose the same `.get()`
// API this rule set actually consumes, so the contract is duck-typed on that
// method rather than pinned to the `Map` constructor.
interface EsTreeToTsNodeMapLikeInterface {
  get(key: unknown): ts.Node | undefined;
}

interface ParserServicesInterface {
  readonly 'esTreeNodeToTSNodeMap'?: EsTreeToTsNodeMapLikeInterface;
  readonly 'program'?: ts.Program;
}

export class AstHelpers {
  public static getNodeType(node: unknown): string | undefined {
    if (!Predicates.isRecord(node)) { return undefined; }
    const type = node.type;
    const result = typeof type === 'string' ? type : undefined;
    return result;
  }

  /** Reads an arbitrary named property off an AST node, returning `undefined` for a non-object. */
  public static getNodeProperty(node: unknown, property: string): unknown {
    const result = Predicates.isRecord(node) ? Reflect.get(node, property) : undefined;
    return result;
  }

  public static getIdentifierName(node: unknown): string | undefined {
    if (!Predicates.isRecord(node)) { return undefined; }
    const name = node.name;
    const result = typeof name === 'string' ? name : undefined;
    return result;
  }

  /**
   * Visits every descendant of `node` (not `node` itself), recursing through own-enumerable
   * object and array properties. Skips `parent` so a node whose `.parent` back-reference has
   * already been set by ESLint's own traversal never sends this walk back up the tree.
   */
  public static forEachDescendant(node: unknown, visit: (descendant: Record<string, unknown>) => void): void {
    if (!Predicates.isRecord(node)) { return; }

    const keys = Object.keys(node);
    const keyCount = keys.length;
    for (let index = 0; index < keyCount; index += 1) {
      const key = keys[index];
      if (key === undefined || key === 'parent') { continue; }

      const value = Reflect.get(node, key);
      AstHelpers.#visitValue(value, visit);
    }
  }

  static #visitValue(value: unknown, visit: (descendant: Record<string, unknown>) => void): void {
    if (Predicates.isArray(value)) {
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        AstHelpers.#visitValue(value[index], visit);
      }
      return;
    }
    if (!Predicates.isRecord(value) || typeof value.type !== 'string') {
      return;
    }

    visit(value);
    AstHelpers.forEachDescendant(value, visit);
  }

  public static hasTypeServices(value: unknown): value is Required<ParserServicesInterface> {
    if (!Predicates.isRecord(value)) { return false; }
    if (!('program' in value) || !Predicates.isRecord(value.program)) { return false; }
    if (typeof value.program.getTypeChecker !== 'function') { return false; }
    if (!('esTreeNodeToTSNodeMap' in value) || !Predicates.isRecord(value.esTreeNodeToTSNodeMap)) { return false; }

    const result = typeof value.esTreeNodeToTSNodeMap.get === 'function';
    return result;
  }
}
