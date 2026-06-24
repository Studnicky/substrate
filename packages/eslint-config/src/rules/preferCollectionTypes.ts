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

const isJsonObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

// Skipping parent, range, loc, start, end prevents circular ref stack overflows
const AST_SKIP_KEYS: ReadonlySet<string> = new Set(['end', 'loc', 'parent', 'range', 'start']);

class AstHelpers {
  public static getNodeType(node: unknown): string | undefined {
    if (!isJsonObject(node)) { return undefined; }
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
}

// Returns true if node is: SomeExpr.includes(...)
const isIncludesCall = (node: unknown): boolean => {
  if (AstHelpers.getNodeType(node) !== 'CallExpression') { return false; }
  if (!isJsonObject(node)) { return false; }
  const callee = node.callee;
  if (!isJsonObject(callee)) { return false; }
  if (AstHelpers.getNodeType(callee) !== 'MemberExpression') { return false; }
  if (AstHelpers.getBool(callee, 'computed') !== false) { return false; }
  const property = callee.property;
  if (!isJsonObject(property)) { return false; }
  return AstHelpers.getString(property, 'name') === 'includes';
};

// Returns true if node is: ArrayExpression.includes(...)
const isArrayLiteralIncludesCall = (node: unknown): boolean => {
  if (!isIncludesCall(node)) { return false; }
  if (!isJsonObject(node)) { return false; }
  const callee = node.callee;
  if (!isJsonObject(callee)) { return false; }
  const obj = callee.object;
  return AstHelpers.getNodeType(obj) === 'ArrayExpression';
};

// Recursively walks callback body to find any ArrayExpression.includes(...) call.
// Skips parent/loc/range/start/end to avoid circular reference stack overflows.
const callbackContainsArrayLiteralIncludes = (callbackNode: unknown): boolean => {
  if (!isJsonObject(callbackNode)) { return false; }
  if (AstHelpers.getNodeType(callbackNode) === undefined) { return false; }

  if (isArrayLiteralIncludesCall(callbackNode)) { return true; }

  const keys = Object.keys(callbackNode);
  const keysLen = keys.length;
  for (let ki = 0; ki < keysLen; ki += 1) {
    const key = keys[ki];
    if (key === undefined || AST_SKIP_KEYS.has(key)) { continue; }
    const child = callbackNode[key];
    if (Array.isArray(child)) {
      const childLen = child.length;
      for (let ci = 0; ci < childLen; ci += 1) {
        if (callbackContainsArrayLiteralIncludes(child[ci])) { return true; }
      }
    } else if (isJsonObject(child)) {
      if (callbackContainsArrayLiteralIncludes(child)) { return true; }
    }
  }

  return false;
};

const ITERATION_METHODS: ReadonlySet<string> = new Set(['every', 'filter', 'find', 'findIndex', 'some']);

// Returns { found: true, method } if this is arr.method(cb) where cb contains ArrayLiteral.includes()
const detectIterationWithArrayLiteralIncludes = (node: Rule.Node): { readonly 'found': boolean; readonly 'method': string } => {
  const raw = node as unknown as Record<string, unknown>;
  if (AstHelpers.getNodeType(raw) !== 'CallExpression') { return { 'found': false, 'method': '' }; }

  const callee = raw.callee;
  if (!isJsonObject(callee)) { return { 'found': false, 'method': '' }; }
  if (AstHelpers.getNodeType(callee) !== 'MemberExpression') { return { 'found': false, 'method': '' }; }
  if (AstHelpers.getBool(callee, 'computed') !== false) { return { 'found': false, 'method': '' }; }

  const property = callee.property;
  if (!isJsonObject(property)) { return { 'found': false, 'method': '' }; }
  const methodName = AstHelpers.getString(property, 'name');
  if (methodName === undefined || !ITERATION_METHODS.has(methodName)) { return { 'found': false, 'method': '' }; }

  const args = raw.arguments;
  if (!Array.isArray(args) || args.length === 0) { return { 'found': false, 'method': methodName }; }

  const argsLen = args.length;
  for (let ai = 0; ai < argsLen; ai += 1) {
    const arg: unknown = args[ai];
    const argType = AstHelpers.getNodeType(arg);
    if (argType === 'ArrowFunctionExpression' || argType === 'FunctionExpression') {
      if (!isJsonObject(arg)) { continue; }
      const body = arg.body;
      if (callbackContainsArrayLiteralIncludes(body)) {
        return { 'found': true, 'method': methodName };
      }
    }
  }

  return { 'found': false, 'method': methodName };
};

// Returns true if this scope reference is: ident.includes(...) as a call callee
const isIncludesCalleeRef = (ref: Scope.Reference): boolean => {
  const id = ref.identifier;
  const parent = (id as unknown as { readonly 'parent'?: unknown }).parent;
  if (!isJsonObject(parent)) { return false; }
  if (AstHelpers.getNodeType(parent) !== 'MemberExpression') { return false; }
  if (AstHelpers.getBool(parent, 'computed') !== false) { return false; }
  const prop = parent.property;
  if (!isJsonObject(prop)) { return false; }
  if (AstHelpers.getString(prop, 'name') !== 'includes') { return false; }

  // Identifier must be the object (left side), not an argument
  if (parent.object !== (id as unknown)) { return false; }

  // MemberExpression must be the callee of a CallExpression
  const grandParent = (parent as unknown as { readonly 'parent'?: unknown }).parent;
  if (!isJsonObject(grandParent)) { return false; }
  if (AstHelpers.getNodeType(grandParent) !== 'CallExpression') { return false; }
  if (grandParent.callee !== (parent as unknown)) { return false; }

  return true;
};

export const preferCollectionTypes: Rule.RuleModule = {
  'create': (context) => {
    const rawOptions = context.options[0] as Partial<OptionsType> | undefined;
    const opts: OptionsType = {
      'checkArrayLiterals': rawOptions?.checkArrayLiterals ?? DEFAULT_OPTIONS.checkArrayLiterals,
      'checkFromEntries': rawOptions?.checkFromEntries ?? DEFAULT_OPTIONS.checkFromEntries,
      'checkModuleScopeArrays': rawOptions?.checkModuleScopeArrays ?? DEFAULT_OPTIONS.checkModuleScopeArrays
    };

    const moduleScopeArrays: ModuleScopeArrayEntryType[] = [];

    return {
      'CallExpression': (node) => {
        // Pattern A: [a, b, c].includes(x) — inline array literal membership test
        if (opts.checkArrayLiterals && isArrayLiteralIncludesCall(node)) {
          context.report({ 'messageId': 'arrayLiteralIncludes', 'node': node });
          return;
        }

        // Pattern D: arr.filter/some/every/find/findIndex(x => ['a','b'].includes(x))
        if (opts.checkArrayLiterals) {
          const detection = detectIterationWithArrayLiteralIncludes(node);
          if (detection.found) {
            context.report({
              'data': { 'method': detection.method },
              'messageId': 'includesInCallback',
              'node': node
            });
          }
        }
      },

      'MemberExpression': (node) => {
        // Pattern B: Object.fromEntries(...)[key] — inline computed access on fromEntries result
        if (!opts.checkFromEntries) { return; }
        if (!node.computed) { return; }
        const obj = node.object;
        if (obj.type !== 'CallExpression') { return; }
        const callee = obj.callee;
        if (callee.type !== 'MemberExpression') { return; }
        if (callee.computed) { return; }
        const calleeObj = callee.object;
        const calleeProperty = callee.property;
        if (calleeObj.type !== 'Identifier') { return; }
        if ((calleeObj as unknown as { readonly 'name': string }).name !== 'Object') { return; }
        if (calleeProperty.type !== 'Identifier') { return; }
        if ((calleeProperty as unknown as { readonly 'name': string }).name !== 'fromEntries') { return; }
        context.report({ 'messageId': 'fromEntriesWithBracket', 'node': node });
      },

      'Program:exit': () => {
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

          const allRefsAreIncludes = readRefs.every((ref: Scope.Reference) => { const result = isIncludesCalleeRef(ref);
            return result; });

          if (allRefsAreIncludes) {
            context.report({
              'data': { 'name': entry.name },
              'messageId': 'constantArrayForMembership',
              'node': entry.node
            });
          }
        }
      },

      'VariableDeclarator': (node) => {
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
        const declared = context.sourceCode.getDeclaredVariables(parentNode);
        const variable = declared.find((v: Scope.Variable) => { return v.name === name; });
        if (variable === undefined) { return; }

        moduleScopeArrays.push({ 'name': name, 'node': node, 'variable': variable });
      }
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
