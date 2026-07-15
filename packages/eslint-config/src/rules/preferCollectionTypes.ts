import type { Rule, Scope } from 'eslint';

type OptionsType = {
  readonly 'checkArrayLiterals': boolean;
  readonly 'checkFromEntries': boolean;
  readonly 'checkModuleScopeArrays': boolean;
};

const DEFAULT_OPTIONS: OptionsType = {
  'checkArrayLiterals': true,
  'checkFromEntries': true,
  'checkModuleScopeArrays': true
};

type ModuleScopeArrayEntryType = {
  readonly 'name': string;
  readonly 'node': Rule.Node;
  readonly 'variable': Scope.Variable;
};

type ProgramExitNodeType = Parameters<NonNullable<Rule.RuleListener['Program:exit']>>[0];

// Skipping parent, range, loc, start, end prevents circular ref stack overflows
const AST_SKIP_KEYS: ReadonlySet<string> = new Set(['end', 'loc', 'parent', 'range', 'start']);

class AstHelpers {
  public static isJsonObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  public static getNodeType(node: unknown): string | undefined {
    if (!AstHelpers.isJsonObject(node)) { return undefined; }
    const type = node.type;
    return typeof type === 'string' ? type : undefined;
  }

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
    return AstHelpers.isJsonObject(val) ? val : undefined;
  }
}

class MembershipCallDetection {
  // Returns true if node is: SomeExpr.includes(...)
  public static isIncludesCall(node: unknown): boolean {
    if (AstHelpers.getNodeType(node) !== 'CallExpression') { return false; }
    if (!AstHelpers.isJsonObject(node)) { return false; }
    const callee = node.callee;
    if (!AstHelpers.isJsonObject(callee)) { return false; }
    if (AstHelpers.getNodeType(callee) !== 'MemberExpression') { return false; }
    if (AstHelpers.getBool(callee, 'computed') !== false) { return false; }
    const property = callee.property;
    if (!AstHelpers.isJsonObject(property)) { return false; }
    return AstHelpers.getString(property, 'name') === 'includes';
  }

  // Returns true if node is: SomeExpr.indexOf(...)
  public static isIndexOfCall(node: unknown): boolean {
    if (AstHelpers.getNodeType(node) !== 'CallExpression') { return false; }
    if (!AstHelpers.isJsonObject(node)) { return false; }
    const callee = node.callee;
    if (!AstHelpers.isJsonObject(callee)) { return false; }
    if (AstHelpers.getNodeType(callee) !== 'MemberExpression') { return false; }
    if (AstHelpers.getBool(callee, 'computed') !== false) { return false; }
    const property = callee.property;
    if (!AstHelpers.isJsonObject(property)) { return false; }
    return AstHelpers.getString(property, 'name') === 'indexOf';
  }

  // Returns true if node is a numeric literal matching `value`, handling negative
  // literals which parse as UnaryExpression{operator:'-', argument: Literal}
  public static isNumericLiteral(node: unknown, value: number): boolean {
    if (!AstHelpers.isJsonObject(node)) { return false; }
    if (value < 0) {
      if (AstHelpers.getNodeType(node) !== 'UnaryExpression') { return false; }
      if (AstHelpers.getString(node, 'operator') !== '-') { return false; }
      const argument = node.argument;
      if (!AstHelpers.isJsonObject(argument)) { return false; }
      return AstHelpers.getNodeType(argument) === 'Literal' && argument.value === Math.abs(value);
    }
    return AstHelpers.getNodeType(node) === 'Literal' && node.value === value;
  }

  // Returns true if node is: ArrayExpression.includes(...)
  public static isArrayLiteralIncludesCall(node: unknown): boolean {
    if (!MembershipCallDetection.isIncludesCall(node)) { return false; }
    if (!AstHelpers.isJsonObject(node)) { return false; }
    const callee = node.callee;
    if (!AstHelpers.isJsonObject(callee)) { return false; }
    const obj = callee.object;
    return AstHelpers.getNodeType(obj) === 'ArrayExpression';
  }

