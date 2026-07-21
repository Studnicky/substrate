import type { Rule } from 'eslint';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import type { Program, Symbol, Type } from 'typescript';

import { ObjectGuard } from './shared/ObjectGuard.js';
import { TrivialExpression } from './shared/TrivialExpression.js';

namespace StaticMethodVerbsOptionsEntity {
  export const Schema = {
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
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}

const DEFAULT_MODE = 'structural';

const TRIVIAL_OPTS = { 'allowLiterals': false, 'allowMemberExpressions': false };

interface ParserServicesInterface {
  readonly 'getSymbolAtLocation': (node: unknown) => Symbol | undefined;
  readonly 'getTypeAtLocation': (node: unknown) => Type;
  readonly 'program': Program;
}

interface SourceCodeServicesAccessorInterface {
  readonly 'parserServices'?: ParserServicesInterface;
}

class ParserServicesGuard {
  public static hasTypeInformation(value: unknown): value is ParserServicesInterface {
    if (!ObjectGuard.isObject(value)) { return false; }
    if (typeof value.getSymbolAtLocation !== 'function' || typeof value.getTypeAtLocation !== 'function') {
      return false;
    }
    return ObjectGuard.isObject(value.program) && typeof value.program.getTypeChecker === 'function';
  }
}

class ContextHelpers {
  public static getServices(context: Rule.RuleContext): ParserServicesInterface | undefined {
    const sourceCode: SourceCodeServicesAccessorInterface = context.sourceCode;
    const services: unknown = sourceCode.parserServices;
    return ParserServicesGuard.hasTypeInformation(services) ? services : undefined;
  }
}

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
    if (!ObjectGuard.isObject(init)) { return false; }
    const t = init.type;
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
    if (!ObjectGuard.isObject(statement)) { return false; }
    const statementType = statement.type;
    if (statementType !== 'ReturnStatement') { return false; }
    const argument = statement.argument;
    return TrivialExpression.isTrivial(argument, TRIVIAL_OPTS);
  }

  public static isStructurallyExempt(node: unknown): boolean {
    if (!ObjectGuard.isObject(node) || !ObjectGuard.isObject(node.body)) { return false; }
    const { body } = node;
    if (body.type === 'BlockStatement') {
      return AstHelpers.isBlockBodyTrivial(Array.isArray(body.body) ? body.body : []);
    }
    return TrivialExpression.isTrivial(body, TRIVIAL_OPTS);
  }
}

export const staticMethodVerbs: Rule.RuleModule = {
  'create': (context) => {
    const rawOptions: unknown = context.options.at(0);
    const rawMode = ObjectGuard.isObject(rawOptions) ? rawOptions.mode : undefined;
    const mode = rawMode === 'any' || rawMode === 'structural' || rawMode === 'typed'
      ? rawMode
      : DEFAULT_MODE;

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

    const shouldReport = (node: unknown): boolean => {
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
        if (!shouldReport(declarator.init)) { return; }
        context.report({
          'data': { 'name': name },
          'messageId': 'freestandingFunction',
          'node': declarator
        });
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
    'schema': [StaticMethodVerbsOptionsEntity.Schema],
    'type': 'problem'
  }
};
