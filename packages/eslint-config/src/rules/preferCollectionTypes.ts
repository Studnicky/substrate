import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';
import type { Rule, Scope } from 'eslint';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';
import { Predicates } from '@studnicky/types/browser';

import { ITERATION_METHODS } from './constants/PreferCollectionTypesConstants.js';
import { AstHelpers } from './shared/astHelpers.js';

namespace PreferCollectionTypesOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'checkArrayLiterals': {
        'default': true,
        'description': 'Flag inline array literals used with .includes() (Pattern A) and .includes() inside iteration callbacks (Pattern D).',
        'type': 'boolean'
      },
      'checkFromEntries': {
        'default': true,
        'description': 'Flag Object.fromEntries() results accessed with computed bracket notation (Pattern B).',
        'type': 'boolean'
      },
      'checkModuleScopeArrays': {
        'default': true,
        'description': 'Flag module-scope const arrays used exclusively for .includes() membership tests (Pattern C).',
        'type': 'boolean'
      }
    },
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'checkArrayLiterals': SchemaNode.defineBoolean({
        'default': true,
        'description': 'Flag inline array literals used with .includes() (Pattern A) and .includes() inside iteration callbacks (Pattern D).',
        'type': 'boolean'
      } as const),
      'checkFromEntries': SchemaNode.defineBoolean({
        'default': true,
        'description': 'Flag Object.fromEntries() results accessed with computed bracket notation (Pattern B).',
        'type': 'boolean'
      } as const),
      'checkModuleScopeArrays': SchemaNode.defineBoolean({
        'default': true,
        'description': 'Flag module-scope const arrays used exclusively for .includes() membership tests (Pattern C).',
        'type': 'boolean'
      } as const)
    },
    [] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;

  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}

namespace PreferCollectionTypesInternalEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'found': { 'type': 'boolean' },
      'method': { 'type': 'string' },
      'name': { 'type': 'string' },
      'reported': { 'type': 'boolean' }
    },
    'required': ['found', 'method', 'name', 'reported'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'found': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'method': SchemaNode.defineString({ 'type': 'string' } as const),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'reported': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
    },
    ['found', 'method', 'name', 'reported'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}

interface ModuleScopeArrayEntryInterface {
  readonly 'name': PreferCollectionTypesInternalEntity.Type['name'];
  readonly 'node': Rule.Node;
  readonly 'variable': Scope.Variable;
}

// Tracks an outer iteration call's function-argument subtree during traversal so a
// nested match attributes back to it without a second walk.
interface IterationStackEntryInterface {
  'found': PreferCollectionTypesInternalEntity.Type['found'];
  readonly 'method': PreferCollectionTypesInternalEntity.Type['method'];
  readonly 'outerNode': Rule.Node;
  readonly 'pendingArguments': Set<unknown>;
  'reported': PreferCollectionTypesInternalEntity.Type['reported'];
}

class NodePropertyAccess {
  public static getString(object: Record<string, unknown>, key: string): string | undefined {
    const value = Reflect.get(object, key);
    const result = typeof value === 'string' ? value : undefined;
    return result;
  }

  public static getBool(object: Record<string, unknown>, key: string): boolean | undefined {
    const value = Reflect.get(object, key);
    const result = typeof value === 'boolean' ? value : undefined;
    return result;
  }

  public static getNode(object: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
    const value: unknown = Reflect.get(object, key);
    const result = Predicates.isRecord(value) ? value : undefined;
    return result;
  }
}

class MembershipCallDetection {
  // Returns true if node is: SomeExpr.includes(...)
  public static isIncludesCall(node: unknown): boolean {
    if (AstHelpers.getNodeType(node) !== 'CallExpression') { return false; }
    if (!Predicates.isRecord(node)) { return false; }
    const callee = node.callee;
    if (!Predicates.isRecord(callee)) { return false; }
    if (AstHelpers.getNodeType(callee) !== 'MemberExpression') { return false; }
    if (NodePropertyAccess.getBool(callee, 'computed') !== false) { return false; }
    const property = callee.property;
    if (!Predicates.isRecord(property)) { return false; }
    const result = NodePropertyAccess.getString(property, 'name') === 'includes';
    return result;
  }

