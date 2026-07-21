import type { Rule, Scope } from 'eslint';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

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

const DEFAULT_OPTIONS: Required<PreferCollectionTypesOptionsEntity.Type> = {
  'checkArrayLiterals': true,
  'checkFromEntries': true,
  'checkModuleScopeArrays': true
};

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
  readonly 'pendingArgs': Set<unknown>;
  'reported': PreferCollectionTypesInternalEntity.Type['reported'];
}

class NodePropertyAccess {
  public static getString(obj: Record<string, unknown>, key: string): string | undefined {
    const val = obj[key];
    return typeof val === 'string' ? val : undefined;
  }

  public static getBool(obj: Record<string, unknown>, key: string): boolean | undefined {
    const val = obj[key];
    return typeof val === 'boolean' ? val : undefined;
  }

  public static getNode(obj: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
    const val = obj[key];
    return ObjectGuard.isObject(val) ? val : undefined;
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
    return NodePropertyAccess.getString(property, 'name') === 'includes';
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
    return NodePropertyAccess.getString(property, 'name') === 'indexOf';
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
      return AstHelpers.getNodeType(argument) === 'Literal' && argument.value === Math.abs(value);
    }
    return AstHelpers.getNodeType(node) === 'Literal' && node.value === value;
  }

  // Returns true if node is: ArrayExpression.includes(...)
  public static isArrayLiteralIncludesCall(node: unknown): boolean {
    if (!MembershipCallDetection.isIncludesCall(node)) { return false; }
    if (!ObjectGuard.isObject(node)) { return false; }
    const callee = node.callee;
    if (!ObjectGuard.isObject(callee)) { return false; }
    const obj = callee.object;
    return AstHelpers.getNodeType(obj) === 'ArrayExpression';
  }

  // Returns true if node is: ArrayExpression.indexOf(...) used in a membership comparison
  // (!== -1 / > -1 / < 0)
  public static isArrayLiteralIndexOfMembershipCall(node: unknown): boolean {
    if (!MembershipCallDetection.isIndexOfCall(node)) { return false; }
    if (!ObjectGuard.isObject(node)) { return false; }
    const callee = node.callee;
    if (!ObjectGuard.isObject(callee)) { return false; }
    const obj = callee.object;
    if (AstHelpers.getNodeType(obj) !== 'ArrayExpression') { return false; }
    const parent = (node as unknown as { readonly 'parent'?: unknown }).parent;
    return MembershipIndexOfCall.get(parent) === node;
  }

}

class MembershipIndexOfCall {
  // Returns the indexOf CallExpression node if `node` is a BinaryExpression testing
  // its result for membership: x.indexOf(y) !== -1 | x.indexOf(y) > -1 | x.indexOf(y) < 0
  public static get(node: unknown): unknown {
    if (AstHelpers.getNodeType(node) !== 'BinaryExpression') { return undefined; }
    if (!ObjectGuard.isObject(node)) { return undefined; }
    const operator = NodePropertyAccess.getString(node, 'operator');
    const left = node.left;
    const right = node.right;
    if (
      (operator === '!==' || operator === '>')
      && MembershipCallDetection.isIndexOfCall(left)
      && MembershipCallDetection.isNumericLiteral(right, -1)
    ) { return left; }
    if (
      operator === '<'
      && MembershipCallDetection.isIndexOfCall(left)
      && MembershipCallDetection.isNumericLiteral(right, 0)
    ) { return left; }
    return undefined;
  }
}

