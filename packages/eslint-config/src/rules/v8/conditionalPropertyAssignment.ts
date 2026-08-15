import type { Rule } from 'eslint';

import { type AstNodeInterface } from '../shared/AstNodeInterface.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';

class AstWalker {
  // Generic recursive descendant walk over raw AST shape (no visitor-keys
  // dependency): iterates every own property, recursing into arrays and
  // nested `{ type: string }` objects. Bounded to the subtree it is called
  // on (constructor bodies here), so the lack of a fast visitor-keys table
  // is not a performance concern.
  public static forEachDescendant(node: unknown, visit: (descendant: AstNodeInterface) => void): void {
    if (!ObjectGuard.isObject(node)) { return; }

    const entries = Object.entries(node);
    const entriesLength = entries.length;

    for (let entryIndex = 0; entryIndex < entriesLength; entryIndex += 1) {
      const entry = entries.at(entryIndex);
      if (entry === undefined) { continue; }
      const [key, value] = entry;
      if (key === 'parent') { continue; }

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
    if (!ObjectGuard.isObject(value) || typeof value.type !== 'string') { return; }
    visit(value);
    AstWalker.forEachDescendant(value, visit);
  }
}

class ThisAssignment {
  // Resolves `this.<name> = ...` to `<name>`. Deliberately excludes
  // computed member writes (`this[key] = ...`) — a dynamic key is
  // `dynamicPropertyAccess`'s concern, not this rule's.
  public static getPropertyName(node: unknown): string | undefined {
    if (!ObjectGuard.isObject(node) || node.type !== 'AssignmentExpression') { return undefined; }

    const left = node.left;
    if (!ObjectGuard.isObject(left) || left.type !== 'MemberExpression' || left.computed === true) { return undefined; }

    const objectNode = left.object;
    if (!ObjectGuard.isObject(objectNode) || objectNode.type !== 'ThisExpression') { return undefined; }

    const propertyNode = left.property;
    if (!ObjectGuard.isObject(propertyNode) || propertyNode.type !== 'Identifier' || typeof propertyNode.name !== 'string') { return undefined; }

    return propertyNode.name;
  }
}

class ClassMethodEligibility {
  // Local per-run cache: a helper method's eligibility depends only on its
  // sibling constructor, so it is stable across the many assignment/switch/
  // Object.assign call sites that may live inside the same helper.
  private readonly cache = new Map<AstNodeInterface, boolean>();

  // Walks up from `node` to the nearest enclosing MethodDefinition. Returns
  // undefined when `node` is not lexically inside any class method body
  // (e.g. a top-level function).
  public static findEnclosingMethod(node: Rule.Node): AstNodeInterface | undefined {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      const rawNode = current as unknown as AstNodeInterface;
      if (rawNode.type === 'MethodDefinition') { return rawNode; }
      current = current.parent;
    }

    return undefined;
  }

  // A method is a valid target when it is the constructor itself, or when
  // it is a same-class helper method called directly from the constructor
  // (`this.helperName()`) — a bounded, one-level indirection check.
  // Helpers called only transitively (through another helper) are not
  // covered; this is a documented residual limitation rather than a full
  // call-graph analysis.
  public isEligible(methodDef: AstNodeInterface): boolean {
    const cached = this.cache.get(methodDef);
    if (cached !== undefined) { return cached; }

    const result = this.compute(methodDef);
    this.cache.set(methodDef, result);
    return result;
  }

  private compute(methodDef: AstNodeInterface): boolean {
    if (methodDef.kind === 'constructor') { return true; }
    if (methodDef.kind !== 'method' || methodDef.computed === true) { return false; }

    const keyNode = methodDef.key;
    if (!ObjectGuard.isObject(keyNode) || keyNode.type !== 'Identifier' || typeof keyNode.name !== 'string') { return false; }
    const methodName = keyNode.name;

    const classBody = methodDef.parent;
    if (!ObjectGuard.isObject(classBody) || classBody.type !== 'ClassBody' || !Array.isArray(classBody.body)) { return false; }

    const constructorDef = (classBody.body as readonly unknown[]).find(
      (member): member is AstNodeInterface => {return ObjectGuard.isObject(member) && member.type === 'MethodDefinition' && member.kind === 'constructor';}
    );
    if (constructorDef === undefined) { return false; }

    const constructorFunction = constructorDef.value;
    if (!ObjectGuard.isObject(constructorFunction)) { return false; }

    return ClassMethodEligibility.collectThisCallNames(constructorFunction.body).has(methodName);
  }

