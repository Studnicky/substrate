import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { Rule, Scope } from 'eslint';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { ITERATION_METHODS } from './constants/PreferCollectionTypesConstants.js';
import { AstHelpers } from './shared/astHelpers.js';
import { ObjectGuard } from './shared/ObjectGuard.js';

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
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
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
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}

interface ModuleScopeArrayEntryInterface {
  readonly 'name': PreferCollectionTypesInternalEntity.Type['name'];
  readonly 'node': Rule.Node;
  readonly 'variable': Scope.Variable;
}

// Tracks a `.filter/.some/.every/.find/.findIndex(fn)` call whose function-argument
// subtree is currently being traversed by ESLint's own visitor, so that a nested
// ArrayLiteral.includes()/indexOf() match encountered by the ordinary CallExpression
// listener can be attributed back to this outer call without a second manual walk.
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
    const result = ObjectGuard.isObject(value) ? value : undefined;
    return result;
  }
}

class MembershipCallDetection {
  // Returns true if node is: SomeExpr.includes(...)
  public static isIncludesCall(node: unknown): boolean {
    if (AstHelpers.getNodeType(node) !== 'CallExpression') { return false; }
    if (!ObjectGuard.isObject(node)) { return false; }
    const callee = node.callee;
    if (!ObjectGuard.isObject(callee)) { return false; }
    if (AstHelpers.getNodeType(callee) !== 'MemberExpression') { return false; }
    if (NodePropertyAccess.getBool(callee, 'computed') !== false) { return false; }
    const property = callee.property;
    if (!ObjectGuard.isObject(property)) { return false; }
    const result = NodePropertyAccess.getString(property, 'name') === 'includes';
    return result;
  }

  // Returns true if node is: SomeExpr.indexOf(...)
  public static isIndexOfCall(node: unknown): boolean {
    if (AstHelpers.getNodeType(node) !== 'CallExpression') { return false; }
    if (!ObjectGuard.isObject(node)) { return false; }
    const callee = node.callee;
    if (!ObjectGuard.isObject(callee)) { return false; }
    if (AstHelpers.getNodeType(callee) !== 'MemberExpression') { return false; }
    if (NodePropertyAccess.getBool(callee, 'computed') !== false) { return false; }
    const property = callee.property;
    if (!ObjectGuard.isObject(property)) { return false; }
    const result = NodePropertyAccess.getString(property, 'name') === 'indexOf';
    return result;
  }

  // Returns true if node is a numeric literal matching `value`, handling negative
  // literals which parse as UnaryExpression{operator:'-', argument: Literal}
  public static isNumericLiteral(node: unknown, value: number): boolean {
    if (!ObjectGuard.isObject(node)) { return false; }
    if (value < 0) {
      if (AstHelpers.getNodeType(node) !== 'UnaryExpression') { return false; }
      if (NodePropertyAccess.getString(node, 'operator') !== '-') { return false; }
      const argument = node.argument;
      if (!ObjectGuard.isObject(argument)) { return false; }
      const result = AstHelpers.getNodeType(argument) === 'Literal' && argument.value === Math.abs(value);
      return result;
    }
    const result = AstHelpers.getNodeType(node) === 'Literal' && node.value === value;
    return result;
  }

  // Returns true if node is: ArrayExpression.includes(...)
  public static isArrayLiteralIncludesCall(node: unknown): boolean {
    if (!MembershipCallDetection.isIncludesCall(node)) { return false; }
    if (!ObjectGuard.isObject(node)) { return false; }
    const callee = node.callee;
    if (!ObjectGuard.isObject(callee)) { return false; }
    const object = callee.object;
    const result = AstHelpers.getNodeType(object) === 'ArrayExpression';
    return result;
  }

