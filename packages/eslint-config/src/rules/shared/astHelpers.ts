import type { Rule } from 'eslint';
import type ts from 'typescript';

import { Predicates } from '@studnicky/types/browser';

// `esTreeNodeToTSNodeMap` is `Map`-shaped under some parser configs and `WeakMap`-shaped
// under others; duck-typed on `.get()` rather than pinned to the `Map` constructor.
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

  /** True for anything ESLint's traverser hands out — a real ESTree node always has a string `type`. */
  public static isNode(value: unknown): value is Rule.Node {
    const result = Predicates.isRecord(value) && typeof value.type === 'string';
    return result;
  }

  // ESLint's traverser attaches `.parent` to every node it hands out, regardless of access
  // path; `@types/eslint` only types this on the `RuleListener` callback parameter, not on
  // e.g. `Scope.Reference.identifier`.
  public static getParent(node: unknown): Rule.Node | null {
    if (!Predicates.isRecord(node)) { return null; }
    const parent = node.parent;
    const result = AstHelpers.isNode(parent) ? parent : null;
    return result;
  }

  // Visits every descendant of `node` (not `node` itself). Skips `parent` so a node whose
  // back-reference ESLint's traversal already set never sends this walk back up the tree.
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

  /** Duck-typed on `target`, the field every `ts.TypeReference` carries and no other `ts.Type` does, since the public API exposes no `isTypeReference` guard the way it exposes `isTupleType`/`isArrayType`. */
  public static isTypeReference(type: ts.Type): type is ts.TypeReference {
    const result = 'target' in type;

    return result;
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
