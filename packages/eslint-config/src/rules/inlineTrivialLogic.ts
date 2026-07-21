import type { Rule } from 'eslint';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { AstHelpers } from './shared/astHelpers.js';
import { ObjectGuard } from './shared/ObjectGuard.js';
import { TrivialExpression } from './shared/TrivialExpression.js';

class SourceRangeAccess {
  public static getSourceRange(node: unknown): [number, number] | undefined {
    if (!ObjectGuard.isObject(node)) { return undefined; }
    const range = node.range;

    if (!Array.isArray(range) || range.length < 2) { return undefined; }

    const first: unknown = range[0];
    const second: unknown = range[1];

    if (typeof first !== 'number' || typeof second !== 'number') { return undefined; }

    return [first, second];
  }
}

namespace InlineTrivialLogicOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'allowLiterals': {
        'default': false,
        'description': 'Allow functions that return a constant literal (string, number, boolean).',
        'type': 'boolean'
      },
      'allowMemberExpressions': {
        'default': false,
        'description': 'Allow functions that return a non-this member expression (e.g. obj.prop).',
        'type': 'boolean'
      }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}

const DEFAULT_OPTIONS: Required<InlineTrivialLogicOptionsEntity.Type> = {
  'allowLiterals': false,
  'allowMemberExpressions': false
};

const LEADING_WHITESPACE_PATTERN = /^\s*/v;

export const inlineTrivialLogic: Rule.RuleModule = {
  'create': (context) => {
    const rawOptions: unknown = context.options.at(0);
    const opts: Required<InlineTrivialLogicOptionsEntity.Type> = {
      'allowLiterals': ObjectGuard.isObject(rawOptions) && typeof rawOptions.allowLiterals === 'boolean'
        ? rawOptions.allowLiterals
        : DEFAULT_OPTIONS.allowLiterals,
      'allowMemberExpressions': ObjectGuard.isObject(rawOptions) && typeof rawOptions.allowMemberExpressions === 'boolean'
        ? rawOptions.allowMemberExpressions
        : DEFAULT_OPTIONS.allowMemberExpressions
    };
    const { sourceCode } = context;

    const fixBlockBody = (fixer: Rule.RuleFixer, statement: unknown, argument: unknown): Rule.Fix | null => {
      const argRange = SourceRangeAccess.getSourceRange(argument);
      const stmtRange = SourceRangeAccess.getSourceRange(statement);

      if (argRange === undefined || stmtRange === undefined) { return null; }
      const [argStart, argEnd] = argRange;
      const [stmtStart, stmtEnd] = stmtRange;
      const argText = sourceCode.getText().slice(argStart, argEnd);
      const stmtText = sourceCode.getText().slice(stmtStart, stmtEnd);
      const match = LEADING_WHITESPACE_PATTERN.exec(stmtText);
      const indent = match?.at(0) ?? '  ';
      const replacement = `const result = ${argText};\n${indent}return result;`;

      return fixer.replaceTextRange(stmtRange, replacement);
    };

    const fixExpressionBody = (fixer: Rule.RuleFixer, _node: Rule.Node, expression: unknown): Rule.Fix | null => {
      const exprRange = SourceRangeAccess.getSourceRange(expression);

      if (exprRange === undefined) { return null; }
      const [exprStart, exprEnd] = exprRange;
      const exprText = sourceCode.getText().slice(exprStart, exprEnd);
      const replacement = `{ const result = ${exprText}; return result; }`;

      return fixer.replaceTextRange(exprRange, replacement);
    };

    const reportIfTrivial = (
      node: Rule.Node,
      expression: unknown,
      fixFn?: (fixer: Rule.RuleFixer) => Rule.Fix | null
    ): void => {
      const type = AstHelpers.getNodeType(expression);

      if (type === undefined) { return; }
      if (type === 'ThisExpression') { return; }
      if (!TrivialExpression.isTrivial(expression, opts)) { return; }

      context.report({ 'fix': fixFn ?? null, 'messageId': 'trivial', 'node': node });
    };

    const reportBodyIfSingleReturn = (node: Rule.Node, body: readonly unknown[]): void => {
      if (body.length !== 1) { return; }
      const [statement] = body;

      if (statement === undefined) { return; }
      if (AstHelpers.getNodeType(statement) !== 'ReturnStatement') { return; }
      const argument = ObjectGuard.isObject(statement) ? statement.argument : undefined;

      reportIfTrivial(node, argument, (fixer) => { const result = fixBlockBody(fixer, statement, argument); return result; });
    };

    const onArrowFunctionExpression: NonNullable<Rule.RuleListener['ArrowFunctionExpression']> = (node) => {
      if (node.body.type === 'BlockStatement') {
        reportBodyIfSingleReturn(node, node.body.body);
        return;
      }
      reportIfTrivial(node, node.body, (fixer) => { const result = fixExpressionBody(fixer, node, node.body); return result; });
    };

    const onFunctionDeclaration: NonNullable<Rule.RuleListener['FunctionDeclaration']> = (node) => {
      reportBodyIfSingleReturn(node, node.body.body);
    };

    const onFunctionExpression: NonNullable<Rule.RuleListener['FunctionExpression']> = (node) => {
      reportBodyIfSingleReturn(node, node.body.body);
    };

    const onMethodDefinition: NonNullable<Rule.RuleListener['MethodDefinition']> = (node) => {
      const rawBody: unknown = node.value.body;
      const bodyContainer = ObjectGuard.isObject(rawBody) ? rawBody : null;
      const bodyNodes = bodyContainer?.body;
      const body: readonly unknown[] | undefined = Array.isArray(bodyNodes) ? bodyNodes : undefined;

      if (body !== undefined) { reportBodyIfSingleReturn(node, body); }
    };

    const onProperty: NonNullable<Rule.RuleListener['Property']> = (node) => {
      if (!(node.value.type === 'FunctionExpression' || node.value.type === 'ArrowFunctionExpression')) {
        return;
      }
      const propertyFunction = node.value;

      if (propertyFunction.type === 'ArrowFunctionExpression' && propertyFunction.body.type !== 'BlockStatement') {
        reportIfTrivial(node, propertyFunction.body, (fixer) => { const result = fixExpressionBody(fixer, node, propertyFunction.body); return result; });
        return;
      }
      if (propertyFunction.body.type !== 'BlockStatement') { return; }
      reportBodyIfSingleReturn(node, propertyFunction.body.body);
    };

    return {
      'ArrowFunctionExpression': onArrowFunctionExpression,
      'FunctionDeclaration': onFunctionDeclaration,
      'FunctionExpression': onFunctionExpression,
      'MethodDefinition': onMethodDefinition,
      'Property': onProperty
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow trivial shim functions that only forward/delegate a value without adding logic.',
      'recommended': false
    },
    'fixable': 'code',
    'messages': { 'trivial': 'Trivial shim functions are forbidden. Inline the logic at the call site.' },
    'schema': [InlineTrivialLogicOptionsEntity.Schema],
    'type': 'problem'
  }
};