  // Returns true if node is: ArrayExpression.indexOf(...) used in a membership comparison
  // (!== -1 / > -1 / < 0)
  public static isArrayLiteralIndexOfMembershipCall(node: unknown): boolean {
    if (!MembershipCallDetection.isIndexOfCall(node)) { return false; }
    if (!AstHelpers.isJsonObject(node)) { return false; }
    const callee = node.callee;
    if (!AstHelpers.isJsonObject(callee)) { return false; }
    const obj = callee.object;
    if (AstHelpers.getNodeType(obj) !== 'ArrayExpression') { return false; }
    const parent = (node as unknown as { readonly 'parent'?: unknown }).parent;
    return MembershipIndexOfCall.get(parent) === node;
  }

  // Recursively walks callback body to find any ArrayExpression.includes(...) call.
  // Skips parent/loc/range/start/end to avoid circular reference stack overflows.
  public static callbackContainsArrayLiteralIncludes(callbackNode: unknown): boolean {
    if (!AstHelpers.isJsonObject(callbackNode)) { return false; }
    if (AstHelpers.getNodeType(callbackNode) === undefined) { return false; }

    if (
      MembershipCallDetection.isArrayLiteralIncludesCall(callbackNode)
      || MembershipCallDetection.isArrayLiteralIndexOfMembershipCall(callbackNode)
    ) { return true; }

    const keys = Object.keys(callbackNode);
    const keysLen = keys.length;
    for (let ki = 0; ki < keysLen; ki += 1) {
      const key = keys[ki];
      if (key === undefined || AST_SKIP_KEYS.has(key)) { continue; }
      const child = callbackNode[key];
      if (Array.isArray(child)) {
        const childLen = child.length;
        for (let ci = 0; ci < childLen; ci += 1) {
          if (MembershipCallDetection.callbackContainsArrayLiteralIncludes(child[ci])) { return true; }
        }
      } else if (AstHelpers.isJsonObject(child)) {
        if (MembershipCallDetection.callbackContainsArrayLiteralIncludes(child)) { return true; }
      }
    }

    return false;
  }

  // Returns { found: true, method } if this is arr.method(cb) where cb contains ArrayLiteral.includes()
  public static detectIterationWithArrayLiteralIncludes(node: Rule.Node): { readonly 'found': boolean; readonly 'method': string } {
    const raw = node as unknown as Record<string, unknown>;
    if (AstHelpers.getNodeType(raw) !== 'CallExpression') { return { 'found': false, 'method': '' }; }

    const callee = raw.callee;
    if (!AstHelpers.isJsonObject(callee)) { return { 'found': false, 'method': '' }; }
    if (AstHelpers.getNodeType(callee) !== 'MemberExpression') { return { 'found': false, 'method': '' }; }
    if (AstHelpers.getBool(callee, 'computed') !== false) { return { 'found': false, 'method': '' }; }

    const property = callee.property;
    if (!AstHelpers.isJsonObject(property)) { return { 'found': false, 'method': '' }; }
    const methodName = AstHelpers.getString(property, 'name');
    if (methodName === undefined || !ITERATION_METHODS.has(methodName)) { return { 'found': false, 'method': '' }; }

    const args = raw.arguments;
    if (!Array.isArray(args) || args.length === 0) { return { 'found': false, 'method': methodName }; }

    const argsLen = args.length;
    for (let ai = 0; ai < argsLen; ai += 1) {
      const arg: unknown = args[ai];
      const argType = AstHelpers.getNodeType(arg);
      if (argType === 'ArrowFunctionExpression' || argType === 'FunctionExpression') {
        if (!AstHelpers.isJsonObject(arg)) { continue; }
        const body = arg.body;
        if (MembershipCallDetection.callbackContainsArrayLiteralIncludes(body)) {
          return { 'found': true, 'method': methodName };
        }
      }
    }

    return { 'found': false, 'method': methodName };
  }
}