  // Returns true if node is: SomeExpr.indexOf(...)
  public static isIndexOfCall(node: unknown): boolean {
    if (AstHelpers.getNodeType(node) !== 'CallExpression') { return false; }
    if (!Predicates.isRecord(node)) { return false; }
    const callee = node.callee;
    if (!Predicates.isRecord(callee)) { return false; }
    if (AstHelpers.getNodeType(callee) !== 'MemberExpression') { return false; }
    if (NodePropertyAccess.getBool(callee, 'computed') !== false) { return false; }
    const property = callee.property;
    if (!Predicates.isRecord(property)) { return false; }
    const result = NodePropertyAccess.getString(property, 'name') === 'indexOf';
    return result;
  }

  // Returns true if node is a numeric literal matching `value`, handling negative
  // literals which parse as UnaryExpression{operator:'-', argument: Literal}
  public static isNumericLiteral(node: unknown, value: number): boolean {
    if (!Predicates.isRecord(node)) { return false; }
    if (value < 0) {
      if (AstHelpers.getNodeType(node) !== 'UnaryExpression') { return false; }
      if (NodePropertyAccess.getString(node, 'operator') !== '-') { return false; }
      const argument = node.argument;
      if (!Predicates.isRecord(argument)) { return false; }
      const result = AstHelpers.getNodeType(argument) === 'Literal' && argument.value === Math.abs(value);
      return result;
    }
    const result = AstHelpers.getNodeType(node) === 'Literal' && node.value === value;
    return result;
  }

  // Returns true if node is: ArrayExpression.includes(...)
  public static isArrayLiteralIncludesCall(node: unknown): boolean {
    if (!MembershipCallDetection.isIncludesCall(node)) { return false; }
    if (!Predicates.isRecord(node)) { return false; }
    const callee = node.callee;
    if (!Predicates.isRecord(callee)) { return false; }
    const object = callee.object;
    const result = AstHelpers.getNodeType(object) === 'ArrayExpression';
    return result;
  }

  // Returns true if node is: ArrayExpression.indexOf(...) used in a membership comparison
  // (!== -1 / > -1 / < 0)
  public static isArrayLiteralIndexOfMembershipCall(node: unknown): boolean {
    if (!MembershipCallDetection.isIndexOfCall(node)) { return false; }
    if (!Predicates.isRecord(node)) { return false; }
    const callee = node.callee;
    if (!Predicates.isRecord(callee)) { return false; }
    const object = callee.object;
    if (AstHelpers.getNodeType(object) !== 'ArrayExpression') { return false; }
    const parent = AstHelpers.getParent(node);
    const result = MembershipIndexOfCall.get(parent) === node;
    return result;
  }

  // Returns true if node is: Object.fromEntries(...)
  public static isObjectFromEntriesCall(node: unknown): boolean {
    if (AstHelpers.getNodeType(node) !== 'CallExpression') { return false; }
    if (!Predicates.isRecord(node)) { return false; }
    const callee = node.callee;
    if (!Predicates.isRecord(callee)) { return false; }
    if (AstHelpers.getNodeType(callee) !== 'MemberExpression') { return false; }
    if (NodePropertyAccess.getBool(callee, 'computed') !== false) { return false; }

    const object = callee.object;
    if (!Predicates.isRecord(object) || AstHelpers.getNodeType(object) !== 'Identifier') { return false; }
    if (NodePropertyAccess.getString(object, 'name') !== 'Object') { return false; }

    const property = callee.property;
    if (!Predicates.isRecord(property)) { return false; }
    const result = NodePropertyAccess.getString(property, 'name') === 'fromEntries';
    return result;
  }

}

class MembershipIndexOfCall {
  // Returns the indexOf CallExpression node if `node` is a BinaryExpression performing
  // a membership comparison equivalent to `.includes()`.
  public static get(node: unknown): unknown {
    if (AstHelpers.getNodeType(node) !== 'BinaryExpression') { return undefined; }
    if (!Predicates.isRecord(node)) { return undefined; }
    const operator = NodePropertyAccess.getString(node, 'operator');
    const left = node.left;
    const right = node.right;

    if (MembershipIndexOfCall.isNotFoundComparison(operator, left, right)) { return left; }
    if (MembershipIndexOfCall.isFoundComparison(operator, left, right)) { return left; }

    return undefined;
  }

  private static isNotFoundComparison(operator: string | undefined, left: unknown, right: unknown): boolean {
    const result = (operator === '!==' || operator === '===' || operator === '>')
      && MembershipCallDetection.isIndexOfCall(left)
      && MembershipCallDetection.isNumericLiteral(right, -1);

    return result;
  }

  private static isFoundComparison(operator: string | undefined, left: unknown, right: unknown): boolean {
    const result = (operator === '<' || operator === '>=')
      && MembershipCallDetection.isIndexOfCall(left)
      && MembershipCallDetection.isNumericLiteral(right, 0);

    return result;
  }
}