  private static collectThisCallNames(bodyNode: unknown): ReadonlySet<string> {
    const names = new Set<string>();

    AstWalker.forEachDescendant(bodyNode, (descendant) => {
      if (descendant.type !== 'CallExpression') { return; }
      const callee = descendant.callee;
      if (!ObjectGuard.isObject(callee) || callee.type !== 'MemberExpression' || callee.computed === true) { return; }

      const objectNode = callee.object;
      if (!ObjectGuard.isObject(objectNode) || objectNode.type !== 'ThisExpression') { return; }

      const propertyNode = callee.property;
      if (ObjectGuard.isObject(propertyNode) && propertyNode.type === 'Identifier' && typeof propertyNode.name === 'string') {
        names.add(propertyNode.name);
      }
    });

    return names;
  }
}

class CaseAssignments {
  // Direct (or one-BlockStatement-deep) `this.<name> = ...` expression
  // statements within a single switch case's consequent — matches the
  // documented `case X: this.a = 1; break;` shape without a full deep walk.
  public static collect(switchCase: unknown): readonly { readonly 'assignmentNode': AstNodeInterface; readonly 'propertyName': string }[] {
    if (!ObjectGuard.isObject(switchCase) || !Array.isArray(switchCase.consequent)) { return []; }

    const found: { readonly 'assignmentNode': AstNodeInterface; readonly 'propertyName': string }[] = [];
    const statements = switchCase.consequent as readonly unknown[];
    const statementsLength = statements.length;

    for (let statementIndex = 0; statementIndex < statementsLength; statementIndex += 1) {
      const statement = statements.at(statementIndex);
      const candidates = ObjectGuard.isObject(statement) && statement.type === 'BlockStatement' && Array.isArray(statement.body)
        ? statement.body as readonly unknown[]
        : [statement];
      const candidatesLength = candidates.length;

      for (let candidateIndex = 0; candidateIndex < candidatesLength; candidateIndex += 1) {
        const candidate = candidates.at(candidateIndex);
        if (!ObjectGuard.isObject(candidate) || candidate.type !== 'ExpressionStatement') { continue; }
        const propertyName = ThisAssignment.getPropertyName(candidate.expression);
        if (propertyName === undefined) { continue; }

        const assignmentNode = candidate.expression;
        if (ObjectGuard.isObject(assignmentNode)) {
          found.push({ 'assignmentNode': assignmentNode, 'propertyName': propertyName });
        }
      }
    }

    return found;
  }
}

