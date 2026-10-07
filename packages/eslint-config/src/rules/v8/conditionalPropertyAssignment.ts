import type { Rule } from 'eslint';

import { Predicates } from '#runtime';

import type { AstNodeInterface } from '../shared/AstNodeInterface.js';

import { AstHelpers } from '../shared/astHelpers.js';
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
        const items: readonly unknown[] = value;
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

    if (!ThisAssignment.isThisObject(left.object)) {
      return undefined;
    }

    const result = ThisAssignment.identifierPropertyName(left.property);

    return result;
  }

  private static isThisObject(objectNode: unknown): boolean {
    const result = Predicates.isRecord(objectNode) && objectNode.type === 'ThisExpression';

    return result;
  }

  private static identifierPropertyName(propertyNode: unknown): string | undefined {
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
      if (Predicates.isRecord(current) && current.type === 'MethodDefinition') {
        return current;
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

    const methodName = ClassMethodEligibility.methodIdentifierName(methodDef.key);

    if (methodName === undefined) {
      return false;
    }

    const constructorFunction = ClassMethodEligibility.siblingConstructorFunction(methodDef.parent);

    if (constructorFunction === undefined) {
      return false;
    }

    const result = ClassMethodEligibility.collectThisCallNames(constructorFunction.body).has(methodName);

    return result;
  }

  private static methodIdentifierName(keyNode: unknown): string | undefined {
    if (!Predicates.isRecord(keyNode) || keyNode.type !== 'Identifier' || typeof keyNode.name !== 'string') {
      return undefined;
    }

    return keyNode.name;
  }

  private static siblingConstructorFunction(classBody: unknown): Record<string, unknown> | undefined {
    if (!Predicates.isRecord(classBody) || classBody.type !== 'ClassBody' || !Array.isArray(classBody.body)) {
      return undefined;
    }

    const classMembers: readonly unknown[] = classBody.body;
    const constructorDef = classMembers.find((member): member is AstNodeInterface => {
      const result = Predicates.isRecord(member) && member.type === 'MethodDefinition' && member.kind === 'constructor';

      return result;
    });

    if (constructorDef === undefined) {
      return undefined;
    }

    const constructorFunction = constructorDef.value;

    if (!Predicates.isRecord(constructorFunction)) {
      return undefined;
    }

    return constructorFunction;
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
      const statements: readonly unknown[] = branchNode.body;
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
    const properties: readonly unknown[] = node.properties;
    const propertiesLength = properties.length;

    for (let index = 0; index < propertiesLength; index += 1) {
      const property = properties.at(index);
      const keyName = ObjectExpressionKeys.staticPropertyKeyName(property);

      if (keyName === undefined) {
        return undefined;
      }

      names.add(keyName);
    }

    return names;
  }

  private static staticPropertyKeyName(property: unknown): string | undefined {
    if (!Predicates.isRecord(property) || property.type !== 'Property' || property.computed === true) {
      return undefined;
    }

    const key = property.key;

    // Accepts `Identifier` OR quoted `Literal`: the repo's `quote-props: always` convention
    // makes every non-computed key a `Literal`, so an `Identifier`-only check would never resolve.
    if (!Predicates.isRecord(key)) {
      return undefined;
    }

    if (key.type === 'Identifier' && typeof key.name === 'string') {
      return key.name;
    }
    if (key.type === 'Literal' && typeof key.value === 'string') {
      return key.value;
    }

    return undefined;
  }
}

