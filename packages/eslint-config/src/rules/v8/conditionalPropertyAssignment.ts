import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types';

import type { AstNodeInterface } from '../shared/AstNodeInterface.js';

import {
  MESSAGE, RULE_NAME
} from './constants/ConditionalPropertyAssignmentConstants.js';

// WHY SAME-PROPERTY BRANCHING IS EXEMPT, AND DIFFERENT-PROPERTY BRANCHING IS NOT.
//
//   node --allow-natives-syntax
//   class SameProperty { constructor(flag) { this.tag = 1; if (flag) { this.value = 1; } else { this.value = 2; } } }
//   class DifferentProperty { constructor(flag) { this.tag = 1; if (flag) { this.value = 1; } else { this.other = 2; } } }
//   class MissingElse { constructor(flag) { this.tag = 1; if (flag) { this.value = 1; } } }
//   class LogicalShortCircuit { constructor(flag) { this.tag = 1; flag && (this.extra = 2); } }
//
//   %HaveSameMap(new SameProperty(true), new SameProperty(false))            -> true   <-- no divergence
//   %HaveSameMap(new DifferentProperty(true), new DifferentProperty(false))  -> false  <-- real hazard
//   %HaveSameMap(new MissingElse(true), new MissingElse(false))              -> false  <-- real hazard
//   %HaveSameMap(new LogicalShortCircuit(true), new LogicalShortCircuit(false)) -> false <-- real hazard
//
// Every branch shape stays in `%HasFastProperties`, so this was never a dictionary-mode
// question — it is whether every branch of a conditional construct is PROVEN to establish
// the identical set of properties. When it does (both `if`/`else` assign only `value`), the
// two instances end up with the same map and every call site reading them stays
// monomorphic. When it does not — a different property per branch, a branch that assigns
// nothing (`if` with no `else`), or a `&&` short-circuit (which has no "else" to compare
// against by construction) — the instances diverge and any call site reading both goes
// megamorphic. Benchmarked at 5,000,000 reads across a 2-instance pool, median of 7,
// 3-call warm-up (scratchpad/bench_conditionalAssign.js):
//
//   same-property branches (monomorphic .tag read)       5.17 ms
//   different-property branches (megamorphic .tag read)  6.75 ms   1.3x
//
// (in line with the previously reported 1.80x for this class of hazard; pool shape and
// GC pressure at this scale account for the spread — the DIRECTION is what is load-bearing)
//
// So this rule now applies a DISTINCT-PROPERTY check uniformly across all four branching
// shapes it recognizes:
//   * `if`/`else` — compares the property-name SET assigned in each branch (one
//     `BlockStatement`-deep, matching the existing `SwitchStatement` handler's granularity).
//     Equal sets: exempt. A bare `if` with no `else`, or an `else if` chain (where this
//     level cannot see the chain's eventual terminal branches without walking further),
//     conservatively still flags — proven divergent above for the no-`else` case, and
//     unproven-safe for a chain, which resolves toward the stricter side.
//   * Ternary (`cond ? (this.a = 1) : (this.b = 2)`) — same comparison, expression-shaped:
//     each side must itself be a direct `this.<name> = ...` assignment with the SAME name.
//   * `&&` short-circuit — always flagged. There is no second branch to compare against;
//     "sometimes assigned, sometimes not" is the missing-else hazard by construction.
//   * `Object.assign(this, cond ? {...} : {...})` — compares the STATIC (non-computed,
//     non-spread) key sets of the two object-literal branches. Either branch containing a
//     spread or a computed key cannot be proven safe from the AST alone, so — same
//     resolve-toward-stricter posture — it still flags.
//   * `switch` — unchanged; this is the check the other four shapes were extended to match.
//
// PAIRED RULE: `define-property`'s redefinition check reaches the same conclusion
// (non-uniform establishment diverges instance shape) via `Object.defineProperty` instead
// of a plain assignment. Change them together.

class AstWalker {
  // Generic recursive descendant walk over raw AST shape (no visitor-keys
  // dependency): iterates every own property, recursing into arrays and
  // nested `{ type: string }` objects. Bounded to the subtree it is called
  // on (constructor bodies here), so the lack of a fast visitor-keys table
  // is not a performance concern.
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
  // Resolves `this.<name> = ...` to `<name>`. Deliberately excludes
  // computed member writes (`this[key] = ...`) — a dynamic key is
  // `dynamicPropertyAccess`'s concern, not this rule's.
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

      if (rawNode.type === 'MethodDefinition') {
        return rawNode;
      }
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
  // A single statement's direct `this.<name> = ...` — only an ExpressionStatement whose
  // expression is itself a `this`-assignment counts; anything else (a ternary/logical
  // expression statement, a return, a nested if, …) is not a "direct" assignment at this
  // level and is left to whatever listener owns that shape.
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

  // Collects direct (or one-`BlockStatement`-deep) `this.<name> = ...` assignments from a
  // single branch node — a `BlockStatement` (its `.body` is walked one level) or a bare
  // single statement (an `if` without braces, or one `switch`-case statement).
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
  // The static (non-computed, non-spread) top-level key set of an object-literal branch of
  // `Object.assign(this, cond ? {...} : {...})`. `undefined` means "cannot prove" — a
  // spread or computed key defeats static analysis, and the caller resolves toward the
  // stricter side (flags) rather than guess.
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

      // Accepts a bare `Identifier` key OR a quoted `Literal` key: this repo's
      // `quote-props: always` convention (`eslint.config.mjs`) makes every non-computed
      // object-literal property key a `Literal` (`{ 'a': 1 }`, not `{ a: 1 }`) — an
      // `Identifier`-only check would never resolve real, convention-compliant code and
      // this method would always return `undefined` (i.e. always flag, defeating the
      // same-key exemption below).
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
  // Direct (or one-BlockStatement-deep) `this.<name> = ...` expression
  // statements within a single switch case's consequent — matches the
  // documented `case X: this.a = 1; break;` shape without a full deep walk.
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

    // `if`/`else` — flags only when the branches are NOT proven to establish the same
    // property set. A bare `if` (no `else`) or an `else if` chain conservatively flags
    // every assignment found in the `if`-branch — see the module comment.
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

    // Covers ternary (`cond ? (this.a = 1) : (this.b = 2)`) and logical short-circuit
    // (`cond && (this.extra = 2)`). `IfStatement` ancestry is deliberately not inspected
    // here — `onIfStatement` above owns that shape, so double-reporting the same
    // assignment from both listeners cannot happen.
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
        // No second branch exists to compare against — a `&&`-guarded assignment is the
        // missing-else hazard by construction (proven divergent in the module comment).
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

    // Covers `switch (cond) { case 'a': this.a = 1; break; case 'b': this.b = 2; break; }`
    // — flagged only when cases assign *differing* properties. A switch where every case
    // assigns the same property does not vary the resulting hidden class and is not
    // flagged. This is the check the other four branching shapes above were extended to
    // match.
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
