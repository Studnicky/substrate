import type { Rule } from 'eslint';

import { ObjectGuard } from '../shared/ObjectGuard.js';
import {
  MESSAGE, RULE_NAME
} from './constants/ObjectSpreadConstants.js';

// SCOPE WAS WRONG IN BOTH DIRECTIONS — narrowed to "this-reaching", and the highest-
// severity form was added.
//
// FALSE POSITIVE (over-broad): the prior revision flagged EVERY object spread anywhere
// inside a constructor, including a purely local throwaway that never becomes part of the
// instance under construction:
//
//   constructor(extra) { this.tag = 1; const local = { ...extra }; void local; }
//
//   node --allow-natives-syntax
//   %HaveSameMap(new LocalThrowawaySpread({x:1}), new LocalThrowawaySpread({y:2})) -> true
//
// `this`'s own shape is untouched by a spread that never reaches it — flagging this
// statement reported a real allocation cost (measured below) attached to a value that has
// no bearing on the CONSTRUCTED OBJECT's hidden class, which is what this rule is about.
//
// FALSE NEGATIVE (missed the worst case): `Object.assign(this, source)` was explicitly
// excluded ("assigning onto an existing reference is ordinary property mutation"). That is
// the highest-severity form measured here — it is the ONLY one of the three shapes below
// that diverges the CONSTRUCTED INSTANCE's own map:
//
//   class ThisAssignMerge  { constructor(extra) { this.tag = 1; Object.assign(this, extra); } }
//   class ThisAssignSpread { constructor(extra) { this.tag = 1; this.bag = { ...extra }; } }
//   class LocalThrowawaySpread { constructor(extra) { this.tag = 1; const local = { ...extra }; void local; } }
//
//   %HaveSameMap(new ThisAssignMerge({x:1}),  new ThisAssignMerge({y:2}))   -> false  <-- diverges `this` itself
//   %HaveSameMap(new ThisAssignSpread({x:1}), new ThisAssignSpread({y:2})) -> true   (`this`'s own shape: {tag, bag} — stable; only the nested `bag` object's shape varies)
//   %HaveSameMap(new LocalThrowawaySpread({x:1}), new LocalThrowawaySpread({y:2})) -> true (this untouched)
//   %HasFastProperties(new ThisAssignMerge({x:1}))                          -> true  (stays fast — the hazard is divergence, not dictionary mode)
//
// So the rule now targets "THIS-REACHING" spreads/assigns — a spread or fresh
// `Object.assign({}, …)` whose result becomes part of the instance under construction
// (assigned directly to `this.<name>`, or the initializer of a class field, which the
// engine treats as an instance-time `this.<name>` assignment) — plus `Object.assign(this,
// …)` unconditionally, since merging directly onto `this` reaches it by definition and is
// the highest-severity form (it, uniquely, diverges `this`'s OWN map).
//
// Benchmarked creation cost at 5,000,000 calls, median of 7, 3-call warm-up
// (scratchpad/bench_objectSpread.js):
//
//   direct object literal { tag: 1, x: 1, y: 2 }     1.93 ms
//   object spread { tag: 1, ...extra }             109.43 ms   56.7x
//
// WHAT THIS RULE DELIBERATELY DOES NOT MATCH: a spread or `Object.assign({}, …)` whose
// result is a local value that never flows into `this` — same posture as
// `array-concat-outside-loops`'s `HelperReachability`: what cannot be proven to reach the
// object under construction is left to whatever rule targets that value's OWN use
// (`computed-object-properties` if it is itself a hazard, `dynamic-property-access` if it
// is read with a variable key later).
//
// PAIRED RULE: `conditional-property-assignment`'s `Object.assign(this, cond ? {} : {})`
// check — that rule additionally requires the two branches to differ to flag; THIS rule
// flags `Object.assign(this, …)` unconditionally, because ANY non-static source merged
// directly onto `this` can vary per call, not only a conditionally-branching one.

class ClassMemberScope {
  // Nearest enclosing MethodDefinition or PropertyDefinition ancestor of `node`.
  public static findEnclosingMember(node: Rule.Node): Rule.Node | undefined {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (current.type === 'MethodDefinition' || current.type === 'PropertyDefinition') {
        return current;
      }
      if (current.type === 'ClassBody' || current.type === 'Program') {
        return undefined;
      }
      current = current.parent;
    }

