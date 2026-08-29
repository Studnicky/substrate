import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types';

import { AstHelpers } from '../shared/astHelpers.js';
import { MESSAGE, RULE_NAME } from './constants/EvalFunctionConstants.js';

class EvalAstHelpers {
  /** `eval` (direct identifier reference to the global). */
  public static isEvalIdentifier(node: unknown): boolean {
    const result = Predicates.isRecord(node) && node.type === 'Identifier' && node.name === 'eval';
    return result;
  }

  /** `globalThis["eval"]`, `window.eval`, `globalThis.eval` — member access resolving to the global `eval`. */
  public static isEvalMemberExpression(node: unknown): boolean {
    if (!Predicates.isRecord(node) || node.type !== 'MemberExpression') { return false; }

    const object = node.object;
    if (!Predicates.isRecord(object) || object.type !== 'Identifier') { return false; }

    const objectName = object.name;
    if (objectName !== 'globalThis' && objectName !== 'window' && objectName !== 'self') { return false; }

    const property = node.property;
    if (!Predicates.isRecord(property)) { return false; }

    if (node.computed === true) {
      const result = property.type === 'Literal' && property.value === 'eval';
      return result;
    }

    const result = property.type === 'Identifier' && property.name === 'eval';
    return result;
  }

  /** `(0, eval)` — a SequenceExpression whose final expression resolves to `eval`, the classic indirect-eval idiom. */
  public static isEvalSequenceExpression(node: unknown): boolean {
    if (!Predicates.isRecord(node) || node.type !== 'SequenceExpression') { return false; }

    const expressions = node.expressions;
    if (!Array.isArray(expressions) || expressions.length === 0) { return false; }

    const last: unknown = (expressions as readonly unknown[]).at(-1);
    const result = EvalAstHelpers.isEvalIdentifier(last) || EvalAstHelpers.isEvalMemberExpression(last);
    return result;
  }

  public static isEvalReference(node: unknown): boolean {
    const result = EvalAstHelpers.isEvalIdentifier(node)
      || EvalAstHelpers.isEvalMemberExpression(node)
      || EvalAstHelpers.isEvalSequenceExpression(node);
    return result;
  }

  public static isNewFunctionExpression(node: unknown): boolean {
    if (!Predicates.isRecord(node) || node.type !== 'NewExpression') { return false; }
    const result = AstHelpers.getIdentifierName(node.callee) === 'Function';
    return result;
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

      if (!Predicates.isRecord(id) || id.type !== 'Identifier') { return; }
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
