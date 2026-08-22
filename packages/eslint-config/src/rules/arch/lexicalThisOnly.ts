import type { Rule } from 'eslint';

import { AstHelpers } from '../shared/astHelpers.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';

// WHAT THIS RULE ENFORCES, AND WHY IT IS AN ARCHITECTURE RULE RATHER THAN A STYLE ONE.
//
// `this` is the receiver's private scope. The moment it leaves the method — bound to
// a local, handed to another function, destructured, or stored — the object's
// internals become reachable from somewhere that is not the object, and encapsulation
// is gone. That is the SOA/module-boundary violation this rule exists to prevent, and
// it is why the rule is deliberately an ALLOW-LIST: `this` may be dereferenced
// (`this.member`) or returned for chaining (`return this`), and nothing else.
//
// THE CONTEXT DISTINCTION THAT MAKES THE ALLOW-LIST CORRECT.
//
// In an INSTANCE method, `this` is the object. Passing it anywhere is a leak:
//
//   public toJSON(): Record<string, unknown> {
//     const base = BaseError.serializeCause(this, 0);   // <-- REPORTED: hands the whole
//     ...                                              //     instance to a static helper
//   }
//   public constructor(...) {
//     Object.assign(this, fields);                     // <-- REPORTED: bulk external
//   }                                                  //     mutation of the receiver
//
// In a STATIC method, `this` is the CONSTRUCTOR, not an instance. Passing it is how
// subclass-aware construction works, and no encapsulation is crossed because a class
// reference is a type-level value:
//
//   public static create<T extends Base = Base>(this: Function & { prototype: T }): T {
//     const result: unknown = Reflect.construct(this, [resolved]);   // allowed
//     if (!Base.isConstructed(result, this)) { ... }                 // allowed
//     return result;
//   }
//
// A prior revision applied the instance-context allow-list everywhere and reported all
// 89 call-argument sites in this repo. 87 of them are the static factory above — the
// polymorphic-construction idiom the codebase is built on — so the only "fix" would
// have been to delete the pattern. The remaining 2 are the genuine leaks shown above.
// The allow-list was never the mistake; the missing static/instance split was.
//
// A LATER REVISION OVERCORRECTED and denied only the two binding shapes
// (`const self = this`, `x = this`), permitting `this` as a call argument everywhere.
// That restored the factories but silently un-enforced the architecture: it let an
// instance hand itself to any function, which is the exact anti-pattern above. Do not
// go back to a denylist. A denylist cannot express "the receiver must not escape" —
// it can only enumerate the escapes someone happened to think of.
//
// EVERYTHING ELSE IS REPORTED IN BOTH CONTEXTS, deliberately:
//   const self = this;         aliasing — the classic pre-arrow-function workaround
//   temp = this;               aliasing by assignment
//   const { alpha } = this;    detaches state from the receiver; `this.alpha` at the
//                              use site is clearer and keeps method bindings intact
//   this.parent = this;        stores a self-cycle on the instance
//
// Each of these appears once or twice in the entire repo, so strictness here costs
// almost nothing and closes the loopholes permanently.

class ThisContext {
  /**
   * True when the nearest enclosing class member is `static`, where `this` is the
   * constructor rather than an instance. Arrow functions are transparent — they
   * inherit `this` lexically, so the walk continues through them. A `this` with no
   * enclosing class member is treated as instance context: the strict default.
   */
  public static isStatic(node: Rule.Node): boolean {
    let current: Rule.Node | undefined = node.parent as Rule.Node | undefined;

    while (current !== undefined) {
      const nodeType = AstHelpers.getNodeType(current);

      if (nodeType === 'StaticBlock') {
        return true;
      }

      if (nodeType === 'MethodDefinition' || nodeType === 'PropertyDefinition') {
        const result = ObjectGuard.isObject(current) && current.static === true;

        return result;
      }

      current = current.parent as Rule.Node | undefined;
    }

    return false;
  }
}

class PermittedUse {
  /** `this.member` — dereferencing the receiver never lets it escape. */
  public static isMemberAccess(node: Rule.Node, parent: Rule.Node): boolean {
    if (AstHelpers.getNodeType(parent) !== 'MemberExpression') {
      return false;
    }

    const result = ObjectGuard.isObject(parent) && parent.object === node;

    return result;
  }

  /** `return this` — the fluent-interface / chaining idiom. */
  public static isReturned(node: Rule.Node, parent: Rule.Node): boolean {
    if (AstHelpers.getNodeType(parent) !== 'ReturnStatement') {
      return false;
    }

    const result = ObjectGuard.isObject(parent) && parent.argument === node;

    return result;
  }

  /**
   * `this` used as a CONSTRUCTOR — permitted ONLY in static context, where `this` is
   * the class rather than an instance. Both positions are the same idiom:
   *
   *   new this(stages, options)              callee   — subclass-aware construction
   *   Reflect.construct(this, [resolved])    argument — same, reflectively
   *   Base.isConstructed(result, this)       argument — the guard for the above
   *
   * Restricting this to argument position alone would report `new this()`, which is
   * the most direct spelling of the pattern the exemption exists for.
   */
  public static isConstructorReference(node: Rule.Node, parent: Rule.Node): boolean {
    const nodeType = AstHelpers.getNodeType(parent);

    if (nodeType !== 'CallExpression' && nodeType !== 'NewExpression') {
      return false;
    }
    if (!ObjectGuard.isObject(parent)) {
      return false;
    }
    if (!ThisContext.isStatic(node)) {
      return false;
    }

    const isCallee = parent.callee === node;
    const isArgument = Array.isArray(parent.arguments) && parent.arguments.includes(node);

    const result = isCallee || isArgument;

    return result;
  }
}

export const lexicalThisOnly: Rule.RuleModule = {
  'create': (context) => {
    const onThisExpression: NonNullable<Rule.RuleListener['ThisExpression']> = (node) => {
      const parent = node.parent as Rule.Node | undefined;

      if (parent === undefined) {
        return;
      }

      if (PermittedUse.isMemberAccess(node, parent)) {
        return;
      }
      if (PermittedUse.isReturned(node, parent)) {
        return;
      }
      if (PermittedUse.isConstructorReference(node, parent)) {
        return;
      }

      context.report({
        'messageId': 'escapes',
        'node': node
      });
    };

    return { 'ThisExpression': onThisExpression };
  },
  'meta': {
    'docs': {
      'description': 'Disallow `this` escaping its method. Dereference it or return it; never alias, destructure, store, or pass an instance.',
      'recommended': false
    },
    'messages': { 'escapes': '`this` must not escape its method. Use `this.member` or `return this`; do not alias, destructure, store, or pass the receiver to another function. (Passing `this` as an argument is permitted only in a static method, where it is the constructor.)' },
    'schema': [],
    'type': 'problem'
  }
};