// Rides ESLint's single AST traversal via a LIFO stack instead of a second manual
// walk; DFS ordering keeps nested qualifying calls correctly attributed.
class IterationCallbackTracker {
  // Pushes a stack entry when `node` is a tracked iteration method call with at
  // least one function-typed argument, for later attribution.
  public static pushIfQualifying(node: Rule.Node, stack: IterationStackEntryInterface[]): void {
    const raw = node as unknown as Record<string, unknown>;

    if (AstHelpers.getNodeType(raw) !== 'CallExpression') { return; }

    const methodName = IterationCallbackTracker.qualifyingIterationMethodName(raw);
    if (methodName === undefined) { return; }

    const argumentList = raw.arguments;
    if (!Array.isArray(argumentList) || argumentList.length === 0) { return; }

    const pendingArguments = IterationCallbackTracker.collectFunctionArguments(argumentList);
    if (pendingArguments.size === 0) { return; }

    stack.push({ 'found': false, 'method': methodName, 'outerNode': node, 'pendingArguments': pendingArguments, 'reported': false });
  }

  private static qualifyingIterationMethodName(raw: Record<string, unknown>): string | undefined {
    const callee = raw.callee;
    if (!Predicates.isRecord(callee)) { return undefined; }
    if (AstHelpers.getNodeType(callee) !== 'MemberExpression') { return undefined; }
    if (NodePropertyAccess.getBool(callee, 'computed') !== false) { return undefined; }

    const property = callee.property;
    if (!Predicates.isRecord(property)) { return undefined; }
    const methodName = NodePropertyAccess.getString(property, 'name');

    if (methodName === undefined || !ITERATION_METHODS.has(methodName)) { return undefined; }

    return methodName;
  }

  private static collectFunctionArguments(argumentList: readonly unknown[]): Set<unknown> {
    const pendingArguments = new Set<unknown>();
    const argumentListLength = argumentList.length;

    for (let argumentIndex = 0; argumentIndex < argumentListLength; argumentIndex += 1) {
      const argument: unknown = argumentList.at(argumentIndex);
      const argumentType = AstHelpers.getNodeType(argument);

      if (argumentType === 'ArrowFunctionExpression' || argumentType === 'FunctionExpression') {
        pendingArguments.add(argument);
      }
    }

    return pendingArguments;
  }

  // Marks every active outer call as containing a match, including calls nested
  // further beneath it.
  public static markActiveFound(stack: IterationStackEntryInterface[]): void {
    const stackLength = stack.length;
    for (let stackIndex = 0; stackIndex < stackLength; stackIndex += 1) {
      const entry = stack.at(stackIndex);
      if (entry !== undefined) { entry.found = true; }
    }
  }

  // Pops the entry once all its function-typed arguments finish traversal; reports
  // once if a match was found beneath it.
  public static onFunctionArgumentExit(node: unknown, stack: IterationStackEntryInterface[], context: Rule.RuleContext): void {
    const top = stack.at(-1);
    if (top === undefined) { return; }
    if (!top.pendingArguments.has(node)) { return; }

    top.pendingArguments.delete(node);
    if (top.pendingArguments.size > 0) { return; }

    stack.pop();
    if (top.found && !top.reported) {
      top.reported = true;
      context.report({
        'data': { 'method': top.method },
        'messageId': 'includesInCallback',
        'node': top.outerNode
      });
    }
  }
}

class ScopeReferenceDetection {
  // Returns true if this scope reference is: ident.includes(...) as a call callee
  public static isIncludesCalleeReference(reference: Scope.Reference): boolean {
    const id = reference.identifier;
    const parent = AstHelpers.getParent(id);
    if (!Predicates.isRecord(parent)) { return false; }
    if (AstHelpers.getNodeType(parent) !== 'MemberExpression') { return false; }
    if (NodePropertyAccess.getBool(parent, 'computed') !== false) { return false; }
    const prop = parent.property;
    if (!Predicates.isRecord(prop)) { return false; }
    if (NodePropertyAccess.getString(prop, 'name') !== 'includes') { return false; }

    // Identifier must be the object (left side), not an argument
    if (parent.object !== (id as unknown)) { return false; }

    // MemberExpression must be the callee of a CallExpression
    const grandParent = AstHelpers.getParent(parent);
    if (!Predicates.isRecord(grandParent)) { return false; }
    if (AstHelpers.getNodeType(grandParent) !== 'CallExpression') { return false; }
    if (grandParent.callee !== (parent as unknown)) { return false; }

    return true;
  }