  // Returns true if node is: ArrayExpression.indexOf(...) used in a membership comparison
  // (!== -1 / > -1 / < 0)
  public static isArrayLiteralIndexOfMembershipCall(node: unknown): boolean {
    if (!MembershipCallDetection.isIndexOfCall(node)) { return false; }
    if (!ObjectGuard.isObject(node)) { return false; }
    const callee = node.callee;
    if (!ObjectGuard.isObject(callee)) { return false; }
    const object = callee.object;
    if (AstHelpers.getNodeType(object) !== 'ArrayExpression') { return false; }
    const parent = (node as unknown as { readonly 'parent'?: unknown }).parent;
    const result = MembershipIndexOfCall.get(parent) === node;
    return result;
  }

  // Returns true if node is: Object.fromEntries(...)
  public static isObjectFromEntriesCall(node: unknown): boolean {
    if (AstHelpers.getNodeType(node) !== 'CallExpression') { return false; }
    if (!ObjectGuard.isObject(node)) { return false; }
    const callee = node.callee;
    if (!ObjectGuard.isObject(callee)) { return false; }
    if (AstHelpers.getNodeType(callee) !== 'MemberExpression') { return false; }
    if (NodePropertyAccess.getBool(callee, 'computed') !== false) { return false; }

    const object = callee.object;
    if (!ObjectGuard.isObject(object) || AstHelpers.getNodeType(object) !== 'Identifier') { return false; }
    if (NodePropertyAccess.getString(object, 'name') !== 'Object') { return false; }

    const property = callee.property;
    if (!ObjectGuard.isObject(property)) { return false; }
    const result = NodePropertyAccess.getString(property, 'name') === 'fromEntries';
    return result;
  }

}

class MembershipIndexOfCall {
  // Returns the indexOf CallExpression node if `node` is a BinaryExpression testing
  // its result for membership, in any of its equivalent forms:
  // x.indexOf(y) !== -1 | x.indexOf(y) === -1 (negated) | x.indexOf(y) > -1
  // x.indexOf(y) < 0 | x.indexOf(y) >= 0 (negated)
  public static get(node: unknown): unknown {
    if (AstHelpers.getNodeType(node) !== 'BinaryExpression') { return undefined; }
    if (!ObjectGuard.isObject(node)) { return undefined; }
    const operator = NodePropertyAccess.getString(node, 'operator');
    const left = node.left;
    const right = node.right;
    if (
      (operator === '!==' || operator === '===' || operator === '>')
      && MembershipCallDetection.isIndexOfCall(left)
      && MembershipCallDetection.isNumericLiteral(right, -1)
    ) { return left; }
    if (
      (operator === '<' || operator === '>=')
      && MembershipCallDetection.isIndexOfCall(left)
      && MembershipCallDetection.isNumericLiteral(right, 0)
    ) { return left; }
    return undefined;
  }
}

// Rides ESLint's own single AST traversal instead of running a second manual walk:
// pushes a marker when an outer `.filter/.some/.every/.find/.findIndex(fn)` call is
// entered, and pops it (reporting once, on the outer node) when the function
// argument's own subtree has been fully visited via its `:exit` listener. Nested
// qualifying calls stay correctly attributed because ESLint's traversal is a proper
// DFS: an inner call's stack entry is always pushed after, and popped before, its
// enclosing call's entry — giving genuine LIFO ordering with no extra subtree scans.
class IterationCallbackTracker {
  // If `node` is arr.method(fn) for a tracked iteration method with at least one
  // function-typed argument, pushes a stack entry so nested matches (found via the
  // rule's ordinary CallExpression listener) can be attributed back to this call.
  public static pushIfQualifying(node: Rule.Node, stack: IterationStackEntryInterface[]): void {
    const raw = node as unknown as Record<string, unknown>;
    if (AstHelpers.getNodeType(raw) !== 'CallExpression') { return; }

    const callee = raw.callee;
    if (!ObjectGuard.isObject(callee)) { return; }
    if (AstHelpers.getNodeType(callee) !== 'MemberExpression') { return; }
    if (NodePropertyAccess.getBool(callee, 'computed') !== false) { return; }

    const property = callee.property;
    if (!ObjectGuard.isObject(property)) { return; }
    const methodName = NodePropertyAccess.getString(property, 'name');
    if (methodName === undefined || !ITERATION_METHODS.has(methodName)) { return; }

    const argumentList = raw.arguments;
    if (!Array.isArray(argumentList) || argumentList.length === 0) { return; }

    const pendingArguments = new Set<unknown>();
    const argumentListLength = argumentList.length;
    for (let argumentIndex = 0; argumentIndex < argumentListLength; argumentIndex += 1) {
      const argument: unknown = argumentList.at(argumentIndex);
      const argumentType = AstHelpers.getNodeType(argument);
      if (argumentType === 'ArrowFunctionExpression' || argumentType === 'FunctionExpression') {
        pendingArguments.add(argument);
      }
    }

    if (pendingArguments.size === 0) { return; }

    stack.push({ 'found': false, 'method': methodName, 'outerNode': node, 'pendingArguments': pendingArguments, 'reported': false });
  }