class MembershipIndexOfCall {
  // Returns the indexOf CallExpression node if `node` is a BinaryExpression testing
  // its result for membership: x.indexOf(y) !== -1 | x.indexOf(y) > -1 | x.indexOf(y) < 0
  public static get(node: unknown): unknown {
    if (AstHelpers.getNodeType(node) !== 'BinaryExpression') { return undefined; }
    if (!AstHelpers.isJsonObject(node)) { return undefined; }
    const operator = AstHelpers.getString(node, 'operator');
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

class ScopeReferenceDetection {
  // Returns true if this scope reference is: ident.includes(...) as a call callee
  public static isIncludesCalleeRef(ref: Scope.Reference): boolean {
    const id = ref.identifier;
    const parent = (id as unknown as { readonly 'parent'?: unknown }).parent;
    if (!AstHelpers.isJsonObject(parent)) { return false; }
    if (AstHelpers.getNodeType(parent) !== 'MemberExpression') { return false; }
    if (AstHelpers.getBool(parent, 'computed') !== false) { return false; }
    const prop = parent.property;
    if (!AstHelpers.isJsonObject(prop)) { return false; }
    if (AstHelpers.getString(prop, 'name') !== 'includes') { return false; }

    // Identifier must be the object (left side), not an argument
    if (parent.object !== (id as unknown)) { return false; }

    // MemberExpression must be the callee of a CallExpression
    const grandParent = (parent as unknown as { readonly 'parent'?: unknown }).parent;
    if (!AstHelpers.isJsonObject(grandParent)) { return false; }
    if (AstHelpers.getNodeType(grandParent) !== 'CallExpression') { return false; }
    if (grandParent.callee !== (parent as unknown)) { return false; }

    return true;
  }

  // Returns true if this scope reference is: ident.indexOf(...) used in a membership comparison
  public static isIndexOfCalleeMembershipRef(ref: Scope.Reference): boolean {
    const id = ref.identifier;
    const parent = (id as unknown as { readonly 'parent'?: unknown }).parent;
    if (!AstHelpers.isJsonObject(parent)) { return false; }
    if (AstHelpers.getNodeType(parent) !== 'MemberExpression') { return false; }
    if (AstHelpers.getBool(parent, 'computed') !== false) { return false; }
    const prop = parent.property;
    if (!AstHelpers.isJsonObject(prop)) { return false; }
    if (AstHelpers.getString(prop, 'name') !== 'indexOf') { return false; }

    if (parent.object !== (id as unknown)) { return false; }

    const grandParent = (parent as unknown as { readonly 'parent'?: unknown }).parent;
    if (!AstHelpers.isJsonObject(grandParent)) { return false; }
    if (AstHelpers.getNodeType(grandParent) !== 'CallExpression') { return false; }
    if (grandParent.callee !== (parent as unknown)) { return false; }

    const greatGrandParent = (grandParent as unknown as { readonly 'parent'?: unknown }).parent;
    return MembershipIndexOfCall.get(greatGrandParent) === (grandParent as unknown);
  }
}

class RuleHandlers {
  public static onCallExpression(node: Rule.Node, opts: OptionsType, context: Rule.RuleContext): void {
    // Pattern A: [a, b, c].includes(x) — inline array literal membership test
    if (
      opts.checkArrayLiterals
      && (
        MembershipCallDetection.isArrayLiteralIncludesCall(node)
        || MembershipCallDetection.isArrayLiteralIndexOfMembershipCall(node)
      )
    ) {
      context.report({ 'messageId': 'arrayLiteralIncludes', 'node': node });
      return;
    }

    // Pattern D: arr.filter/some/every/find/findIndex(x => ['a','b'].includes(x))
    if (opts.checkArrayLiterals) {
      const detection = MembershipCallDetection.detectIterationWithArrayLiteralIncludes(node);
      if (detection.found) {
        context.report({
          'data': { 'method': detection.method },
          'messageId': 'includesInCallback',
          'node': node
        });
      }
    }
  }

  public static onMemberExpression(node: Rule.Node, opts: OptionsType, context: Rule.RuleContext): void {
    // Pattern B: Object.fromEntries(...)[key] — inline computed access on fromEntries result
    if (!opts.checkFromEntries) { return; }
    const raw = node as unknown as Record<string, unknown>;
    if (AstHelpers.getBool(raw, 'computed') !== true) { return; }

    const obj = AstHelpers.getNode(raw, 'object');
    if (AstHelpers.getNodeType(obj) !== 'CallExpression' || obj === undefined) { return; }

    const callee = AstHelpers.getNode(obj, 'callee');
    if (AstHelpers.getNodeType(callee) !== 'MemberExpression' || callee === undefined) { return; }
    if (AstHelpers.getBool(callee, 'computed') !== false) { return; }

    const calleeObj = AstHelpers.getNode(callee, 'object');
    const calleeProperty = AstHelpers.getNode(callee, 'property');
    if (AstHelpers.getNodeType(calleeObj) !== 'Identifier' || calleeObj === undefined) { return; }
    if (AstHelpers.getString(calleeObj, 'name') !== 'Object') { return; }
    if (AstHelpers.getNodeType(calleeProperty) !== 'Identifier' || calleeProperty === undefined) { return; }
    if (AstHelpers.getString(calleeProperty, 'name') !== 'fromEntries') { return; }

    context.report({ 'messageId': 'fromEntriesWithBracket', 'node': node });
  }

  public static onProgramExit(
    _node: ProgramExitNodeType,
    opts: OptionsType,
    context: Rule.RuleContext,
    moduleScopeArrays: ModuleScopeArrayEntryType[]
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
    opts: OptionsType,
    context: Rule.RuleContext,
    moduleScopeArrays: ModuleScopeArrayEntryType[]
  ): void {
    // Pattern C: const VALID = ['a', 'b'] at module scope, used only for .includes()
    if (!opts.checkModuleScopeArrays) { return; }

    const parent = node.parent as unknown as Record<string, unknown>;
    if (AstHelpers.getNodeType(parent) !== 'VariableDeclaration') { return; }
    if (AstHelpers.getString(parent, 'kind') !== 'const') { return; }

    // Must be at Program (module scope) level
    const grandParent = (parent as unknown as { readonly 'parent'?: unknown }).parent;
    if (AstHelpers.getNodeType(grandParent) !== 'Program') { return; }

    // Init must be an array literal
    const declaratorRaw = node as unknown as Record<string, unknown>;
    if (AstHelpers.getNodeType(declaratorRaw.init) !== 'ArrayExpression') { return; }

    // Binding must be a simple identifier
    const id = declaratorRaw.id;
    if (AstHelpers.getNodeType(id) !== 'Identifier') { return; }
    const name = AstHelpers.getString(id as Record<string, unknown>, 'name');
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
  static build(rawOptions: Partial<OptionsType> | undefined): OptionsType {
    return {
      'checkArrayLiterals': rawOptions?.checkArrayLiterals ?? DEFAULT_OPTIONS.checkArrayLiterals,
      'checkFromEntries': rawOptions?.checkFromEntries ?? DEFAULT_OPTIONS.checkFromEntries,
      'checkModuleScopeArrays': rawOptions?.checkModuleScopeArrays ?? DEFAULT_OPTIONS.checkModuleScopeArrays
    };
  }
}

export const preferCollectionTypes: Rule.RuleModule = {
  'create': (context) => {
    const [firstOption] = (context.options as readonly unknown[]);
    const rawOptions = firstOption as Partial<OptionsType> | undefined;
    const opts = Options.build(rawOptions);

    const moduleScopeArrays: ModuleScopeArrayEntryType[] = [];

    const callExpressionHandler = (node: Rule.Node): void => { RuleHandlers.onCallExpression(node, opts, context); };
    const memberExpressionHandler = (node: Rule.Node): void => { RuleHandlers.onMemberExpression(node, opts, context); };
    const programExitHandler = (node: ProgramExitNodeType): void => { RuleHandlers.onProgramExit(node, opts, context, moduleScopeArrays); };
    const variableDeclaratorHandler = (node: Rule.Node): void => { RuleHandlers.onVariableDeclarator(node, opts, context, moduleScopeArrays); };

    return {
      'CallExpression': callExpressionHandler,
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
    'schema': [
      {
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
      }
    ],
    'type': 'suggestion'
  }
};
