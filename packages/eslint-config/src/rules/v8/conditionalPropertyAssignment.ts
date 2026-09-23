import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types/browser';

import type { AstNodeInterface } from '../shared/AstNodeInterface.js';

import {
  MESSAGE, RULE_NAME
} from './constants/ConditionalPropertyAssignmentConstants.js';

// See docs/eslint/rules/v8/conditional-property-assignment.md for the measured rationale.

class AstWalker {
  // Recursive descendant walk over raw AST shape (no visitor-keys table), bounded to the
  // subtree it is called on (constructor bodies here), so this is not a performance concern.
  public static forEachDescendant(node: unknown, visit: (descendant: AstNodeInterface) => void): void {
    if (!Predicates.isRecord(node)) {
      return;
    }

    const entries = Object.entries(node);
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

        for (let itemIndex = 0; itemIndex < itemsLength; itemIndex += 1) {
          AstWalker.visitValue(items.at(itemIndex), visit);
        }
      } else {
        AstWalker.visitValue(value, visit);
      }
    }
  }

  private static visitValue(value: unknown, visit: (descendant: AstNodeInterface) => void): void {
    if (!Predicates.isRecord(value) || typeof value.type !== 'string') {
      return;
    }
    visit(value);
    AstWalker.forEachDescendant(value, visit);
  }
}

class ThisAssignment {
  // Resolves `this.<name> = ...` to `<name>`. Excludes computed writes (`this[key] = ...`) —
  // a dynamic key is `dynamicPropertyAccess`'s concern, not this rule's.
  public static getPropertyName(node: unknown): string | undefined {
    if (!Predicates.isRecord(node) || node.type !== 'AssignmentExpression') {
      return undefined;
    }

    const left = node.left;

    if (!Predicates.isRecord(left) || left.type !== 'MemberExpression' || left.computed === true) {
      return undefined;
    }

    const objectNode = left.object;

    if (!Predicates.isRecord(objectNode) || objectNode.type !== 'ThisExpression') {
      return undefined;
    }

    const propertyNode = left.property;

    if (!Predicates.isRecord(propertyNode) || propertyNode.type !== 'Identifier' || typeof propertyNode.name !== 'string') {
      return undefined;
    }

    return propertyNode.name;
  }
}

class ClassMethodEligibility {
  // Per-run cache: a helper method's eligibility depends only on its sibling constructor, so
  // it is stable across the many call sites that may live inside the same helper.
  private readonly cache = new Map<AstNodeInterface, boolean>();

  // Walks up from `node` to the nearest enclosing MethodDefinition; undefined when `node` is
  // not lexically inside any class method body.
  public static findEnclosingMethod(node: Rule.Node): AstNodeInterface | undefined {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      const rawNode = current as unknown as AstNodeInterface;

      if (rawNode.type === 'MethodDefinition') {
        return rawNode;
      }
      current = current.parent;
    }

    return undefined;
  }

  // Bounded, one-level indirection check: constructor, or a helper called directly from it.
  public isEligible(methodDef: AstNodeInterface): boolean {
    const cached = this.cache.get(methodDef);

    if (cached !== undefined) {
      return cached;
    }

    const result = this.compute(methodDef);

    this.cache.set(methodDef, result);

    return result;
  }

  private compute(methodDef: AstNodeInterface): boolean {
    if (methodDef.kind === 'constructor') {
      return true;
    }
    if (methodDef.kind !== 'method' || methodDef.computed === true) {
      return false;
    }

    const keyNode = methodDef.key;

    if (!Predicates.isRecord(keyNode) || keyNode.type !== 'Identifier' || typeof keyNode.name !== 'string') {
      return false;
    }
    const methodName = keyNode.name;

    const classBody = methodDef.parent;

    if (!Predicates.isRecord(classBody) || classBody.type !== 'ClassBody' || !Array.isArray(classBody.body)) {
      return false;
    }

    const constructorDef = (classBody.body as readonly unknown[]).find((member): member is AstNodeInterface => {
      const result = Predicates.isRecord(member) && member.type === 'MethodDefinition' && member.kind === 'constructor';

      return result;
    });

    if (constructorDef === undefined) {
      return false;
    }

    const constructorFunction = constructorDef.value;

    if (!Predicates.isRecord(constructorFunction)) {
      return false;
    }

    const result = ClassMethodEligibility.collectThisCallNames(constructorFunction.body).has(methodName);

    return result;
  }

  private static collectThisCallNames(bodyNode: unknown): ReadonlySet<string> {
    const names = new Set<string>();

    AstWalker.forEachDescendant(bodyNode, (descendant) => {
      if (descendant.type !== 'CallExpression') {
        return;
      }
      const callee = descendant.callee;

      if (!Predicates.isRecord(callee) || callee.type !== 'MemberExpression' || callee.computed === true) {
        return;
      }

      const objectNode = callee.object;

      if (!Predicates.isRecord(objectNode) || objectNode.type !== 'ThisExpression') {
        return;
      }

      const propertyNode = callee.property;

      if (Predicates.isRecord(propertyNode) && propertyNode.type === 'Identifier' && typeof propertyNode.name === 'string') {
        names.add(propertyNode.name);
      }
    });

    return names;
  }
}

