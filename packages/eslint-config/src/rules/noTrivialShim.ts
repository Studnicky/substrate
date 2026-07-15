import type { Rule } from 'eslint';

const isJsonObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
};

class AstHelpers {
  public static getNodeType(node: unknown): string | undefined {
    if (!isJsonObject(node)) {
      return undefined;
    }
    const type = node.type;

    return typeof type === 'string' ? type : undefined;
  }

  public static getExpression(node: unknown): unknown {
    if (!isJsonObject(node)) {
      return undefined;
    }

    return node.expression;
  }

  public static getSourceRange(node: unknown): [number, number] | undefined {
    if (!isJsonObject(node)) { return undefined; }
    const range = node.range;

    if (!Array.isArray(range) || range.length < 2) { return undefined; }

    const first: unknown = range[0];
    const second: unknown = range[1];

    if (typeof first !== 'number' || typeof second !== 'number') { return undefined; }

    return [first, second];
  }
}

const isThisRootedAccess = (node: unknown): boolean => {
  if (!isJsonObject(node)) { return false; }
  const t = AstHelpers.getNodeType(node);
  if (t === 'ThisExpression') { return true; }
  if (t === 'MemberExpression') { return isThisRootedAccess(node.object); }

  return false;
};

const isThisMemberExpression = (node: unknown): boolean => {
  if (!isJsonObject(node)) { return false; }
  if (node.type !== 'MemberExpression') { return false; }

  return isThisRootedAccess(node.object);
};

type OptionsType = {
  readonly 'allowLiterals': boolean;
  readonly 'allowMemberExpressions': boolean;
};

const DEFAULT_OPTIONS: OptionsType = {
  'allowLiterals': false,
  'allowMemberExpressions': false
};

const isTrivialExpression = (node: unknown, opts: OptionsType): boolean => {
  const type = AstHelpers.getNodeType(node);

  if (type === undefined) { return false; }

  // Factories and constructors — creating new value, not forwarding one. Never a shim.
  if (
    type === 'ObjectExpression'
    || type === 'ArrayExpression'
    || type === 'NewExpression'
  ) { return false; }

  // Accessor pattern: `return this.x` inside a method body. Not a shim — it exposes a field.
  if (type === 'MemberExpression') {
    if (isThisMemberExpression(node)) { return false; }

    return !opts.allowMemberExpressions;
  }

  // Constant literals — inline at call site rather than wrapping.
  if (type === 'Literal' || type === 'TemplateLiteral') {
    return !opts.allowLiterals;
  }

  // Pure pass-through: forwarding an identifier, delegating a call, or chaining.
  if (
    type === 'Identifier'
    || type === 'CallExpression'
    || type === 'AwaitExpression'
    || type === 'ChainExpression'
  ) { return true; }

  // Strip TS wrappers and recurse.
  if (type === 'TSAsExpression' || type === 'TSNonNullExpression' || type === 'TSSatisfiesExpression') {
    return isTrivialExpression(AstHelpers.getExpression(node), opts);
  }

  return false;
};

export const noTrivialShim: Rule.RuleModule = {
  'create': (context) => {
    const rawOptions = context.options.at(0) as Partial<OptionsType> | undefined;
    const opts: OptionsType = {
      'allowLiterals': rawOptions?.allowLiterals ?? DEFAULT_OPTIONS.allowLiterals,
      'allowMemberExpressions': rawOptions?.allowMemberExpressions ?? DEFAULT_OPTIONS.allowMemberExpressions
    };
    const { sourceCode } = context;

    const fixBlockBody = (fixer: Rule.RuleFixer, statement: unknown, argument: unknown): Rule.Fix | null => {
      const argRange = AstHelpers.getSourceRange(argument);
      const stmtRange = AstHelpers.getSourceRange(statement);

      if (argRange === undefined || stmtRange === undefined) { return null; }
      const [argStart, argEnd] = argRange;
      const [stmtStart, stmtEnd] = stmtRange;
      const argText = sourceCode.getText().slice(argStart, argEnd);
      const stmtText = sourceCode.getText().slice(stmtStart, stmtEnd);
      const match = /^\s*/v.exec(stmtText);
      const indent = match?.at(0) ?? '  ';
      const replacement = `const result = ${argText};\n${indent}return result;`;

      return fixer.replaceTextRange(stmtRange, replacement);
    };

    const fixExpressionBody = (fixer: Rule.RuleFixer, _node: Rule.Node, expression: unknown): Rule.Fix | null => {
      const exprRange = AstHelpers.getSourceRange(expression);

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
      if (!isTrivialExpression(expression, opts)) { return; }

      context.report({ 'fix': fixFn ?? null, 'messageId': 'trivial', 'node': node });
    };

    const reportBodyIfSingleReturn = (node: Rule.Node, body: readonly unknown[]): void => {
      if (body.length !== 1) { return; }
      const [statement] = body;

      if (statement === undefined) { return; }
      if (AstHelpers.getNodeType(statement) !== 'ReturnStatement') { return; }
      const argument = isJsonObject(statement) ? statement.argument : undefined;

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
      const bodyContainer = isJsonObject(rawBody) ? rawBody : null;
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
    'schema': [
      {
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
      }
    ],
    'type': 'problem'
  }
};