    return undefined;
  }

  public static getMemberName(member: Rule.Node): string | undefined {
    const raw = member as unknown as Record<string, unknown>;

    if (raw.computed === true) {
      return undefined;
    }
    const key = raw.key;

    if (!ObjectGuard.isObject(key) || key.type !== 'Identifier') {
      return undefined;
    }

    const result = typeof key.name === 'string' ? key.name : undefined;

    return result;
  }

  public static isConstructor(member: Rule.Node): boolean {
    const raw = member as unknown as Record<string, unknown>;

    const result = member.type === 'MethodDefinition' && raw.kind === 'constructor';

    return result;
  }

  // Class-field `name = (x) => { ... }` — an arrow function value on a PropertyDefinition.
  public static isArrowValuedPropertyDefinition(member: Rule.Node): boolean {
    if (member.type !== 'PropertyDefinition') {
      return false;
    }
    const raw = member as unknown as Record<string, unknown>;
    const value = raw.value;

    const result = ObjectGuard.isObject(value) && value.type === 'ArrowFunctionExpression';

    return result;
  }

  public static isRegularMethod(member: Rule.Node): boolean {
    const raw = member as unknown as Record<string, unknown>;

    const result = member.type === 'MethodDefinition' && raw.kind === 'method';

    return result;
  }

  public static findSiblingConstructor(member: Rule.Node): Rule.Node | undefined {
    const classBody = member.parent;

    if (classBody?.type !== 'ClassBody') {
      return undefined;
    }

    const raw = classBody as unknown as Record<string, unknown>;
    const body = raw.body;

    if (!Array.isArray(body)) {
      return undefined;
    }

    const members = body as readonly unknown[];
    const membersLength = members.length;

    for (let index = 0; index < membersLength; index += 1) {
      const item = members.at(index);

      if (ObjectGuard.isObject(item) && item.type === 'MethodDefinition' && item.kind === 'constructor') {
        return item as unknown as Rule.Node;
      }
    }

    return undefined;
  }

  // Whether `node` sits in a scope that runs at construction time: directly inside the
  // constructor, or inside a class-field arrow / regular method that the constructor
  // calls via `this.<name>(...)` (extract-method / hoisted-field refactors of the same
  // constructor-time work).
  public static runsAtConstructionTime(node: Rule.Node): boolean {
    const member = ClassMemberScope.findEnclosingMember(node);

    if (member === undefined) {
      return false;
    }
    if (ClassMemberScope.isConstructor(member)) {
      return true;
    }

    const isEligibleShape = ClassMemberScope.isArrowValuedPropertyDefinition(member) || ClassMemberScope.isRegularMethod(member);

    if (!isEligibleShape) {
      return false;
    }

    const name = ClassMemberScope.getMemberName(member);

    if (name === undefined) {
      return false;
    }

    const constructorNode = ClassMemberScope.findSiblingConstructor(member);

    if (constructorNode === undefined) {
      return false;
    }

    const result = NodeWalk.someDescendant(constructorNode, (candidate) => {
      if (candidate.type !== 'CallExpression') {
        return false;
      }
      const callee = candidate.callee;

      if (!ObjectGuard.isObject(callee) || callee.type !== 'MemberExpression' || callee.computed === true) {
        return false;
      }
      const object = callee.object;

      if (!ObjectGuard.isObject(object) || object.type !== 'ThisExpression') {
        return false;
      }
      const property = callee.property;

      if (!ObjectGuard.isObject(property) || property.type !== 'Identifier') {
        return false;
      }

      const result = property.name === name;

      return result;
    });

    return result;
  }
}

class NodeWalk {
  // Bounded recursive descendant search over a single function/member body (never the
  // whole program) — used only to answer "does the constructor call this.<name>(...)?"
  // Skips the `parent` back-reference to avoid re-walking into sibling/ancestor subtrees.
  public static someDescendant(node: unknown, predicate: (candidate: Record<string, unknown>) => boolean): boolean {
    const seen = new Set<unknown>();

    const visit = (current: unknown): boolean => {
      if (!ObjectGuard.isObject(current) || seen.has(current)) {
        return false;
      }
      seen.add(current);

      if (typeof current.type === 'string' && predicate(current)) {
        return true;
      }

      const entries = Object.entries(current);
      const entriesLength = entries.length;

      for (let entryIndex = 0; entryIndex < entriesLength; entryIndex += 1) {
        const entry = entries.at(entryIndex);

        if (entry === undefined) {
          continue;
        }
        const [
          key,
          value
        ] = entry;

        if (key === 'parent') {
          continue;
        }

        if (Array.isArray(value)) {
          const items = value as readonly unknown[];
          const itemsLength = items.length;
          let matched = false;

          for (let itemIndex = 0; itemIndex < itemsLength; itemIndex += 1) {
            if (visit(items.at(itemIndex))) {
              matched = true; break;
            }
          }
          if (matched) {
            return true;
          }
          continue;
        }

        if (ObjectGuard.isObject(value) && visit(value)) {
          return true;
        }
      }

      return false;
    };

    const result = visit(node);

    return result;
  }
}

