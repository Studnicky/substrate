import type { Rule } from 'eslint';

const isJsonObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const getNodeType = (node: unknown): string | undefined => {
  if (!isJsonObject(node)) {
    return undefined;
  }
  const type = node.type;

  return typeof type === 'string' ? type : undefined;
};

const getExpression = (node: unknown): unknown => {
  if (!isJsonObject(node)) {
    return undefined;
  }

  return node.expression;
};

const isTrivialExpression = (node: unknown): boolean => {
  const type = getNodeType(node);

  if (type === undefined) {
    return false;
  }
  if (
    type === 'Identifier'
    || type === 'MemberExpression'
    || type === 'CallExpression'
    || type === 'NewExpression'
    || type === 'Literal'
    || type === 'TemplateLiteral'
    || type === 'ObjectExpression'
    || type === 'ArrayExpression'
    || type === 'AwaitExpression'
    || type === 'ChainExpression'
  ) {
    return true;
  }
  if (type === 'TSAsExpression' || type === 'TSNonNullExpression') {
    return isTrivialExpression(getExpression(node));
  }

  return false;
};

const getSourceRange = (node: unknown): [number, number] | undefined => {
  if (!isJsonObject(node)) {
    return undefined;
  }
  const range = node.range;

  if (!Array.isArray(range) || range.length < 2) {
    return undefined;
  }

  const first: unknown = range[0];
  const second: unknown = range[1];

  if (typeof first !== 'number' || typeof second !== 'number') {
    return undefined;
  }

  return [first, second];
};

const createNoTrivialShim: NonNullable<Rule.RuleModule['create']> = (context) => {
  const { sourceCode } = context;

  const fixBlockBody = (fixer: Rule.RuleFixer, statement: unknown, argument: unknown): Rule.Fix | null => {
    const argRange = getSourceRange(argument);
    const stmtRange = getSourceRange(statement);

    if (!argRange || !stmtRange) {
      return null;
    }
    const argText = sourceCode.getText().slice(argRange[0], argRange[1]);
    const stmtText = sourceCode.getText().slice(stmtRange[0], stmtRange[1]);
    const indent = (/^\s*/v.exec(stmtText))?.[0] ?? '  ';
    const replacement = `const result = ${argText};\n${indent}return result;`;

    return fixer.replaceTextRange(stmtRange, replacement);
  };

  const fixExpressionBody = (fixer: Rule.RuleFixer, _node: Rule.Node, expression: unknown): Rule.Fix | null => {
    const exprRange = getSourceRange(expression);

    if (!exprRange) {
      return null;
    }
    const exprText = sourceCode.getText().slice(exprRange[0], exprRange[1]);
    const replacement = `{ const result = ${exprText}; return result; }`;

    return fixer.replaceTextRange(exprRange, replacement);
  };

  const reportIfTrivial = (
    node: Rule.Node,
    expression: unknown,
    fixFn?: (fixer: Rule.RuleFixer) => Rule.Fix | null
  ): void => {
    const type = getNodeType(expression);

    if (type === undefined) {
      return;
    }
    if (type === 'ThisExpression') {
      return;
    }
    if (!isTrivialExpression(expression)) {
      return;
    }

    // Extracting an object/array literal into `const result = <literal>` drops
    // the contextual type and widens the inferred type. Report without autofix.
    const widensWhenExtracted = type === 'ObjectExpression' || type === 'ArrayExpression';

    context.report({
      'fix': widensWhenExtracted ? null : (fixFn ?? null),
      'messageId': 'trivial',
      'node': node
    });
  };

  const reportBodyIfSingleReturn = (node: Rule.Node, body: readonly unknown[]): void => {
    if (body.length !== 1) {
      return;
    }
    const [statement] = body;

    if (statement === undefined) {
      return;
    }

    if (getNodeType(statement) !== 'ReturnStatement') {
      return;
    }
    const argument = isJsonObject(statement) ? statement.argument : undefined;

    reportIfTrivial(node, argument, (fixer) => {
      const result = fixBlockBody(fixer, statement, argument);
      return result;
    });
  };

  const onArrowFunctionExpression: NonNullable<Rule.RuleListener['ArrowFunctionExpression']> = (node) => {
    if (node.body.type === 'BlockStatement') {
      reportBodyIfSingleReturn(node, node.body.body);

      return;
    }
    reportIfTrivial(node, node.body, (fixer) => {
      const result = fixExpressionBody(fixer, node, node.body);
      return result;
    });
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

    if (body !== undefined) {
      reportBodyIfSingleReturn(node, body);
    }
  };

  const onProperty: NonNullable<Rule.RuleListener['Property']> = (node) => {
    if (
      !(
        node.value.type === 'FunctionExpression'
        || node.value.type === 'ArrowFunctionExpression'
      )
    ) {
      return;
    }
    const propertyFunction = node.value;

    if (propertyFunction.type === 'ArrowFunctionExpression' && propertyFunction.body.type !== 'BlockStatement') {
      reportIfTrivial(node, propertyFunction.body, (fixer) => {
        const result = fixExpressionBody(fixer, node, propertyFunction.body);
        return result;
      });

      return;
    }
    if (propertyFunction.body.type !== 'BlockStatement') {
      return;
    }
    reportBodyIfSingleReturn(node, propertyFunction.body.body);
  };

  return {
    'ArrowFunctionExpression': onArrowFunctionExpression,
    'FunctionDeclaration': onFunctionDeclaration,
    'FunctionExpression': onFunctionExpression,
    'MethodDefinition': onMethodDefinition,
    'Property': onProperty
  };
};

export const noTrivialShim: Rule.RuleModule = {
  'create': createNoTrivialShim,
  'meta': {
    'docs': {
      'description': 'Disallow trivial shim functions that only forward/return a value.',
      'recommended': false
    },
    'fixable': 'code',
    'messages': { 'trivial': 'Trivial shim functions are forbidden. Inline the logic at the call site.' },
    'schema': [],
    'type': 'problem'
  }
};
