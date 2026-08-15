import type { Rule } from 'eslint';

import { AstHelpers } from '../shared/astHelpers.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';
import { MESSAGE, RULE_NAME } from './constants/EvalFunctionConstants.js';

class EvalAstHelpers {
  /** `eval` (direct identifier reference to the global). */
  public static isEvalIdentifier(node: unknown): boolean {
    return ObjectGuard.isObject(node) && node.type === 'Identifier' && node.name === 'eval';
  }

  /** `globalThis["eval"]`, `window.eval`, `globalThis.eval` — member access resolving to the global `eval`. */
  public static isEvalMemberExpression(node: unknown): boolean {
    if (!ObjectGuard.isObject(node) || node.type !== 'MemberExpression') { return false; }

    const object = node.object;
    if (!ObjectGuard.isObject(object) || object.type !== 'Identifier') { return false; }

    const objectName = object.name;
    if (objectName !== 'globalThis' && objectName !== 'window' && objectName !== 'self') { return false; }

    const property = node.property;
    if (!ObjectGuard.isObject(property)) { return false; }

    if (node.computed === true) {
      return property.type === 'Literal' && property.value === 'eval';
    }

    return property.type === 'Identifier' && property.name === 'eval';
  }

  /** `(0, eval)` — a SequenceExpression whose final expression resolves to `eval`, the classic indirect-eval idiom. */
  public static isEvalSequenceExpression(node: unknown): boolean {
    if (!ObjectGuard.isObject(node) || node.type !== 'SequenceExpression') { return false; }

    const expressions = node.expressions;
    if (!Array.isArray(expressions) || expressions.length === 0) { return false; }

    const last: unknown = (expressions as readonly unknown[]).at(-1);
    return EvalAstHelpers.isEvalIdentifier(last) || EvalAstHelpers.isEvalMemberExpression(last);
  }

  public static isEvalReference(node: unknown): boolean {
    return EvalAstHelpers.isEvalIdentifier(node)
      || EvalAstHelpers.isEvalMemberExpression(node)
      || EvalAstHelpers.isEvalSequenceExpression(node);
  }

  public static isNewFunctionExpression(node: unknown): boolean {
    if (!ObjectGuard.isObject(node) || node.type !== 'NewExpression') { return false; }
    return AstHelpers.getIdentifierName(node.callee) === 'Function';
  }
}

export const evalFunction: Rule.RuleModule = {
  'create': (context) => {
    // Scope-aware alias tracking: `const e = eval; e(...)` is flagged by
    // remembering every `const`/`let` binding initialized directly from an
    // eval reference, then flagging calls through that identifier.
    const evalAliasNames = new Set<string>();

    const report = (node: Rule.Node): void => {
      context.report({ 'messageId': 'forbidden', 'node': node });
    };

    const onVariableDeclarator: NonNullable<Rule.RuleListener['VariableDeclarator']> = (node) => {
      const rawNode = node as unknown as Record<string, unknown>;
      const id = rawNode.id;
      const init = rawNode.init;

      if (!ObjectGuard.isObject(id) || id.type !== 'Identifier') { return; }
      if (!EvalAstHelpers.isEvalReference(init)) { return; }

      const name = AstHelpers.getIdentifierName(id);
      if (typeof name === 'string') { evalAliasNames.add(name); }
    };

    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      const rawNode = node as unknown as Record<string, unknown>;
      const callee = rawNode.callee;

      if (EvalAstHelpers.isEvalReference(callee)) {
        report(node);
        return;
      }

      const calleeName = AstHelpers.getIdentifierName(callee);
      if (typeof calleeName === 'string' && evalAliasNames.has(calleeName)) {
        report(node);
      }
    };

    const onNewExpression: NonNullable<Rule.RuleListener['NewExpression']> = (node) => {
      if (EvalAstHelpers.isNewFunctionExpression(node)) {
        report(node);
      }
    };

    return {
      'CallExpression': onCallExpression,
      'NewExpression': onNewExpression,
      'VariableDeclarator': onVariableDeclarator
    };
  },
  'meta': {
    'docs': {
      'description': MESSAGE,
      'recommended': false
    },
    'messages': { 'forbidden': `${RULE_NAME}: ${MESSAGE}` },
    'schema': [],
    'type': 'problem'
  }
};
