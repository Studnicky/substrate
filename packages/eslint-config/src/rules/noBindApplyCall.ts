import type { Rule } from 'eslint';
import type ts from 'typescript';

type ParserServicesType = {
  readonly 'esTreeNodeToTSNodeMap'?: Map<unknown, ts.Node>;
  readonly 'program'?: ts.Program;
};

class TypeGuards {
  static isNonNullObject(value: unknown): value is Record<string, unknown> {
    return value !== null && value !== undefined && typeof value === 'object';
  }

  static hasTypeServices(value: unknown): value is Required<ParserServicesType> {
    if (!TypeGuards.isNonNullObject(value)) { return false; }
    if (!('program' in value) || !TypeGuards.isNonNullObject(value.program)) { return false; }
    if (typeof value.program.getTypeChecker !== 'function') { return false; }
    if (!('esTreeNodeToTSNodeMap' in value) || !TypeGuards.isNonNullObject(value.esTreeNodeToTSNodeMap)) { return false; }

    // Duck-type the Map: avoid cross-realm instanceof failures when the Map is from a different module instance.
    return typeof value.esTreeNodeToTSNodeMap.get === 'function';
  }
}

class BannedProperty {
  static isMatch(node: unknown): boolean {
    if (node === null || node === undefined) { return false; }
    if (typeof node !== 'object') { return false; }

    if (Reflect.get(node, 'type') === 'Identifier') {
      const name: unknown = Reflect.get(node, 'name');
      return name === 'bind' || name === 'call' || name === 'apply';
    }
    if (Reflect.get(node, 'type') === 'Literal') {
      const value: unknown = Reflect.get(node, 'value');
      return value === 'bind' || value === 'call' || value === 'apply';
    }

    return false;
  }
}

export const noBindApplyCall: Rule.RuleModule = {
  'create': (context) => {
    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      const { callee } = node;

      if (callee.type !== 'MemberExpression') { return; }
      if (!BannedProperty.isMatch(callee.property)) { return; }

      // Property name matches — now prove the receiver is a callable Function via the type checker.
      // Without that proof we do not report: "if we cannot prove it, we do not enforce it."
      const servicesUnknown: unknown = context.sourceCode.parserServices;
      if (!TypeGuards.hasTypeServices(servicesUnknown)) { return; }

      const { object } = callee;
      const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(object);
      if (tsNode === undefined) { return; }

      const checker = servicesUnknown.program.getTypeChecker();
      const type = checker.getTypeAtLocation(tsNode);

      // A callable Function has at least one call signature.
      // Class instances, plain objects, and `any` have zero call signatures — do not report.
      if (type.getCallSignatures().length === 0) { return; }

      context.report({ 'messageId': 'forbidden', 'node': node });
    };

    return { 'CallExpression': onCallExpression };
  },
  'meta': {
    'docs': {
      'description': 'Disallow Function.prototype.bind/call/apply usage.',
      'recommended': false
    },
    'messages': { 'forbidden': 'bind/call/apply are forbidden. Refactor to avoid explicit binding.' },
    'schema': [],
    'type': 'problem'
  }
};