  // Returns true if this scope reference is: ident.indexOf(...) used in a membership comparison
  public static isIndexOfCalleeMembershipReference(reference: Scope.Reference): boolean {
    const id = reference.identifier;
    const parent = AstHelpers.getParent(id);
    if (!Predicates.isRecord(parent)) { return false; }
    if (AstHelpers.getNodeType(parent) !== 'MemberExpression') { return false; }
    if (NodePropertyAccess.getBool(parent, 'computed') !== false) { return false; }
    const prop = parent.property;
    if (!Predicates.isRecord(prop)) { return false; }
    if (NodePropertyAccess.getString(prop, 'name') !== 'indexOf') { return false; }

    if (parent.object !== (id as unknown)) { return false; }

    const grandParent = AstHelpers.getParent(parent);
    if (!Predicates.isRecord(grandParent)) { return false; }
    if (AstHelpers.getNodeType(grandParent) !== 'CallExpression') { return false; }
    if (grandParent.callee !== (parent as unknown)) { return false; }

    const greatGrandParent = AstHelpers.getParent(grandParent);
    const result = MembershipIndexOfCall.get(greatGrandParent) === (grandParent as unknown);
    return result;
  }

  public static isComputedMemberObjectReference(reference: Scope.Reference): boolean {
    const id = reference.identifier;
    const parent = AstHelpers.getParent(id);
    if (!Predicates.isRecord(parent)) { return false; }
    if (AstHelpers.getNodeType(parent) !== 'MemberExpression') { return false; }
    if (NodePropertyAccess.getBool(parent, 'computed') !== true) { return false; }
    const result = parent.object === (id as unknown);
    return result;
  }
}

class ReferenceGuards {
  public static isReadReference(reference: Scope.Reference): boolean {
    const result = !reference.isWrite();
    return result;
  }

  public static isMembershipReference(reference: Scope.Reference): boolean {
    const result = ScopeReferenceDetection.isIncludesCalleeReference(reference) || ScopeReferenceDetection.isIndexOfCalleeMembershipReference(reference);
    return result;
  }

}

class RuleHandlers {
  public static onCallExpression(
    node: Rule.Node,
    options: Required<PreferCollectionTypesOptionsEntity.Type>,
    context: Rule.RuleContext,
    iterationStack: IterationStackEntryInterface[]
  ): void {
    if (!options.checkArrayLiterals) { return; }

    // Pattern A: [a, b, c].includes(x) — inline array literal membership test
    if (
      MembershipCallDetection.isArrayLiteralIncludesCall(node)
      || MembershipCallDetection.isArrayLiteralIndexOfMembershipCall(node)
    ) {
      // Attribute this match to every currently-open .filter/.some/.every/.find/
      // .findIndex(fn) call so Pattern D can report once their callback exits.
      IterationCallbackTracker.markActiveFound(iterationStack);
      context.report({ 'messageId': 'arrayLiteralIncludes', 'node': node });
      return;
    }

    // Pattern D candidate; the match is discovered when this listener fires again
    // on the nested ArrayLiteral call above, reported at :exit.
    IterationCallbackTracker.pushIfQualifying(node, iterationStack);
  }

  public static onIterationCallbackExit(node: unknown, context: Rule.RuleContext, iterationStack: IterationStackEntryInterface[]): void {
    IterationCallbackTracker.onFunctionArgumentExit(node, iterationStack, context);
  }

  public static onMemberExpression(node: Rule.Node, options: Required<PreferCollectionTypesOptionsEntity.Type>, context: Rule.RuleContext): void {
    // Pattern B: Object.fromEntries(...)[key] — inline computed access on fromEntries result
    if (!options.checkFromEntries) { return; }
    const raw = node as unknown as Record<string, unknown>;
    if (NodePropertyAccess.getBool(raw, 'computed') !== true) { return; }

    const object = NodePropertyAccess.getNode(raw, 'object');
    if (AstHelpers.getNodeType(object) !== 'CallExpression' || object === undefined) { return; }

    if (!RuleHandlers.isObjectFromEntriesCall(object)) { return; }

    context.report({ 'messageId': 'fromEntriesWithBracket', 'node': node });
  }

