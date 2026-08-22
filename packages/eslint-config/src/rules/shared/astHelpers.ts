import type ts from 'typescript';

import { ObjectGuard } from './ObjectGuard.js';

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
    if (!ObjectGuard.isObject(node)) { return undefined; }
    const type = node.type;
    const result = typeof type === 'string' ? type : undefined;
    return result;
  }

  public static getIdentifierName(node: unknown): string | undefined {
    if (!ObjectGuard.isObject(node)) { return undefined; }
    const name = node.name;
    const result = typeof name === 'string' ? name : undefined;
    return result;
  }

  public static hasTypeServices(value: unknown): value is Required<ParserServicesInterface> {
    if (!ObjectGuard.isObject(value)) { return false; }
    if (!('program' in value) || !ObjectGuard.isObject(value.program)) { return false; }
    if (typeof value.program.getTypeChecker !== 'function') { return false; }
    if (!('esTreeNodeToTSNodeMap' in value) || !ObjectGuard.isObject(value.esTreeNodeToTSNodeMap)) { return false; }

    const result = typeof value.esTreeNodeToTSNodeMap.get === 'function';
    return result;
  }
}
