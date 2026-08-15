import type { Rule } from 'eslint';

import { ObjectGuard } from '../shared/ObjectGuard.js';

class NodeWalk {
  // Bounded recursive descendant search over a single function/member body (never the
  // whole program) — used only to answer "does the constructor call this.<name>(...)?"
  // Skips the `parent` back-reference to avoid re-walking into sibling/ancestor subtrees.
  public static someDescendant(node: unknown, predicate: (candidate: Record<string, unknown>) => boolean): boolean {
    const seen = new Set<unknown>();

    const visit = (current: unknown): boolean => {
      if (!ObjectGuard.isObject(current) || seen.has(current)) { return false; }
      seen.add(current);

      if (typeof current.type === 'string' && predicate(current)) { return true; }

      const entries = Object.entries(current);
      const entriesLength = entries.length;

      for (let entryIndex = 0; entryIndex < entriesLength; entryIndex += 1) {
        const entry = entries.at(entryIndex);
        if (entry === undefined) { continue; }
        const [key, value] = entry;
        if (key === 'parent') { continue; }

        if (Array.isArray(value)) {
          const items = value as readonly unknown[];
          const itemsLength = items.length;
          let matched = false;
          for (let itemIndex = 0; itemIndex < itemsLength; itemIndex += 1) {
            if (visit(items.at(itemIndex))) { matched = true; break; }
          }
          if (matched) { return true; }
          continue;
        }

        if (ObjectGuard.isObject(value) && visit(value)) { return true; }
      }

      return false;
    };

    return visit(node);
  }
}

class ClassMemberScope {
  // Nearest enclosing MethodDefinition or PropertyDefinition ancestor of `node`.
  public static findEnclosingMember(node: Rule.Node): Rule.Node | undefined {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (current.type === 'MethodDefinition' || current.type === 'PropertyDefinition') { return current; }
      if (current.type === 'ClassBody' || current.type === 'Program') { return undefined; }
      current = current.parent;
    }

    return undefined;
  }

  public static getMemberName(member: Rule.Node): string | undefined {
    const raw = member as unknown as Record<string, unknown>;
    if (raw.computed === true) { return undefined; }
    const key = raw.key;
    if (!ObjectGuard.isObject(key) || key.type !== 'Identifier') { return undefined; }
    return typeof key.name === 'string' ? key.name : undefined;
  }

  public static isConstructor(member: Rule.Node): boolean {
    const raw = member as unknown as Record<string, unknown>;
    return member.type === 'MethodDefinition' && raw.kind === 'constructor';
  }

  // Class-field `name = (x) => { ... }` — an arrow function value on a PropertyDefinition.
  public static isArrowValuedPropertyDefinition(member: Rule.Node): boolean {
    if (member.type !== 'PropertyDefinition') { return false; }
    const raw = member as unknown as Record<string, unknown>;
    const value = raw.value;
    return ObjectGuard.isObject(value) && value.type === 'ArrowFunctionExpression';
  }

  public static isRegularMethod(member: Rule.Node): boolean {
    const raw = member as unknown as Record<string, unknown>;
    return member.type === 'MethodDefinition' && raw.kind === 'method';
  }

  public static findSiblingConstructor(member: Rule.Node): Rule.Node | undefined {
    const classBody = member.parent;
    if (classBody?.type !== 'ClassBody') { return undefined; }

    const raw = classBody as unknown as Record<string, unknown>;
    const body = raw.body;
    if (!Array.isArray(body)) { return undefined; }

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
    if (member === undefined) { return false; }
    if (ClassMemberScope.isConstructor(member)) { return true; }

    const isEligibleShape = ClassMemberScope.isArrowValuedPropertyDefinition(member) || ClassMemberScope.isRegularMethod(member);
    if (!isEligibleShape) { return false; }

    const name = ClassMemberScope.getMemberName(member);
    if (name === undefined) { return false; }

    const constructorNode = ClassMemberScope.findSiblingConstructor(member);
    if (constructorNode === undefined) { return false; }

    return NodeWalk.someDescendant(constructorNode, (candidate) => {
      if (candidate.type !== 'CallExpression') { return false; }
      const callee = candidate.callee;
      if (!ObjectGuard.isObject(callee) || callee.type !== 'MemberExpression' || callee.computed === true) { return false; }
      const object = callee.object;
      if (!ObjectGuard.isObject(object) || object.type !== 'ThisExpression') { return false; }
      const property = callee.property;
      if (!ObjectGuard.isObject(property) || property.type !== 'Identifier') { return false; }
      return property.name === name;
    });
  }
}

class AssignCallShape {
  // `Object.assign({}, x)` — same hidden-class churn as `{...x}`, no SpreadElement node
  // to key a selector off of. Only a FRESH object-literal first argument counts: assigning
  // onto an existing reference (`Object.assign(this, x)`) is ordinary property mutation,
  // not the allocate-a-throwaway-shape pattern object spread and this check target.
  public static isFreshObjectAssign(node: Record<string, unknown>): boolean {
    if (node.type !== 'CallExpression') { return false; }
    const callee = node.callee;
    if (!ObjectGuard.isObject(callee) || callee.type !== 'MemberExpression' || callee.computed === true) { return false; }
    const object = callee.object;
    const property = callee.property;
    if (!ObjectGuard.isObject(object) || object.type !== 'Identifier' || object.name !== 'Object') { return false; }
    if (!ObjectGuard.isObject(property) || property.type !== 'Identifier' || property.name !== 'assign') { return false; }

    const args = node.arguments;
    if (!ObjectGuard.isArray(args) || args.length === 0) { return false; }
    const firstArg = args.at(0);
    return ObjectGuard.isObject(firstArg) && firstArg.type === 'ObjectExpression' && Array.isArray(firstArg.properties) && firstArg.properties.length === 0;
  }
}

export const objectSpread: Rule.RuleModule = {
  'create': (context) => {
    const onSpreadElement: NonNullable<Rule.RuleListener['SpreadElement']> = (node) => {
      const parent = node.parent;
      if (parent?.type !== 'ObjectExpression') { return; }

      if (ClassMemberScope.runsAtConstructionTime(node)) {
        context.report({ 'messageId': 'objectSpread', 'node': node });
      }
    };

    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      const raw = node as unknown as Record<string, unknown>;
      if (!AssignCallShape.isFreshObjectAssign(raw)) { return; }

      if (ClassMemberScope.runsAtConstructionTime(node)) {
        context.report({ 'messageId': 'objectSpread', 'node': node });
      }
    };

    return {
      'CallExpression': onCallExpression,
      'SpreadElement': onSpreadElement
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow object spread and Object.assign({}, ...) inside a constructor (directly, or via a class-field arrow / method the constructor calls) — both allocate a throwaway hidden-class shape at construction time.',
      'recommended': false
    },
    'messages': { 'objectSpread': 'v8Optimization/objectSpread: Object spread inside a constructor can break hidden classes. Assign properties explicitly.' },
    'schema': [],
    'type': 'problem'
  }
};