class ThisReaching {
  // True when `node` (the ObjectExpression/CallExpression producing a throwaway shape) is
  // itself assigned directly to a `this.<name>` property, or is the initializer of a class
  // field (which the engine assigns to the instance the same way). Passing the value
  // through a local variable, a return statement, or any other indirection is NOT proven
  // this-reaching — resolving toward "not flagged" there, since a false positive here
  // would (again) report throwaway locals that never touch the constructed instance.
  public static of(node: Rule.Node): boolean {
    const parent = node.parent;

    if (parent === null || !ObjectGuard.isObject(parent)) {
      return false;
    }

    if (parent.type === 'AssignmentExpression' && parent.right === node) {
      const left = parent.left;

      if (ObjectGuard.isObject(left) && left.type === 'MemberExpression' && !left.computed) {
        const object = left.object;

        if (ObjectGuard.isObject(object) && object.type === 'ThisExpression') {
          return true;
        }
      }

      return false;
    }

    if (parent.type === 'PropertyDefinition' && parent.value === node && !parent.computed) {
      return true;
    }

    return false;
  }
}

class AssignCallShape {
  // `Object.assign({}, x)` — same hidden-class churn as `{...x}`, no SpreadElement node
  // to key a selector off of. Only a FRESH object-literal first argument counts here;
  // `Object.assign(this, x)` is handled separately (see `isThisTargetAssign`) since it
  // reaches `this` directly and unconditionally, unlike this fresh-target form which still
  // needs the `ThisReaching` check applied to its RESULT.
  public static isFreshObjectAssign(node: Record<string, unknown>): boolean {
    if (!AssignCallShape.isObjectAssignCall(node)) {
      return false;
    }

    const argumentList = node.arguments;

    if (!ObjectGuard.isArray(argumentList) || argumentList.length === 0) {
      return false;
    }
    const firstArg = argumentList.at(0);

    const result = ObjectGuard.isObject(firstArg) && firstArg.type === 'ObjectExpression' && Array.isArray(firstArg.properties) && firstArg.properties.length === 0;

    return result;
  }

  // `Object.assign(this, ...)` — merges directly onto the instance under construction.
  // Reaches `this` by definition; no further `ThisReaching` check is needed or possible
  // (there is no "result" to trace — the mutation IS the target).
  public static isThisTargetAssign(node: Record<string, unknown>): boolean {
    if (!AssignCallShape.isObjectAssignCall(node)) {
      return false;
    }

    const argumentList = node.arguments;

    if (!ObjectGuard.isArray(argumentList) || argumentList.length === 0) {
      return false;
    }
    const firstArg = argumentList.at(0);

    const result = ObjectGuard.isObject(firstArg) && firstArg.type === 'ThisExpression';

    return result;
  }

  private static isObjectAssignCall(node: Record<string, unknown>): boolean {
    if (node.type !== 'CallExpression') {
      return false;
    }
    const callee = node.callee;

    if (!ObjectGuard.isObject(callee) || callee.type !== 'MemberExpression' || callee.computed === true) {
      return false;
    }
    const object = callee.object;
    const property = callee.property;

    if (!ObjectGuard.isObject(object) || object.type !== 'Identifier' || object.name !== 'Object') {
      return false;
    }

    const result = ObjectGuard.isObject(property) && property.type === 'Identifier' && property.name === 'assign';

    return result;
  }
}

export const objectSpread: Rule.RuleModule = {
  'create': (context) => {
    const onSpreadElement: NonNullable<Rule.RuleListener['SpreadElement']> = (node) => {
      const parent = node.parent;

      if (parent?.type !== 'ObjectExpression') {
        return;
      }
      if (!ThisReaching.of(parent)) {
        return;
      }

      if (ClassMemberScope.runsAtConstructionTime(node)) {
        context.report({
          'messageId': 'objectSpread', 'node': node
        });
      }
    };

    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      const raw = node as unknown as Record<string, unknown>;

      if (AssignCallShape.isThisTargetAssign(raw)) {
        if (ClassMemberScope.runsAtConstructionTime(node)) {
          context.report({
            'messageId': 'objectSpread', 'node': node
          });
        }

        return;
      }

      if (AssignCallShape.isFreshObjectAssign(raw) && ThisReaching.of(node)) {
        if (ClassMemberScope.runsAtConstructionTime(node)) {
          context.report({
            'messageId': 'objectSpread', 'node': node
          });
        }
      }
    };

    return {
      'CallExpression': onCallExpression,
      'SpreadElement': onSpreadElement
    };
  },
  'meta': {
    'docs': {
      'description': MESSAGE,
      'recommended': false
    },
    'messages': { 'objectSpread': `${RULE_NAME}: ${MESSAGE}` },
    'schema': [],
    'type': 'problem'
  }
};