  private static isObjectFromEntriesCall(object: Record<string, unknown>): boolean {
    const callee = NodePropertyAccess.getNode(object, 'callee');
    if (AstHelpers.getNodeType(callee) !== 'MemberExpression' || callee === undefined) { return false; }
    if (NodePropertyAccess.getBool(callee, 'computed') !== false) { return false; }

    const calleeObject = NodePropertyAccess.getNode(callee, 'object');
    const calleeProperty = NodePropertyAccess.getNode(callee, 'property');
    if (AstHelpers.getNodeType(calleeObject) !== 'Identifier' || calleeObject === undefined) { return false; }
    if (NodePropertyAccess.getString(calleeObject, 'name') !== 'Object') { return false; }
    if (AstHelpers.getNodeType(calleeProperty) !== 'Identifier' || calleeProperty === undefined) { return false; }
    if (NodePropertyAccess.getString(calleeProperty, 'name') !== 'fromEntries') { return false; }

    return true;
  }

  public static onProgramExit(
    _node: Parameters<NonNullable<Rule.RuleListener['Program:exit']>>[0],
    options: Required<PreferCollectionTypesOptionsEntity.Type>,
    context: Rule.RuleContext,
    moduleScopeArrays: ModuleScopeArrayEntryInterface[],
    fromEntriesBindings: ModuleScopeArrayEntryInterface[]
  ): void {
    if (options.checkModuleScopeArrays) {
      RuleHandlers.reportMembershipOnlyArrays(context, moduleScopeArrays);
    }

    if (options.checkFromEntries) {
      RuleHandlers.reportComputedOnlyFromEntriesBindings(context, fromEntriesBindings);
    }
  }

  private static reportMembershipOnlyArrays(context: Rule.RuleContext, moduleScopeArrays: readonly ModuleScopeArrayEntryInterface[]): void {
    const entryCount = moduleScopeArrays.length;

    for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
      const entry = moduleScopeArrays.at(entryIndex); if (entry === undefined) { continue; }
      // references is fully populated at Program:exit
      const readRefs = entry.variable.references.filter(ReferenceGuards.isReadReference);

      if (readRefs.length === 0) {
        // No reads — unused; skip (other rules handle unused vars)
        continue;
      }

      const allRefsAreIncludes = readRefs.every(ReferenceGuards.isMembershipReference);

      if (allRefsAreIncludes) {
        context.report({
          'data': { 'name': entry.name },
          'messageId': 'constantArrayForMembership',
          'node': entry.node
        });
      }
    }
  }

  private static reportComputedOnlyFromEntriesBindings(context: Rule.RuleContext, fromEntriesBindings: readonly ModuleScopeArrayEntryInterface[]): void {
    const bindingCount = fromEntriesBindings.length;

    for (let bindingIndex = 0; bindingIndex < bindingCount; bindingIndex += 1) {
      const entry = fromEntriesBindings.at(bindingIndex); if (entry === undefined) { continue; }
      const readRefs = entry.variable.references.filter(ReferenceGuards.isReadReference);

      if (readRefs.length === 0) { continue; }

      const allRefsAreComputedLookups = readRefs.every(ScopeReferenceDetection.isComputedMemberObjectReference);

      if (allRefsAreComputedLookups) {
        context.report({
          'messageId': 'fromEntriesWithBracket',
          'node': entry.node
        });
      }
    }
  }

  public static onVariableDeclarator(
    node: Rule.Node,
    options: Required<PreferCollectionTypesOptionsEntity.Type>,
    context: Rule.RuleContext,
    moduleScopeArrays: ModuleScopeArrayEntryInterface[],
    fromEntriesBindings: ModuleScopeArrayEntryInterface[]
  ): void {
    const parent = node.parent as unknown as Record<string, unknown>;
    if (AstHelpers.getNodeType(parent) !== 'VariableDeclaration') { return; }
    if (NodePropertyAccess.getString(parent, 'kind') !== 'const') { return; }

    // Binding must be a simple identifier
    const name = RuleHandlers.constIdentifierName(node);
    if (name === undefined) { return; }

    RuleHandlers.recordQualifyingDeclarator(node, name, options, context, { 'fromEntriesBindings': fromEntriesBindings, 'moduleScopeArrays': moduleScopeArrays });
  }

  private static constIdentifierName(node: Rule.Node): string | undefined {
    const declaratorRaw = node as unknown as Record<string, unknown>;
    const id = declaratorRaw.id;

    if (AstHelpers.getNodeType(id) !== 'Identifier') { return undefined; }

    const result = NodePropertyAccess.getString(id as Record<string, unknown>, 'name');

    return result;
  }

  private static resolveDeclaredVariable(context: Rule.RuleContext, node: Rule.Node, name: string): Scope.Variable | undefined {
    // getDeclaredVariables resolves the scope variable regardless of declaring scope,
    // with reference tracking populated by the end of the AST pass.
    const parentNode = node.parent;

    if (parentNode === null) { return undefined; }

    const declared = context.sourceCode.getDeclaredVariables(parentNode);
    const result = declared.find((v: Scope.Variable) => {
      const matches = v.name === name;

      return matches;
    });

    return result;
  }

  private static recordQualifyingDeclarator(
    node: Rule.Node,
    name: string,
    options: Required<PreferCollectionTypesOptionsEntity.Type>,
    context: Rule.RuleContext,
    collectors: { 'fromEntriesBindings': ModuleScopeArrayEntryInterface[]; 'moduleScopeArrays': ModuleScopeArrayEntryInterface[] }
  ): void {
    const declaratorRaw = node as unknown as Record<string, unknown>;
    const isArrayLiteralInit = AstHelpers.getNodeType(declaratorRaw.init) === 'ArrayExpression';
    const isFromEntriesInit = MembershipCallDetection.isObjectFromEntriesCall(declaratorRaw.init);

    if (!isArrayLiteralInit && !isFromEntriesInit) { return; }

    const variable = RuleHandlers.resolveDeclaredVariable(context, node, name);
    if (variable === undefined) { return; }

    // Pattern C: const VALID = ['a', 'b'], used only for .includes()/.indexOf() membership
    if (isArrayLiteralInit && options.checkModuleScopeArrays) {
      collectors.moduleScopeArrays.push({ 'name': name, 'node': node, 'variable': variable });
      return;
    }

    // Pattern B (indirect): const lookup = Object.fromEntries(...), used only via lookup[key]
    if (isFromEntriesInit && options.checkFromEntries) {
      collectors.fromEntriesBindings.push({ 'name': name, 'node': node, 'variable': variable });
    }
  }
}