  // Marks every currently-active outer call as containing a match — mirrors the old
  // manual walk's behavior of finding matches at any depth beneath the callback body,
  // including inside further-nested qualifying calls.
  public static markActiveFound(stack: IterationStackEntryInterface[]): void {
    const stackLength = stack.length;
    for (let stackIndex = 0; stackIndex < stackLength; stackIndex += 1) {
      const entry = stack.at(stackIndex);
      if (entry !== undefined) { entry.found = true; }
    }
  }

  // Called from the function argument's `:exit` listener. Pops the entry once all of
  // its function-typed arguments have finished traversal, reporting once if a match
  // was found anywhere beneath it.
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
    const parent = (id as unknown as { readonly 'parent'?: unknown }).parent;
    if (!ObjectGuard.isObject(parent)) { return false; }
    if (AstHelpers.getNodeType(parent) !== 'MemberExpression') { return false; }
    if (NodePropertyAccess.getBool(parent, 'computed') !== false) { return false; }
    const prop = parent.property;
    if (!ObjectGuard.isObject(prop)) { return false; }
    if (NodePropertyAccess.getString(prop, 'name') !== 'includes') { return false; }

    // Identifier must be the object (left side), not an argument
    if (parent.object !== (id as unknown)) { return false; }

    // MemberExpression must be the callee of a CallExpression
    const grandParent = (parent as unknown as { readonly 'parent'?: unknown }).parent;
    if (!ObjectGuard.isObject(grandParent)) { return false; }
    if (AstHelpers.getNodeType(grandParent) !== 'CallExpression') { return false; }
    if (grandParent.callee !== (parent as unknown)) { return false; }