class CaseAssignments {
  // Direct (or one-BlockStatement-deep) assignments within a single switch case's consequent.
  public static collect(switchCase: unknown): readonly { readonly 'assignmentNode': AstNodeInterface; readonly 'propertyName': string }[] {
    if (!Predicates.isRecord(switchCase) || !Array.isArray(switchCase.consequent)) {
      return [];
    }

    const statements: readonly unknown[] = switchCase.consequent;
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

interface AssignmentRecordInterface {
  readonly 'assignmentNode': AstNodeInterface;
  readonly 'propertyName': string;
}

interface ConditionalAncestryInterface {
  readonly 'matchedConditional': AstNodeInterface | undefined;
  readonly 'matchedConditionalOwnSide': 'alternate' | 'consequent' | undefined;
  readonly 'matchedLogical': boolean;
  readonly 'methodDef': AstNodeInterface | undefined;
}

class ConditionalAssignmentListeners {
  public static reportEach(context: Rule.RuleContext, assignments: readonly AssignmentRecordInterface[]): void {
    const assignmentsLength = assignments.length;

    for (let index = 0; index < assignmentsLength; index += 1) {
      const assignment = assignments.at(index);

      if (assignment === undefined) {
        continue;
      }

      if (AstHelpers.isNode(assignment.assignmentNode)) {
        context.report({
          'messageId': 'forbidden', 'node': assignment.assignmentNode
        });
      }
    }
  }

  public static onIfStatement(
    context: Rule.RuleContext,
    eligibility: ClassMethodEligibility,
    node: Parameters<NonNullable<Rule.RuleListener['IfStatement']>>[0]
  ): void {
    const methodDef = ClassMethodEligibility.findEnclosingMethod(node);

    if (methodDef === undefined || !eligibility.isEligible(methodDef)) {
      return;
    }

    const consequentAssignments = StatementAssignments.collectBranch(node.consequent);

    if (consequentAssignments.length === 0) {
      return;
    }

    const alternate = node.alternate;

    if (alternate === null || alternate === undefined || alternate.type === 'IfStatement') {
      ConditionalAssignmentListeners.reportEach(context, consequentAssignments);

      return;
    }

    const alternateAssignments = StatementAssignments.collectBranch(alternate);
    const isUniform = PropertyNameSets.equal(StatementAssignments.namesOf(consequentAssignments), StatementAssignments.namesOf(alternateAssignments));

    if (isUniform) {
      return;
    }

    ConditionalAssignmentListeners.reportEach(context, consequentAssignments);
    ConditionalAssignmentListeners.reportEach(context, alternateAssignments);
  }

  private static matchConditionalStep(
    rawCurrent: AstNodeInterface,
    previousChild: Rule.Node,
    matched: { 'matchedConditional': AstNodeInterface | undefined; 'matchedConditionalOwnSide': 'alternate' | 'consequent' | undefined }
  ): void {
    if (matched.matchedConditional !== undefined || rawCurrent.type !== 'ConditionalExpression') {
      return;
    }
    if (rawCurrent.consequent === previousChild) {
      matched.matchedConditional = rawCurrent;
      matched.matchedConditionalOwnSide = 'consequent';
    } else if (rawCurrent.alternate === previousChild) {
      matched.matchedConditional = rawCurrent;
      matched.matchedConditionalOwnSide = 'alternate';
    }
  }

  private static findConditionalOrLogicalAncestor(node: Rule.Node): ConditionalAncestryInterface {
    let previousChild: Rule.Node = node;
    let current: Rule.Node | null = node.parent;
    let matchedLogical = false;
    const matched: { 'matchedConditional': AstNodeInterface | undefined; 'matchedConditionalOwnSide': 'alternate' | 'consequent' | undefined } = {
      'matchedConditional': undefined, 'matchedConditionalOwnSide': undefined
    };

    while (current !== null && Predicates.isRecord(current)) {
      const rawCurrent = current;

      ConditionalAssignmentListeners.matchConditionalStep(rawCurrent, previousChild, matched);

      if (!matchedLogical && rawCurrent.type === 'LogicalExpression' && rawCurrent.right === previousChild) {
        matchedLogical = true;
      }
      if (rawCurrent.type === 'MethodDefinition') {
        break;
      }

      previousChild = current;
      current = current.parent;
    }

    const methodDef = Predicates.isRecord(current) ? current : undefined;

    return {
      'matchedConditional': matched.matchedConditional,
      'matchedConditionalOwnSide': matched.matchedConditionalOwnSide,
      'matchedLogical': matchedLogical,
      'methodDef': methodDef
    };
  }

  // `IfStatement` ancestry is deliberately not inspected here — `onIfStatement` owns that
  // shape, so double-reporting the same assignment from both listeners cannot happen.
  public static onAssignmentExpression(
    context: Rule.RuleContext,
    eligibility: ClassMethodEligibility,
    node: Parameters<NonNullable<Rule.RuleListener['AssignmentExpression']>>[0]
  ): void {
    const ownPropertyName = ThisAssignment.getPropertyName(node);

    if (ownPropertyName === undefined) {
      return;
    }

    const ancestry = ConditionalAssignmentListeners.findConditionalOrLogicalAncestor(node);

    if (ancestry.matchedConditional === undefined && !ancestry.matchedLogical) {
      return;
    }

    const methodDef = ancestry.methodDef;

    if (methodDef?.type !== 'MethodDefinition' || !eligibility.isEligible(methodDef)) {
      return;
    }

    if (ancestry.matchedLogical) {
      // No second branch exists to compare against — a `&&`-guarded assignment is the missing-else hazard by construction.
      context.report({
        'messageId': 'forbidden', 'node': node
      });

      return;
    }

    ConditionalAssignmentListeners.reportIfConditionalBranchesDiffer(context, node, ancestry, ownPropertyName);
  }

  private static reportIfConditionalBranchesDiffer(
    context: Rule.RuleContext,
    node: Parameters<NonNullable<Rule.RuleListener['AssignmentExpression']>>[0],
    ancestry: ConditionalAncestryInterface,
    ownPropertyName: string
  ): void {
    const otherSideNode = ancestry.matchedConditionalOwnSide === 'consequent' ? ancestry.matchedConditional?.alternate : ancestry.matchedConditional?.consequent;
    const otherPropertyName = ThisAssignment.getPropertyName(otherSideNode);
    const isUniform = otherPropertyName === ownPropertyName;

    if (isUniform) {
      return;
    }

    context.report({
      'messageId': 'forbidden', 'node': node
    });
  }

  private static isObjectAssignCall(node: Parameters<NonNullable<Rule.RuleListener['CallExpression']>>[0]): boolean {
    const callee = node.callee;

    if (!Predicates.isRecord(callee) || callee.type !== 'MemberExpression') {
      return false;
    }

    const objectNode = callee.object;
    const propertyNode = callee.property;

    if (!Predicates.isRecord(objectNode) || objectNode.type !== 'Identifier' || objectNode.name !== 'Object') {
      return false;
    }
    if (!Predicates.isRecord(propertyNode) || propertyNode.type !== 'Identifier' || propertyNode.name !== 'assign') {
      return false;
    }

    return true;
  }

  private static isUniformObjectShape(branchNames: { 'alternate': ReadonlySet<string> | undefined; 'consequent': ReadonlySet<string> | undefined }): boolean {
    const result = branchNames.consequent !== undefined && branchNames.alternate !== undefined
      && PropertyNameSets.equal(branchNames.consequent, branchNames.alternate);

    return result;
  }

  // Covers `Object.assign(this, cond ? {...} : {...})`. Flags unless both object-literal
  // branches are PROVEN (static, non-spread, non-computed keys) to add the same key set.
  public static onCallExpression(
    context: Rule.RuleContext,
    eligibility: ClassMethodEligibility,
    node: Parameters<NonNullable<Rule.RuleListener['CallExpression']>>[0]
  ): void {
    if (!ConditionalAssignmentListeners.isObjectAssignCall(node)) {
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

    if (ConditionalAssignmentListeners.isUniformObjectShape({ 'alternate': alternateNames, 'consequent': consequentNames })) {
      return;
    }

    const methodDef = ClassMethodEligibility.findEnclosingMethod(node);

    if (methodDef === undefined || !eligibility.isEligible(methodDef)) {
      return;
    }

    context.report({
      'messageId': 'forbidden', 'node': node
    });
  }

  private static collectPerCaseAssignments(cases: readonly unknown[]): (readonly AssignmentRecordInterface[])[] {
    const perCaseLength = cases.length;
    const perCase: (readonly AssignmentRecordInterface[])[] = [];

    for (let caseIndex = 0; caseIndex < perCaseLength; caseIndex += 1) {
      const switchCase = cases.at(caseIndex);

      perCase.push(switchCase === undefined ? [] : CaseAssignments.collect(switchCase));
    }

    return perCase;
  }

  private static distinctPropertyNames(perCase: readonly (readonly AssignmentRecordInterface[])[]): Set<string> {
    const distinctPropertyNames = new Set<string>();
    const perCaseLength = perCase.length;

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

    return distinctPropertyNames;
  }

  public static onSwitchStatement(
    context: Rule.RuleContext,
    eligibility: ClassMethodEligibility,
    node: Parameters<NonNullable<Rule.RuleListener['SwitchStatement']>>[0]
  ): void {
    const methodDef = ClassMethodEligibility.findEnclosingMethod(node);

    if (methodDef === undefined || !eligibility.isEligible(methodDef)) {
      return;
    }

    const perCase = ConditionalAssignmentListeners.collectPerCaseAssignments(node.cases);
    const distinctPropertyNames = ConditionalAssignmentListeners.distinctPropertyNames(perCase);

    if (distinctPropertyNames.size < 2) {
      return;
    }

    const perCaseLength = perCase.length;

    for (let caseIndex = 0; caseIndex < perCaseLength; caseIndex += 1) {
      const assignments = perCase.at(caseIndex);

      if (assignments === undefined) {
        continue;
      }
      ConditionalAssignmentListeners.reportEach(context, assignments);
    }
  }
}

export const conditionalPropertyAssignment: Rule.RuleModule = {
  'create': (context) => {
    const eligibility = new ClassMethodEligibility();

    const onAssignmentExpression: NonNullable<Rule.RuleListener['AssignmentExpression']> = (node) => {
      ConditionalAssignmentListeners.onAssignmentExpression(context, eligibility, node);
    };
    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      ConditionalAssignmentListeners.onCallExpression(context, eligibility, node);
    };
    const onIfStatement: NonNullable<Rule.RuleListener['IfStatement']> = (node) => {
      ConditionalAssignmentListeners.onIfStatement(context, eligibility, node);
    };
    const onSwitchStatement: NonNullable<Rule.RuleListener['SwitchStatement']> = (node) => {
      ConditionalAssignmentListeners.onSwitchStatement(context, eligibility, node);
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
