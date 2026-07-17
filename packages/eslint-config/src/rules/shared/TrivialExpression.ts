import { AstHelpers } from './astHelpers.js';
import { ObjectGuard } from './ObjectGuard.js';

class NodeExpressionAccess {
  public static getExpression(node: unknown): unknown {
    if (!ObjectGuard.isObject(node)) {
      return undefined;
    }

    return node.expression;
  }
}

class ThisAccess {
  public static isRooted(node: unknown): boolean {
    if (!ObjectGuard.isObject(node)) { return false; }
    const t = AstHelpers.getNodeType(node);
    if (t === 'ThisExpression') { return true; }
    if (t === 'MemberExpression') { return ThisAccess.isRooted(node.object); }

    return false;
  }

  public static isMemberExpression(node: unknown): boolean {
    if (!ObjectGuard.isObject(node)) { return false; }
    if (node.type !== 'MemberExpression') { return false; }

    return ThisAccess.isRooted(node.object);
  }
}

export class TrivialExpression {
  public static isTrivial(node: unknown, opts: { 'allowLiterals': boolean; 'allowMemberExpressions': boolean }): boolean {
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
      if (ThisAccess.isMemberExpression(node)) { return false; }

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
      return TrivialExpression.isTrivial(NodeExpressionAccess.getExpression(node), opts);
    }

    return false;
  }
}