    return true;
  }

  // Returns true if this scope reference is: ident.indexOf(...) used in a membership comparison
  public static isIndexOfCalleeMembershipReference(reference: Scope.Reference): boolean {
    const id = reference.identifier;
    const parent = (id as unknown as { readonly 'parent'?: unknown }).parent;
    if (!ObjectGuard.isObject(parent)) { return false; }
    if (AstHelpers.getNodeType(parent) !== 'MemberExpression') { return false; }
    if (NodePropertyAccess.getBool(parent, 'computed') !== false) { return false; }
    const prop = parent.property;
    if (!ObjectGuard.isObject(prop)) { return false; }
    if (NodePropertyAccess.getString(prop, 'name') !== 'indexOf') { return false; }

    if (parent.object !== (id as unknown)) { return false; }

    const grandParent = (parent as unknown as { readonly 'parent'?: unknown }).parent;
    if (!ObjectGuard.isObject(grandParent)) { return false; }
    if (AstHelpers.getNodeType(grandParent) !== 'CallExpression') { return false; }
    if (grandParent.callee !== (parent as unknown)) { return false; }

    const greatGrandParent = (grandParent as unknown as { readonly 'parent'?: unknown }).parent;
    const result = MembershipIndexOfCall.get(greatGrandParent) === (grandParent as unknown);
    return result;
  }

  // Returns true if this scope reference is: ident[key] — a computed member lookup with
  // the identifier as the object, e.g. a variable bound to Object.fromEntries(...) read via
  // bracket notation.
  public static isComputedMemberObjectReference(reference: Scope.Reference): boolean {
    const id = reference.identifier;
    const parent = (id as unknown as { readonly 'parent'?: unknown }).parent;
    if (!ObjectGuard.isObject(parent)) { return false; }
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

    // Pattern D: arr.filter/some/every/find/findIndex(x => ['a','b'].includes(x))
    // Marks the call as a candidate; the actual match is discovered by this same
    // listener firing again (via ESLint's normal traversal) on the nested
    // ArrayLiteral.includes()/indexOf() call above, then reported at :exit.
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

    const callee = NodePropertyAccess.getNode(object, 'callee');
    if (AstHelpers.getNodeType(callee) !== 'MemberExpression' || callee === undefined) { return; }
    if (NodePropertyAccess.getBool(callee, 'computed') !== false) { return; }

    const calleeObject = NodePropertyAccess.getNode(callee, 'object');
    const calleeProperty = NodePropertyAccess.getNode(callee, 'property');
    if (AstHelpers.getNodeType(calleeObject) !== 'Identifier' || calleeObject === undefined) { return; }
    if (NodePropertyAccess.getString(calleeObject, 'name') !== 'Object') { return; }
    if (AstHelpers.getNodeType(calleeProperty) !== 'Identifier' || calleeProperty === undefined) { return; }
    if (NodePropertyAccess.getString(calleeProperty, 'name') !== 'fromEntries') { return; }

    context.report({ 'messageId': 'fromEntriesWithBracket', 'node': node });
  }

  public static onProgramExit(
    _node: Parameters<NonNullable<Rule.RuleListener['Program:exit']>>[0],
    options: Required<PreferCollectionTypesOptionsEntity.Type>,
    context: Rule.RuleContext,
    moduleScopeArrays: ModuleScopeArrayEntryInterface[],
    fromEntriesBindings: ModuleScopeArrayEntryInterface[]
  ): void {
    if (options.checkModuleScopeArrays) {
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

    if (options.checkFromEntries) {
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
    const declaratorRaw = node as unknown as Record<string, unknown>;
    const id = declaratorRaw.id;
    if (AstHelpers.getNodeType(id) !== 'Identifier') { return; }
    const name = NodePropertyAccess.getString(id as Record<string, unknown>, 'name');
    if (name === undefined) { return; }

    const isArrayLiteralInit = AstHelpers.getNodeType(declaratorRaw.init) === 'ArrayExpression';
    const isFromEntriesInit = MembershipCallDetection.isObjectFromEntriesCall(declaratorRaw.init);
    if (!isArrayLiteralInit && !isFromEntriesInit) { return; }

    // getDeclaredVariables on the VariableDeclaration gives us the scope variable — from
    // whichever scope (module, function, or class-method body) it was declared in — with full
    // reference tracking populated by the end of the AST pass. Tracking is no longer limited to
    // Program (module) scope: a const array/fromEntries binding used exclusively for membership
    // or lookup is just as much a collection-type candidate inside a function body.
    const parentNode = node.parent;
    if (parentNode === null) { return; }
    const declared = context.sourceCode.getDeclaredVariables(parentNode);
    const variable = declared.find((v: Scope.Variable) => { const result = v.name === name;
      return result; });
    if (variable === undefined) { return; }

    // Pattern C: const VALID = ['a', 'b'], used only for .includes()/.indexOf() membership
    if (isArrayLiteralInit && options.checkModuleScopeArrays) {
      moduleScopeArrays.push({ 'name': name, 'node': node, 'variable': variable });
      return;
    }

    // Pattern B (indirect): const lookup = Object.fromEntries(...), used only via lookup[key]
    if (isFromEntriesInit && options.checkFromEntries) {
      fromEntriesBindings.push({ 'name': name, 'node': node, 'variable': variable });
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