const ITERATION_METHODS: ReadonlySet<string> = new Set(['every', 'filter', 'find', 'findIndex', 'some']);

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

    const args = raw.arguments;
    if (!Array.isArray(args) || args.length === 0) { return; }

    const pendingArgs = new Set<unknown>();
    const argsLen = args.length;
    for (let ai = 0; ai < argsLen; ai += 1) {
      const arg: unknown = args[ai];
      const argType = AstHelpers.getNodeType(arg);
      if (argType === 'ArrowFunctionExpression' || argType === 'FunctionExpression') {
        pendingArgs.add(arg);
      }
    }

    if (pendingArgs.size === 0) { return; }

    stack.push({ 'found': false, 'method': methodName, 'outerNode': node, 'pendingArgs': pendingArgs, 'reported': false });
  }

  // Marks every currently-active outer call as containing a match — mirrors the old
  // manual walk's behavior of finding matches at any depth beneath the callback body,
  // including inside further-nested qualifying calls.
  public static markActiveFound(stack: IterationStackEntryInterface[]): void {
    const stackLen = stack.length;
    for (let si = 0; si < stackLen; si += 1) {
      const entry = stack[si];
      if (entry !== undefined) { entry.found = true; }
    }
  }

  // Called from the function argument's `:exit` listener. Pops the entry once all of
  // its function-typed arguments have finished traversal, reporting once if a match
  // was found anywhere beneath it.
  public static onFunctionArgumentExit(node: unknown, stack: IterationStackEntryInterface[], context: Rule.RuleContext): void {
    const top = stack.at(-1);
    if (top === undefined) { return; }
    if (!top.pendingArgs.has(node)) { return; }

    top.pendingArgs.delete(node);
    if (top.pendingArgs.size > 0) { return; }

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
  public static isIncludesCalleeRef(ref: Scope.Reference): boolean {
    const id = ref.identifier;
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
  public static isIndexOfCalleeMembershipRef(ref: Scope.Reference): boolean {
    const id = ref.identifier;
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
    return MembershipIndexOfCall.get(greatGrandParent) === (grandParent as unknown);
  }
}

class RuleHandlers {
  public static onCallExpression(
    node: Rule.Node,
    opts: Required<PreferCollectionTypesOptionsEntity.Type>,
    context: Rule.RuleContext,
    iterationStack: IterationStackEntryInterface[]
  ): void {
    if (!opts.checkArrayLiterals) { return; }

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

  public static onMemberExpression(node: Rule.Node, opts: Required<PreferCollectionTypesOptionsEntity.Type>, context: Rule.RuleContext): void {
    // Pattern B: Object.fromEntries(...)[key] — inline computed access on fromEntries result
    if (!opts.checkFromEntries) { return; }
    const raw = node as unknown as Record<string, unknown>;
    if (NodePropertyAccess.getBool(raw, 'computed') !== true) { return; }

    const obj = NodePropertyAccess.getNode(raw, 'object');
    if (AstHelpers.getNodeType(obj) !== 'CallExpression' || obj === undefined) { return; }

    const callee = NodePropertyAccess.getNode(obj, 'callee');
    if (AstHelpers.getNodeType(callee) !== 'MemberExpression' || callee === undefined) { return; }
    if (NodePropertyAccess.getBool(callee, 'computed') !== false) { return; }

    const calleeObj = NodePropertyAccess.getNode(callee, 'object');
    const calleeProperty = NodePropertyAccess.getNode(callee, 'property');
    if (AstHelpers.getNodeType(calleeObj) !== 'Identifier' || calleeObj === undefined) { return; }
    if (NodePropertyAccess.getString(calleeObj, 'name') !== 'Object') { return; }
    if (AstHelpers.getNodeType(calleeProperty) !== 'Identifier' || calleeProperty === undefined) { return; }
    if (NodePropertyAccess.getString(calleeProperty, 'name') !== 'fromEntries') { return; }

    context.report({ 'messageId': 'fromEntriesWithBracket', 'node': node });
  }

  public static onProgramExit(
    _node: Parameters<NonNullable<Rule.RuleListener['Program:exit']>>[0],
    opts: Required<PreferCollectionTypesOptionsEntity.Type>,
    context: Rule.RuleContext,
    moduleScopeArrays: ModuleScopeArrayEntryInterface[]
  ): void {
    if (!opts.checkModuleScopeArrays || moduleScopeArrays.length === 0) { return; }

    const entriesLen = moduleScopeArrays.length;
    for (let ei = 0; ei < entriesLen; ei += 1) {
      const entry = moduleScopeArrays[ei]; if (entry === undefined) { continue; }
      // references is fully populated at Program:exit
      const readRefs = entry.variable.references.filter((ref: Scope.Reference) => { return !ref.isWrite(); });

      if (readRefs.length === 0) {
        // No reads — unused; skip (other rules handle unused vars)
        continue;
      }

      const allRefsAreIncludes = readRefs.every((ref: Scope.Reference) => {
        return ScopeReferenceDetection.isIncludesCalleeRef(ref) || ScopeReferenceDetection.isIndexOfCalleeMembershipRef(ref);
      });

      if (allRefsAreIncludes) {
        context.report({
          'data': { 'name': entry.name },
          'messageId': 'constantArrayForMembership',
          'node': entry.node
        });
      }
    }
  }

  public static onVariableDeclarator(
    node: Rule.Node,
    opts: Required<PreferCollectionTypesOptionsEntity.Type>,
    context: Rule.RuleContext,
    moduleScopeArrays: ModuleScopeArrayEntryInterface[]
  ): void {
    // Pattern C: const VALID = ['a', 'b'] at module scope, used only for .includes()
    if (!opts.checkModuleScopeArrays) { return; }

    const parent = node.parent as unknown as Record<string, unknown>;
    if (AstHelpers.getNodeType(parent) !== 'VariableDeclaration') { return; }
    if (NodePropertyAccess.getString(parent, 'kind') !== 'const') { return; }

    // Must be at Program (module scope) level
    const grandParent = (parent as unknown as { readonly 'parent'?: unknown }).parent;
    if (AstHelpers.getNodeType(grandParent) !== 'Program') { return; }

    // Init must be an array literal
    const declaratorRaw = node as unknown as Record<string, unknown>;
    if (AstHelpers.getNodeType(declaratorRaw.init) !== 'ArrayExpression') { return; }

    // Binding must be a simple identifier
    const id = declaratorRaw.id;
    if (AstHelpers.getNodeType(id) !== 'Identifier') { return; }
    const name = NodePropertyAccess.getString(id as Record<string, unknown>, 'name');
    if (name === undefined) { return; }

    // getDeclaredVariables on the VariableDeclaration gives us the scope variable
    // with full reference tracking populated by the end of the AST pass
    const parentNode = node.parent;
    if (parentNode === null) { return; }
    const declared = context.sourceCode.getDeclaredVariables(parentNode);
    const variable = declared.find((v: Scope.Variable) => { return v.name === name; });
    if (variable === undefined) { return; }

    moduleScopeArrays.push({ 'name': name, 'node': node, 'variable': variable });
  }
}

class Options {
  static build(rawOptions: unknown): Required<PreferCollectionTypesOptionsEntity.Type> {
    return {
      'checkArrayLiterals': ObjectGuard.isObject(rawOptions) && typeof rawOptions.checkArrayLiterals === 'boolean'
        ? rawOptions.checkArrayLiterals
        : DEFAULT_OPTIONS.checkArrayLiterals,
      'checkFromEntries': ObjectGuard.isObject(rawOptions) && typeof rawOptions.checkFromEntries === 'boolean'
        ? rawOptions.checkFromEntries
        : DEFAULT_OPTIONS.checkFromEntries,
      'checkModuleScopeArrays': ObjectGuard.isObject(rawOptions) && typeof rawOptions.checkModuleScopeArrays === 'boolean'
        ? rawOptions.checkModuleScopeArrays
        : DEFAULT_OPTIONS.checkModuleScopeArrays
    };
  }
}

export const preferCollectionTypes: Rule.RuleModule = {
  'create': (context) => {
    const opts = Options.build(context.options.at(0));

    const moduleScopeArrays: ModuleScopeArrayEntryInterface[] = [];
    const iterationStack: IterationStackEntryInterface[] = [];

    const callExpressionHandler = (node: Rule.Node): void => { RuleHandlers.onCallExpression(node, opts, context, iterationStack); };
    const memberExpressionHandler = (node: Rule.Node): void => { RuleHandlers.onMemberExpression(node, opts, context); };
    const programExitHandler: NonNullable<Rule.RuleListener['Program:exit']> = (node): void => { RuleHandlers.onProgramExit(node, opts, context, moduleScopeArrays); };
    const variableDeclaratorHandler = (node: Rule.Node): void => { RuleHandlers.onVariableDeclarator(node, opts, context, moduleScopeArrays); };
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