export const preferCollectionTypes: Rule.RuleModule = {
  'create': (context) => {
    const options = PreferCollectionTypesOptionsEntity.intake(context.options.at(0) ?? {});

    const moduleScopeArrays: ModuleScopeArrayEntryInterface[] = [];
    const fromEntriesBindings: ModuleScopeArrayEntryInterface[] = [];
    const iterationStack: IterationStackEntryInterface[] = [];

    const callExpressionHandler = (node: Rule.Node): void => { RuleHandlers.onCallExpression(node, options, context, iterationStack); };
    const memberExpressionHandler = (node: Rule.Node): void => { RuleHandlers.onMemberExpression(node, options, context); };
    const programExitHandler: NonNullable<Rule.RuleListener['Program:exit']> = (node): void => { RuleHandlers.onProgramExit(node, options, context, moduleScopeArrays, fromEntriesBindings); };
    const variableDeclaratorHandler = (node: Rule.Node): void => { RuleHandlers.onVariableDeclarator(node, options, context, moduleScopeArrays, fromEntriesBindings); };
    const iterationCallbackExitHandler = (node: unknown): void => { RuleHandlers.onIterationCallbackExit(node, context, iterationStack); };

    return {
      'ArrowFunctionExpression:exit': iterationCallbackExitHandler,
      'CallExpression': callExpressionHandler,
      'FunctionExpression:exit': iterationCallbackExitHandler,
      'MemberExpression': memberExpressionHandler,
      'Program:exit': programExitHandler,
      'VariableDeclarator': variableDeclaratorHandler
    };
  },
  'meta': {
    'docs': {
      'description': 'Prefer Set/Map over arrays/POJOs for membership and lookup operations.',
      'recommended': false
    },
    'messages': {
      'arrayLiteralIncludes': "Inline array '.includes()' is O(n). Use 'new Set([...]).has(x)' for O(1) membership — Set.has is 29× faster than Array.includes on equal-size inputs.",
      'constantArrayForMembership': "'{{name}}' is used only for '.includes()' membership testing. Declare it as 'new Set([...])' — Set.has is 29× faster than Array.includes.",
      'fromEntriesWithBracket': "'Object.fromEntries()' accessed via computed key. Use 'new Map(...)' — Map.get() is 3× faster than POJO bracket access for string key lookups.",
      'includesInCallback': "'.includes()' on an array literal inside '.{{method}}()' is O(n×m). Convert the array to a Set and use '.has()' for O(m) total — Set.has is 29× faster."
    },
    'schema': [PreferCollectionTypesOptionsEntity.Schema],
    'type': 'suggestion'
  }
};
