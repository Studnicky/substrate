import type { Rule } from 'eslint';

import { AstHelpers } from './astHelpers.js';

/** Decides whether a platform call's native error is handled where it is raised. */
export class PlatformCallGuard {
  /** True when `node` is lexically inside the `try` block of a try statement with a `catch` clause, or receives a promise chain that ends in `.catch(...)` or `.then(_, onRejected)`. */
  public static isGuarded(node: Rule.Node): boolean {
    const result = PlatformCallGuard.isInsideTryWithCatch(node) || PlatformCallGuard.endsInRejectionHandler(node);

    return result;
  }

  private static isInsideTryWithCatch(node: Rule.Node): boolean {
    let child: Rule.Node = node;
    let current: Rule.Node | null = AstHelpers.getParent(node);

    while (current !== null) {
      const isGuardingTry = current.type === 'TryStatement'
        && AstHelpers.isNode(AstHelpers.getNodeProperty(current, 'handler'))
        && AstHelpers.getNodeProperty(current, 'block') === child;

      if (isGuardingTry) {
        return true;
      }

      child = current;
      current = AstHelpers.getParent(current);
    }

    return false;
  }

  private static endsInRejectionHandler(node: Rule.Node): boolean {
    const member = AstHelpers.getParent(node);
    const call = member === null ? null : AstHelpers.getParent(member);
    const isChainStep = member !== null
      && call !== null
      && member.type === 'MemberExpression'
      && AstHelpers.getNodeProperty(member, 'object') === node
      && call.type === 'CallExpression'
      && AstHelpers.getNodeProperty(call, 'callee') === member;

    if (isChainStep) {
      const result = PlatformCallGuard.handlesRejection(member, call) || PlatformCallGuard.endsInRejectionHandler(call);

      return result;
    }

    return false;
  }

  private static handlesRejection(member: Rule.Node, call: Rule.Node): boolean {
    const name = AstHelpers.getNodeProperty(member, 'computed') === false ? AstHelpers.getIdentifierName(AstHelpers.getNodeProperty(member, 'property')) : undefined;
    const argumentList = AstHelpers.getNodeProperty(call, 'arguments');
    const argumentCount = Array.isArray(argumentList) ? argumentList.length : 0;
    const result = name === 'catch' || (name === 'then' && argumentCount >= 2);

    return result;
  }
}
