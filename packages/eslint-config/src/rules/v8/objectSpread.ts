import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types/browser';

import {
  MESSAGE, RULE_NAME
} from './constants/ObjectSpreadConstants.js';

// Targets "this-reaching" spreads/assigns plus unconditional `Object.assign(this, …)`.
// Benchmark and scope rationale: docs/eslint/rules/v8/object-spread.md.

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

    if (!Predicates.isRecord(key) || key.type !== 'Identifier') {
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

    const result = Predicates.isRecord(value) && value.type === 'ArrowFunctionExpression';

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

      if (Predicates.isRecord(item) && item.type === 'MethodDefinition' && item.kind === 'constructor') {
        return item as unknown as Rule.Node;
      }
    }

    return undefined;
  }

  // True inside the constructor, or a class-field arrow/regular method the constructor
  // calls via `this.<name>(...)` — covers extract-method/hoisted-field refactors.
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
      const isMatch = ClassMemberScope.#isThisMethodCall(candidate, name);

      return isMatch;
    });

    return result;
  }

  // True when `candidate` is `this.<name>(...)` — a bare, non-computed member call.
  static #isThisMethodCall(candidate: Record<string, unknown>, name: string): boolean {
    if (candidate.type !== 'CallExpression') {
      return false;
    }
    const callee = candidate.callee;

    if (!Predicates.isRecord(callee) || callee.type !== 'MemberExpression' || callee.computed === true) {
      return false;
    }
    const object = callee.object;

    if (!Predicates.isRecord(object) || object.type !== 'ThisExpression') {
      return false;
    }
    const property = callee.property;

    if (!Predicates.isRecord(property) || property.type !== 'Identifier') {
      return false;
    }

    const result = property.name === name;

    return result;
  }
}

class NodeWalk {
  // Bounded to one function/member body, never the whole program; skips `parent` to
  // avoid re-walking into sibling/ancestor subtrees.
  public static someDescendant(node: unknown, predicate: (candidate: Record<string, unknown>) => boolean): boolean {
    const seen = new Set<unknown>();

    const visit = (current: unknown): boolean => {
      if (!Predicates.isRecord(current) || seen.has(current)) {
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

        if (NodeWalk.#visitValue(value, visit)) {
          return true;
        }
      }

      return false;
    };

    const result = visit(node);

    return result;
  }

  static #visitValue(value: unknown, visit: (current: unknown) => boolean): boolean {
    if (Array.isArray(value)) {
      const items = value as readonly unknown[];
      const itemsLength = items.length;

      for (let itemIndex = 0; itemIndex < itemsLength; itemIndex += 1) {
        if (visit(items.at(itemIndex))) {
          return true;
        }
      }

      return false;
    }

    const result = Predicates.isRecord(value) && visit(value);

    return result;
  }
}

class ThisReaching {
  // True only when `node` is itself assigned directly to `this.<name>` or initializes
  // a class field; any indirection (local variable, return statement) is unflagged.
  public static of(node: Rule.Node): boolean {
    const parent = node.parent;

    if (parent === null || !Predicates.isRecord(parent)) {
      return false;
    }

    if (parent.type === 'AssignmentExpression' && parent.right === node) {
      const result = ThisReaching.#isThisMemberAssignment(parent.left);

      return result;
    }

    const result = parent.type === 'PropertyDefinition' && parent.value === node && !parent.computed;

    return result;
  }

  static #isThisMemberAssignment(left: unknown): boolean {
    if (!Predicates.isRecord(left) || left.type !== 'MemberExpression' || left.computed === true) {
      return false;
    }
    const object = left.object;

    const result = Predicates.isRecord(object) && object.type === 'ThisExpression';

    return result;
  }
}

class AssignCallShape {
  // `Object.assign({}, x)` has the same hidden-class churn as `{...x}`; only a fresh
  // object-literal first argument counts. `Object.assign(this, x)` uses `isThisTargetAssign`.
  public static isFreshObjectAssign(node: Record<string, unknown>): boolean {
    if (!AssignCallShape.isObjectAssignCall(node)) {
      return false;
    }

    const argumentList = node.arguments;

    if (!Predicates.isArray(argumentList) || argumentList.length === 0) {
      return false;
    }
    const firstArg = argumentList.at(0);

    const result = Predicates.isRecord(firstArg) && firstArg.type === 'ObjectExpression' && Array.isArray(firstArg.properties) && firstArg.properties.length === 0;

    return result;
  }

  // Merges directly onto the instance under construction; no `ThisReaching` check needed
  // since the mutation IS the target, not a traced result.
  public static isThisTargetAssign(node: Record<string, unknown>): boolean {
    if (!AssignCallShape.isObjectAssignCall(node)) {
      return false;
    }

    const argumentList = node.arguments;

    if (!Predicates.isArray(argumentList) || argumentList.length === 0) {
      return false;
    }
    const firstArg = argumentList.at(0);

    const result = Predicates.isRecord(firstArg) && firstArg.type === 'ThisExpression';

    return result;
  }

  private static isObjectAssignCall(node: Record<string, unknown>): boolean {
    if (node.type !== 'CallExpression') {
      return false;
    }
    const callee = node.callee;

    if (!Predicates.isRecord(callee) || callee.type !== 'MemberExpression' || callee.computed === true) {
      return false;
    }
    const object = callee.object;
    const property = callee.property;

    if (!Predicates.isRecord(object) || object.type !== 'Identifier' || object.name !== 'Object') {
      return false;
    }

    const result = Predicates.isRecord(property) && property.type === 'Identifier' && property.name === 'assign';

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