export const conditionalPropertyAssignment: Rule.RuleModule = {
  'create': (context) => {
    const eligibility = new ClassMethodEligibility();

    const reportIfEligible = (targetNode: Rule.Node, methodDef: AstNodeInterface | undefined): void => {
      if (methodDef === undefined || !eligibility.isEligible(methodDef)) { return; }
      context.report({ 'messageId': 'forbidden', 'node': targetNode });
    };

    // Covers: `if (cond) { this.a = 1; }`, ternary consequent/alternate
    // (`cond ? (this.a = 1) : (this.b = 2)`), and logical short-circuit
    // (`cond && (this.extra = 2)`). SwitchStatement is handled separately
    // below (it needs cross-case comparison, not a single-assignment walk),
    // so SwitchCase ancestry is deliberately excluded here to avoid
    // double-reporting the same assignment from both listeners.
    const onAssignmentExpression: NonNullable<Rule.RuleListener['AssignmentExpression']> = (node) => {
      if (ThisAssignment.getPropertyName(node) === undefined) { return; }

      let previousChild: Rule.Node = node;
      let current: Rule.Node | null = node.parent;
      let sawBranchingConstruct = false;

      while (current !== null) {
        const rawCurrent = current as unknown as AstNodeInterface;

        if (rawCurrent.type === 'IfStatement') { sawBranchingConstruct = true; }
        if (rawCurrent.type === 'ConditionalExpression' && (rawCurrent.consequent === previousChild || rawCurrent.alternate === previousChild)) {
          sawBranchingConstruct = true;
        }
        if (rawCurrent.type === 'LogicalExpression' && rawCurrent.right === previousChild) { sawBranchingConstruct = true; }
        if (rawCurrent.type === 'MethodDefinition') { break; }

        previousChild = current;
        current = current.parent;
      }

      if (!sawBranchingConstruct) { return; }

      const methodDef = current === null ? undefined : (current as unknown as AstNodeInterface);
      reportIfEligible(node, methodDef?.type === 'MethodDefinition' ? methodDef : undefined);
    };

    // Covers `Object.assign(this, cond ? {...} : {...})`.
    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      const callee = node.callee;
      if (!ObjectGuard.isObject(callee) || callee.type !== 'MemberExpression') { return; }

      const objectNode = callee.object;
      const propertyNode = callee.property;
      if (!ObjectGuard.isObject(objectNode) || objectNode.type !== 'Identifier' || objectNode.name !== 'Object') { return; }
      if (!ObjectGuard.isObject(propertyNode) || propertyNode.type !== 'Identifier' || propertyNode.name !== 'assign') { return; }

      const [firstArg, secondArg] = node.arguments;
      if (!ObjectGuard.isObject(firstArg) || firstArg.type !== 'ThisExpression') { return; }
      if (!ObjectGuard.isObject(secondArg) || secondArg.type !== 'ConditionalExpression') { return; }

      reportIfEligible(node, ClassMethodEligibility.findEnclosingMethod(node));
    };

    // Covers `switch (cond) { case 'a': this.a = 1; break; case 'b': this.b = 2; break; }`
    // — flagged only when cases assign *differing* properties. A switch
    // where every case assigns the same property does not vary the
    // resulting hidden class and is not flagged.
    const onSwitchStatement: NonNullable<Rule.RuleListener['SwitchStatement']> = (node) => {
      const methodDef = ClassMethodEligibility.findEnclosingMethod(node);
      if (methodDef === undefined || !eligibility.isEligible(methodDef)) { return; }

      const perCase = node.cases.map((switchCase) => { const result = CaseAssignments.collect(switchCase); return result; });
      const perCaseLength = perCase.length;
      const distinctPropertyNames = new Set<string>();
      for (let caseIndex = 0; caseIndex < perCaseLength; caseIndex += 1) {
        const assignments = perCase.at(caseIndex);
        if (assignments === undefined) { continue; }
        const assignmentsLength = assignments.length;
        for (let assignmentIndex = 0; assignmentIndex < assignmentsLength; assignmentIndex += 1) {
          const assignment = assignments.at(assignmentIndex);
          if (assignment !== undefined) { distinctPropertyNames.add(assignment.propertyName); }
        }
      }

      if (distinctPropertyNames.size < 2) { return; }

      for (let caseIndex = 0; caseIndex < perCaseLength; caseIndex += 1) {
        const assignments = perCase.at(caseIndex);
        if (assignments === undefined) { continue; }
        const assignmentsLength = assignments.length;
        for (let assignmentIndex = 0; assignmentIndex < assignmentsLength; assignmentIndex += 1) {
          const assignment = assignments.at(assignmentIndex);
          if (assignment === undefined) { continue; }
          context.report({ 'messageId': 'forbidden', 'node': assignment.assignmentNode as unknown as Rule.Node });
        }
      }
    };

    return {
      'AssignmentExpression': onAssignmentExpression,
      'CallExpression': onCallExpression,
      'SwitchStatement': onSwitchStatement
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow conditional property assignment on `this` inside a constructor (or a same-class helper called from it) via if/ternary/logical-short-circuit/switch/Object.assign — it produces divergent hidden classes for the same constructor.',
      'recommended': false
    },
    'messages': { 'forbidden': 'v8Optimization/conditionalPropertyAssignment: Conditional property assignment in a constructor breaks hidden classes. Assign every property unconditionally.' },
    'schema': [],
    'type': 'problem'
  }
};