class StatementAssignments {
  // Only an ExpressionStatement whose expression is itself a `this`-assignment counts;
  // anything else is not "direct" at this level and is left to whatever listener owns it.
  private static collectOne(statement: unknown): readonly { readonly 'assignmentNode': AstNodeInterface; readonly 'propertyName': string }[] {
    if (!Predicates.isRecord(statement) || statement.type !== 'ExpressionStatement') {
      return [];
    }

    const propertyName = ThisAssignment.getPropertyName(statement.expression);

    if (propertyName === undefined || !Predicates.isRecord(statement.expression)) {
      return [];
    }

    return [{
      'assignmentNode': statement.expression, 'propertyName': propertyName
    }];
  }

  // Collects direct (or one-`BlockStatement`-deep) assignments from a single branch node.
  public static collectBranch(branchNode: unknown): readonly { readonly 'assignmentNode': AstNodeInterface; readonly 'propertyName': string }[] {
    if (!Predicates.isRecord(branchNode)) {
      return [];
    }

    if (branchNode.type === 'BlockStatement' && Array.isArray(branchNode.body)) {
      const statements = branchNode.body as readonly unknown[];
      const statementsLength = statements.length;
      const collected: { readonly 'assignmentNode': AstNodeInterface; readonly 'propertyName': string }[] = [];

      for (let index = 0; index < statementsLength; index += 1) {
        const statement = statements.at(index);

        if (statement !== undefined) {
          collected.push(...StatementAssignments.collectOne(statement));
        }
      }

      return collected;
    }

    const result = StatementAssignments.collectOne(branchNode);

    return result;
  }

  public static namesOf(assignments: readonly { readonly 'assignmentNode': AstNodeInterface; readonly 'propertyName': string }[]): ReadonlySet<string> {
    const names = new Set<string>();
    const assignmentsLength = assignments.length;

    for (let index = 0; index < assignmentsLength; index += 1) {
      const assignment = assignments.at(index);

      if (assignment !== undefined) {
        names.add(assignment.propertyName);
      }
    }

    return names;
  }
}

class PropertyNameSets {
  public static equal(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
    if (left.size !== right.size) {
      return false;
    }

    for (const value of left) {
      if (!right.has(value)) {
        return false;
      }
    }

    return true;
  }
}

class ObjectExpressionKeys {
  // Static (non-computed, non-spread) top-level key set of an `Object.assign` branch.
  // `undefined` means "cannot prove"; the caller resolves toward the stricter side.
  public static namesOf(node: unknown): ReadonlySet<string> | undefined {
    if (!Predicates.isRecord(node) || node.type !== 'ObjectExpression' || !Array.isArray(node.properties)) {
      return undefined;
    }

    const names = new Set<string>();
    const properties = node.properties as readonly unknown[];
    const propertiesLength = properties.length;

    for (let index = 0; index < propertiesLength; index += 1) {
      const property = properties.at(index);

      if (!Predicates.isRecord(property) || property.type !== 'Property' || property.computed === true) {
        return undefined;
      }

      const key = property.key;

      // Accepts `Identifier` OR quoted `Literal`: the repo's `quote-props: always` convention
      // makes every non-computed key a `Literal`, so an `Identifier`-only check would never resolve.
      if (!Predicates.isRecord(key)) {
        return undefined;
      }

      let keyName: string | undefined;

      if (key.type === 'Identifier' && typeof key.name === 'string') {
        keyName = key.name;
      } else if (key.type === 'Literal' && typeof key.value === 'string') {
        keyName = key.value;
      }

      if (keyName === undefined) {
        return undefined;
      }

      names.add(keyName);
    }

    return names;
  }
}

