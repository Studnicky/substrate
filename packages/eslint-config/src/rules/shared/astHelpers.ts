import type ts from 'typescript';

import { ObjectGuard } from './ObjectGuard.js';

interface ParserServicesInterface {
  readonly 'esTreeNodeToTSNodeMap'?: Map<unknown, ts.Node>;
  readonly 'program'?: ts.Program;
}

export class AstHelpers {
  public static getNodeType(node: unknown): string | undefined {
    if (!ObjectGuard.isObject(node)) { return undefined; }
    const type = node.type;
    return typeof type === 'string' ? type : undefined;
  }

  public static getIdentifierName(node: unknown): string | undefined {
    if (!ObjectGuard.isObject(node)) { return undefined; }
    const name = node.name;
    return typeof name === 'string' ? name : undefined;
  }

  public static hasTypeServices(value: unknown): value is Required<ParserServicesInterface> {
    if (!ObjectGuard.isObject(value)) { return false; }
    if (!('program' in value) || !ObjectGuard.isObject(value.program)) { return false; }

    return typeof value.program.getTypeChecker === 'function'
      && 'esTreeNodeToTSNodeMap' in value
      && value.esTreeNodeToTSNodeMap instanceof Map;
  }
}
