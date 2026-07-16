import type { Rule } from 'eslint';
import type { Program, Symbol, Type } from 'typescript';

import { TrivialExpression } from './shared/TrivialExpression.js';

type ModeType = 'any' | 'structural' | 'typed';

// json-schema-uninexpressible: ESLint rule-options shape validated at runtime by this rule's own meta.schema, not this package's entity/data layer
type OptionsType = {
  readonly 'mode'?: ModeType;
};

const DEFAULT_MODE: ModeType = 'structural';

const TRIVIAL_OPTS = { 'allowLiterals': false, 'allowMemberExpressions': false };

type ParserServicesType = {
  readonly 'getSymbolAtLocation': (node: unknown) => Symbol | undefined;
  readonly 'getTypeAtLocation': (node: unknown) => Type;
  readonly 'program': Program;
};

// json-schema-uninexpressible: wraps 'ParserServicesType', which itself references externally-defined 'typescript' package types (Program/Symbol/Type) one level of local-alias indirection removed — not a domain shape we own
type SourceCodeServicesAccessorType = {
  readonly 'parserServices'?: ParserServicesType;
};

class ContextHelpers {
  public static getServices(context: Rule.RuleContext): ParserServicesType | undefined {
    const result = (context.sourceCode as unknown as SourceCodeServicesAccessorType).parserServices;
    return result;
  }
}

// json-schema-uninexpressible: raw AST-node narrowing shape with 'unknown'-typed 'body' array entries (arbitrary AST nodes), which JSON Schema cannot express
type FunctionLikeNodeType = {
  readonly 'body': { readonly 'body'?: readonly unknown[]; readonly 'type': string };
};

class AstHelpers {
  public static isModuleScope(node: Rule.Node): boolean {
    const parent = node.parent;
    if (parent?.type === 'Program') { return true; }
    if (parent?.type === 'ExportNamedDeclaration' || parent?.type === 'ExportDefaultDeclaration') {
      return parent.parent?.type === 'Program';
    }
    return false;
  }

  public static isFunctionInit(init: unknown): boolean {
    if (init === null || init === undefined || typeof init !== 'object') { return false; }
    const t = (init as { 'type'?: unknown }).type;
    return t === 'ArrowFunctionExpression' || t === 'FunctionExpression';
  }

  public static isNamedType(type: Type): boolean {
    if (type.aliasSymbol !== undefined) { return true; }
    const symbol = type.getSymbol();
    if (symbol === undefined) { return false; }
    const name = symbol.getName();
    return name !== '__type' && name !== '__function';
  }

  /** Structural-mode trivia check: block body with a single trivial ReturnStatement, or a trivial expression-bodied arrow. */
  public static isBlockBodyTrivial(body: readonly unknown[]): boolean {
    if (body.length !== 1) { return false; }
    const [statement] = body;
    if (statement === undefined || typeof statement !== 'object') { return false; }
    const statementType = (statement as { 'type'?: unknown }).type;
    if (statementType !== 'ReturnStatement') { return false; }
    const argument = (statement as { 'argument'?: unknown }).argument;
    return TrivialExpression.isTrivial(argument, TRIVIAL_OPTS);
  }

  public static isStructurallyExempt(node: Rule.Node): boolean {
    const rawNode = node as unknown as FunctionLikeNodeType;
    const { body } = rawNode;
    if (body.type === 'BlockStatement') {
      return AstHelpers.isBlockBodyTrivial(body.body ?? []);
    }
    return TrivialExpression.isTrivial(body, TRIVIAL_OPTS);
  }
}

export const staticMethodVerbs: Rule.RuleModule = {
  'create': (context) => {
    const options = context.options as unknown[] | undefined;
    const rawOptions = Array.isArray(options)
      ? (options.at(0) as OptionsType | undefined)
      : undefined;
    const mode: ModeType = rawOptions?.mode ?? DEFAULT_MODE;

    const services = mode === 'typed' ? ContextHelpers.getServices(context) : undefined;
    const checker = services?.program !== undefined ? services.program.getTypeChecker() : undefined;

    if (mode === 'typed' && checker === undefined) {
      return {};
    }

    const report = (node: Rule.Node, name: string): void => {
      context.report({
        'data': { 'name': name },
        'messageId': 'freestandingFunction',
        'node': node
      });
    };

    const shouldReport = (node: Rule.Node): boolean => {
      if (mode === 'any') { return true; }
      if (mode === 'structural') { return !AstHelpers.isStructurallyExempt(node); }
      // 'typed'
      if (services === undefined || checker === undefined) { return false; }
      const type = services.getTypeAtLocation(node);
      const signature = type.getCallSignatures().at(0);
      const returnType = signature?.getReturnType();
      if (returnType === undefined) { return false; }
      return AstHelpers.isNamedType(returnType);
    };

    const onFunctionDeclaration: NonNullable<Rule.RuleListener['FunctionDeclaration']> = (node) => {
      if (!AstHelpers.isModuleScope(node)) { return; }
      const name = node.id?.name;
      if (name === undefined) { return; }
      if (!shouldReport(node)) { return; }
      report(node, name);
    };

    const onVariableDeclaration: NonNullable<Rule.RuleListener['VariableDeclaration']> = (node) => {
      if (!AstHelpers.isModuleScope(node)) { return; }
      const { declarations } = node;
      declarations.forEach((declarator) => {
        if (declarator.id.type !== 'Identifier') { return; }
        const name = declarator.id.name;
        if (!AstHelpers.isFunctionInit(declarator.init)) { return; }
        const initNode = declarator.init as unknown as Rule.Node;
        if (!shouldReport(initNode)) { return; }
        report(declarator as unknown as Rule.Node, name);
      });
    };

    return {
      'FunctionDeclaration': onFunctionDeclaration,
      'VariableDeclaration': onVariableDeclaration
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow freestanding functions at module scope. Convert to static class methods.',
      'recommended': false
    },
    'messages': {
      'freestandingFunction': "Freestanding function '{{name}}' at module scope is forbidden. Convert it to a static method on a class."
    },
    'schema': [
      {
        'additionalProperties': false,
        'properties': {
          'mode': {
            'default': 'structural',
            'description': 'Detection mode: "any" flags every module-scope function; "structural" exempts trivial pass-through bodies (already covered by inline-trivial-logic); "typed" flags only functions whose return type is a named type/interface (requires type-aware parser services).',
            'enum': ['any', 'structural', 'typed'],
            'type': 'string'
          }
        },
        'type': 'object'
      }
    ],
    'type': 'problem'
  }
};