class CaseAssignments {
  // Direct (or one-BlockStatement-deep) assignments within a single switch case's consequent.
  public static collect(switchCase: unknown): readonly { readonly 'assignmentNode': AstNodeInterface; readonly 'propertyName': string }[] {
    if (!Predicates.isRecord(switchCase) || !Array.isArray(switchCase.consequent)) {
      return [];
    }

    const statements = switchCase.consequent as readonly unknown[];
    const statementsLength = statements.length;
    const collected: { readonly 'assignmentNode': AstNodeInterface; readonly 'propertyName': string }[] = [];

    for (let index = 0; index < statementsLength; index += 1) {
      const statement = statements.at(index);

      if (statement !== undefined) {
        collected.push(...StatementAssignments.collectBranch(statement));
      }
    }

    return collected;
  }
}

export const conditionalPropertyAssignment: Rule.RuleModule = {
  'create': (context) => {
    const eligibility = new ClassMethodEligibility();

    const reportEach = (assignments: readonly { readonly 'assignmentNode': AstNodeInterface; readonly 'propertyName': string }[]): void => {
      const assignmentsLength = assignments.length;

      for (let index = 0; index < assignmentsLength; index += 1) {
        const assignment = assignments.at(index);

        if (assignment === undefined) {
          continue;
        }

        context.report({
          'messageId': 'forbidden', 'node': assignment.assignmentNode as unknown as Rule.Node
        });
      }
    };

    const onIfStatement: NonNullable<Rule.RuleListener['IfStatement']> = (node) => {
      const methodDef = ClassMethodEligibility.findEnclosingMethod(node);

      if (methodDef === undefined || !eligibility.isEligible(methodDef)) {
        return;
      }

      const consequentAssignments = StatementAssignments.collectBranch(node.consequent);

      if (consequentAssignments.length === 0) {
        return;
      }

      const rawAlternate = node.alternate as unknown as AstNodeInterface | null;

      if (rawAlternate === null || rawAlternate.type === 'IfStatement') {
        reportEach(consequentAssignments);

        return;
      }

      const alternateAssignments = StatementAssignments.collectBranch(rawAlternate);
      const isUniform = PropertyNameSets.equal(StatementAssignments.namesOf(consequentAssignments), StatementAssignments.namesOf(alternateAssignments));

      if (isUniform) {
        return;
      }

      reportEach(consequentAssignments);
      reportEach(alternateAssignments);
    };

    // `IfStatement` ancestry is deliberately not inspected here — `onIfStatement` owns that
    // shape, so double-reporting the same assignment from both listeners cannot happen.
    const onAssignmentExpression: NonNullable<Rule.RuleListener['AssignmentExpression']> = (node) => {
      const ownPropertyName = ThisAssignment.getPropertyName(node);

      if (ownPropertyName === undefined) {
        return;
      }

      let previousChild: Rule.Node = node;
      let current: Rule.Node | null = node.parent;
      let matchedLogical = false;
      let matchedConditional: AstNodeInterface | undefined;
      let matchedConditionalOwnSide: 'alternate' | 'consequent' | undefined;

      while (current !== null) {
        const rawCurrent = current as unknown as AstNodeInterface;

        if (matchedConditional === undefined && rawCurrent.type === 'ConditionalExpression') {
          if (rawCurrent.consequent === previousChild) {
            matchedConditional = rawCurrent; matchedConditionalOwnSide = 'consequent';
          } else if (rawCurrent.alternate === previousChild) {
            matchedConditional = rawCurrent; matchedConditionalOwnSide = 'alternate';
          }
        }
        if (!matchedLogical && rawCurrent.type === 'LogicalExpression' && rawCurrent.right === previousChild) {
          matchedLogical = true;
        }
        if (rawCurrent.type === 'MethodDefinition') {
          break;
        }

        previousChild = current;
        current = current.parent;
      }

      if (matchedConditional === undefined && !matchedLogical) {
        return;
      }

      const methodDef = current === null ? undefined : (current as unknown as AstNodeInterface);

      if (methodDef?.type !== 'MethodDefinition' || !eligibility.isEligible(methodDef)) {
        return;
      }

      if (matchedLogical) {
        // No second branch exists to compare against — a `&&`-guarded assignment is the missing-else hazard by construction.
        context.report({
          'messageId': 'forbidden', 'node': node
        });

        return;
      }

      const otherSideNode = matchedConditionalOwnSide === 'consequent' ? matchedConditional?.alternate : matchedConditional?.consequent;
      const otherPropertyName = ThisAssignment.getPropertyName(otherSideNode);
      const isUniform = otherPropertyName === ownPropertyName;

      if (isUniform) {
        return;
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
    };

    // Covers `Object.assign(this, cond ? {...} : {...})`. Flags unless both object-literal
    // branches are PROVEN (static, non-spread, non-computed keys) to add the same key set.
    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      const callee = node.callee;

      if (!Predicates.isRecord(callee) || callee.type !== 'MemberExpression') {
        return;
      }

      const objectNode = callee.object;
      const propertyNode = callee.property;

      if (!Predicates.isRecord(objectNode) || objectNode.type !== 'Identifier' || objectNode.name !== 'Object') {
        return;
      }
      if (!Predicates.isRecord(propertyNode) || propertyNode.type !== 'Identifier' || propertyNode.name !== 'assign') {
        return;
      }

      const [
        firstArg,
        secondArg
      ] = node.arguments;

      if (!Predicates.isRecord(firstArg) || firstArg.type !== 'ThisExpression') {
        return;
      }
      if (!Predicates.isRecord(secondArg) || secondArg.type !== 'ConditionalExpression') {
        return;
      }

      const consequentNames = ObjectExpressionKeys.namesOf(secondArg.consequent);
      const alternateNames = ObjectExpressionKeys.namesOf(secondArg.alternate);
      const isUniform = consequentNames !== undefined && alternateNames !== undefined && PropertyNameSets.equal(consequentNames, alternateNames);

      if (isUniform) {
        return;
      }

      const methodDef = ClassMethodEligibility.findEnclosingMethod(node);

      if (methodDef === undefined || !eligibility.isEligible(methodDef)) {
        return;
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
    };

    const onSwitchStatement: NonNullable<Rule.RuleListener['SwitchStatement']> = (node) => {
      const methodDef = ClassMethodEligibility.findEnclosingMethod(node);

      if (methodDef === undefined || !eligibility.isEligible(methodDef)) {
        return;
      }

      const cases = node.cases;
      const perCaseLength = cases.length;
      const perCase: (readonly { readonly 'assignmentNode': AstNodeInterface; readonly 'propertyName': string }[])[] = [];

      for (let caseIndex = 0; caseIndex < perCaseLength; caseIndex += 1) {
        const switchCase = cases.at(caseIndex);

        perCase.push(switchCase === undefined ? [] : CaseAssignments.collect(switchCase));
      }
      const distinctPropertyNames = new Set<string>();

      for (let caseIndex = 0; caseIndex < perCaseLength; caseIndex += 1) {
        const assignments = perCase.at(caseIndex);

        if (assignments === undefined) {
          continue;
        }
        const assignmentsLength = assignments.length;

        for (let assignmentIndex = 0; assignmentIndex < assignmentsLength; assignmentIndex += 1) {
          const assignment = assignments.at(assignmentIndex);

          if (assignment !== undefined) {
            distinctPropertyNames.add(assignment.propertyName);
          }
        }
      }

      if (distinctPropertyNames.size < 2) {
        return;
      }

      for (let caseIndex = 0; caseIndex < perCaseLength; caseIndex += 1) {
        const assignments = perCase.at(caseIndex);

        if (assignments === undefined) {
          continue;
        }
        reportEach(assignments);
      }
    };

    return {
      'AssignmentExpression': onAssignmentExpression,
      'CallExpression': onCallExpression,
      'IfStatement': onIfStatement,
      'SwitchStatement': onSwitchStatement
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
