import type { Rule } from 'eslint';

import path from 'node:path';

import { AstHelpers } from './shared/astHelpers.js';
import { ObjectGuard } from './shared/ObjectGuard.js';

/**
 * folder-content-shape — folder location signals what a file's top-level
 * declarations must look like.
 *
 * Three mutually-exclusive checks, dispatched per-file:
 *
 *  1. Entity files (`entities/` folder, or `*Entity.ts`-style basenames,
 *     excluding barrel `index.*` files) must export a single namespace
 *     containing `Schema` (const, `as const`), `Type` (derived via
 *     `FromSchema<typeof Schema>`), and `validate` (a type guard).
 *
 *  2. Files under an `interfaces/` folder must declare an `interface` (not a
 *     `type` alias); files under a `types/` folder must declare a `type`
 *     alias (not an `interface`). Only top-level declarations are judged.
 *
 *  3. All other, non-exempt files with 2+ top-level `const` declarations
 *     (excluding function/class-bound consts and well-known exempt names)
 *     must live under a `constants/` folder — or a `fixtures/` folder, an
 *     equally valid destination reserved for test/example data.
 *
 * A file matches at most one category — entity detection takes priority over
 * folder-based declaration-form checks, which take priority over the
 * constants-count check.
 *
 * A fourth, independent check runs alongside whichever category above a file
 * falls into (except in files already exempt from the constants-count check —
 * `constants/`, `fixtures/`, `tests/`, `eslint-config/`, `eslint.config.mjs`,
 * `entities/`, and barrel `index.ts` files): regex literals (`/pattern/flags`
 * syntax, or `new RegExp('pattern', ...)` with an inlined string pattern) are
 * data constants exactly like magic numbers and enums, and must never be
 * declared inline — this check is zero-tolerance (a single inline regex is
 * flagged, unlike the 2+ threshold for other constants).
 */

const DECLARATION_EXEMPT_PATH_PATTERNS = [
  /\/tests\//v,
  /\/eslint-config\//v,
  /eslint\.config\.mjs$/v
];

const CONSTANTS_EXEMPT_PATH_PATTERNS = [
  /\/entities\/[^\/]+\.ts$/v,
  /\/constants\//v,
  /\/fixtures\//v,
  /\/tests\//v,
  /\/eslint-config\//v,
  /eslint\.config\.mjs$/v,
  /\/index\.ts$/v
];

const EXEMPT_CONST_NAMES = new Set([
  'ajv',
  'compiledValidator',
  'Schema',
  'validate'
]);

const ENTITY_FILE_REGEX = /Entity\.[cm]?[tj]sx?$/v;
const ENTITY_DIR_REGEX = /\/entities\//v;

const INDEX_FILES = new Set([
  'index.cts',
  'index.mts',
  'index.ts',
  'index.tsx'
]);

const FUNCTION_LIKE_INIT_TYPES = new Set([
  'ArrowFunctionExpression',
  'ClassExpression',
  'FunctionExpression'
]);

const BUILTIN_COLLECTION_CONSTRUCTOR_NAMES = new Set([
  'Map',
  'Set',
  'WeakMap',
  'WeakSet'
]);

const TS_WRAPPER_EXPRESSION_TYPES = new Set([
  'TSAsExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion'
]);

class FolderCategory {
  static isEmptyFilename(filename: string): boolean {
    return filename === '<input>' || filename.length === 0;
  }

  static isDeclarationExemptPath(filename: string): boolean {
    if (FolderCategory.isEmptyFilename(filename)) { return true; }

    const normalized = filename.split(path.sep).join('/');
    return DECLARATION_EXEMPT_PATH_PATTERNS.some((pattern) => { const result = pattern.test(normalized);
      return result; });
  }

  static isConstantsExemptPath(filename: string): boolean {
    if (FolderCategory.isEmptyFilename(filename)) { return true; }

    const normalized = filename.split(path.sep).join('/');
    return CONSTANTS_EXEMPT_PATH_PATTERNS.some((pattern) => { const result = pattern.test(normalized);
      return result; });
  }

  // Strips a leading `.../packages/<pkg-name>/` prefix before checking segment
  // membership, so a package's own name (e.g. `@studnicky/types`) never counts
  // as a `types/`/`interfaces/` convention-folder signal on its own — only a
  // real subfolder within the package does.
  static isUnderFolder(filename: string, folder: string): boolean {
    const normalized = filename.split(path.sep).join('/');
    const segments = normalized.split('/');
    const packagesIndex = segments.indexOf('packages');
    const relevantSegments = packagesIndex === -1 ? segments : segments.slice(packagesIndex + 2);

    return relevantSegments.includes(folder);
  }

  static isEntityFile(filename: string): boolean {
    if (INDEX_FILES.has(path.basename(filename))) { return false; }

    const normalized = filename.split(path.sep).join('/');
    return ENTITY_FILE_REGEX.test(normalized) || ENTITY_DIR_REGEX.test(normalized);
  }
}

// json-schema-uninexpressible: shapes a raw ESLint AST node whose `parent` is
// `unknown` (an arbitrary, mutually-recursive AST node), which JSON Schema
// cannot express
type TopLevelDeclarationNodeType = {
  readonly 'id'?: { readonly 'name': string };
  readonly 'parent': unknown;
};

class TopLevelScope {
  public static isTopLevel(rawNode: TopLevelDeclarationNodeType): boolean {
    const { parent } = rawNode;
    if (!ObjectGuard.isObject(parent)) { return false; }

    const parentType = parent.type;
    if (parentType === 'Program') { return true; }
    if (parentType !== 'ExportNamedDeclaration') { return false; }

    const grandparent = parent.parent;
    return ObjectGuard.isObject(grandparent) && grandparent.type === 'Program';
  }
}

class DeclaratorName {
  static collectPatternNames(patternNode: unknown, names: string[]): void {
    if (!ObjectGuard.isObject(patternNode)) { return; }

    const nodeType: unknown = patternNode.type;

    if (nodeType === 'Identifier') {
      const name: unknown = patternNode.name;
      if (typeof name === 'string') { names.push(name); }
      return;
    }

    if (nodeType === 'AssignmentPattern') {
      DeclaratorName.collectPatternNames(patternNode.left, names);
      return;
    }

    if (nodeType === 'RestElement') {
      DeclaratorName.collectPatternNames(patternNode.argument, names);
      return;
    }

    if (nodeType === 'ObjectPattern') {
      const properties: unknown = patternNode.properties;
      if (!Array.isArray(properties)) { return; }

      for (const property of properties) {
        if (!ObjectGuard.isObject(property)) { continue; }

        if (property.type === 'RestElement') {
          DeclaratorName.collectPatternNames(property.argument, names);
          continue;
        }

        DeclaratorName.collectPatternNames(property.value, names);
      }
      return;
    }

    if (nodeType === 'ArrayPattern') {
      const elements: unknown = patternNode.elements;
      if (!Array.isArray(elements)) { return; }

      for (const element of elements) {
        if (element === null) { continue; }
        DeclaratorName.collectPatternNames(element, names);
      }
    }
  }

  static getAll(declarator: unknown): string[] {
    if (!ObjectGuard.isObject(declarator)) { return []; }

    const names: string[] = [];
    DeclaratorName.collectPatternNames(declarator.id, names);
    return names;
  }

  // TS wrapper expressions (`as`, `satisfies`, `!`, `<T>x`) carry no data
  // shape of their own — unwrap to the expression underneath before
  // classifying it as function/reference-like or as data.
  static unwrapTsExpression(node: unknown): unknown {
    let current = node;

    while (ObjectGuard.isObject(current) && typeof current.type === 'string' && TS_WRAPPER_EXPRESSION_TYPES.has(current.type)) {
      current = current.expression;
    }

    return current;
  }

  // A value counts as function/reference-like — and therefore not inline
  // data — when it is a function literal, a call result, a member-access
  // reference (e.g. `Ns.method`, an interop-shim `.default` access), or a
  // `??`/`||`/`&&` fallback chain composed of such values (e.g. the
  // `(Mod as ...).default ?? (Mod as ...)` CJS/ESM interop pattern).
  static isFunctionOrReferenceValue(node: unknown): boolean {
    const unwrapped = DeclaratorName.unwrapTsExpression(node);
    if (!ObjectGuard.isObject(unwrapped)) { return false; }

    const nodeType: unknown = unwrapped.type;
    if (typeof nodeType !== 'string') { return false; }

    if (FUNCTION_LIKE_INIT_TYPES.has(nodeType)) { return true; }
    if (nodeType === 'MemberExpression' || nodeType === 'CallExpression') { return true; }

    if (nodeType === 'LogicalExpression') {
      return DeclaratorName.isFunctionOrReferenceValue(unwrapped.left) || DeclaratorName.isFunctionOrReferenceValue(unwrapped.right);
    }

    return false;
  }

  // An object literal is a function namespace (dispatch map / matcher set),
  // not a data constant, when at least one of its properties is itself
  // function- or reference-valued. An object literal with zero such
  // properties is pure data and still counts as a data constant.
  static isFunctionValuedObjectExpression(node: unknown): boolean {
    if (!ObjectGuard.isObject(node)) { return false; }

    const properties: unknown = node.properties;
    if (!Array.isArray(properties)) { return false; }

    return properties.some((property) => {
      if (!ObjectGuard.isObject(property) || property.type !== 'Property') { return false; }
      return DeclaratorName.isFunctionOrReferenceValue(property.value);
    });
  }

  // `new Set(...)` / `new Map(...)` / `new WeakSet(...)` / `new WeakMap(...)`
  // (unqualified global identifier callee) are conventional data-constant
  // forms and remain data constants. Any other `new` expression (e.g.
  // `new AjvClass(...)`) constructs a stateful instance, not data.
  static isBuiltinCollectionConstructor(calleeNode: unknown): boolean {
    if (!ObjectGuard.isObject(calleeNode) || calleeNode.type !== 'Identifier') { return false; }
    const { name } = calleeNode;
    return typeof name === 'string' && BUILTIN_COLLECTION_CONSTRUCTOR_NAMES.has(name);
  }

  static isNonDataConstantInit(declarator: unknown): boolean {
    if (!ObjectGuard.isObject(declarator)) { return false; }

    const initNode: unknown = declarator.init;
    if (!ObjectGuard.isObject(initNode)) { return false; }

    if (DeclaratorName.isFunctionOrReferenceValue(initNode)) { return true; }

    const initType: unknown = initNode.type;
    if (typeof initType !== 'string') { return false; }

    if (initType === 'ObjectExpression') {
      return DeclaratorName.isFunctionValuedObjectExpression(initNode);
    }

    if (initType === 'NewExpression') {
      return !DeclaratorName.isBuiltinCollectionConstructor(initNode.callee);
    }

    return false;
  }
}

class FolderShapeHelpers {
  public static getEntityBaseName(filename: string): string {
    const result = path.basename(filename).replace(/\.[cm]?[tj]sx?$/v, '');
    return result;
  }

  public static getIdName(node: unknown): string | undefined {
    if (!ObjectGuard.isObject(node)) { return undefined; }
    const { id } = node;
    if (!ObjectGuard.isObject(id)) { return undefined; }
    const { name } = id;
    return typeof name === 'string' ? name : undefined;
  }

  public static getDeclaration(node: unknown): unknown {
    if (!ObjectGuard.isObject(node)) { return undefined; }
    return node.declaration;
  }
}

type ProgramExitNodeType = Parameters<NonNullable<Rule.RuleListener['Program:exit']>>[0];

// json-schema-uninexpressible: internal AST-scan accumulator local to this
// rule's implementation, never serialized or crossing a validated boundary —
// there is no schema for it to derive from
type NamespaceMembersType = {
  'hasSchema': boolean;
  'hasSchemaAsConst': boolean;
  'hasType': boolean;
  'hasTypeFromSchema': boolean;
  'hasValidate': boolean;
  'hasValidateTypeGuard': boolean;
};

class SchemaMemberGuards {
  static isConstTypeAnnotation(typeAnnotation: unknown): boolean {
    if (!ObjectGuard.isObject(typeAnnotation)) { return false; }
    // @typescript-eslint/parser represents `as const` as either:
    //   TSTypeOperator { operator: 'const' }  (some versions)
    //   TSTypeReference { typeName: { name: 'const' } }  (other versions / this runtime)
    if (AstHelpers.getNodeType(typeAnnotation) === 'TSTypeOperator') {
      return (typeAnnotation).operator === 'const';
    }
    if (AstHelpers.getNodeType(typeAnnotation) === 'TSTypeReference') {
      const { typeName } = typeAnnotation;
      return ObjectGuard.isObject(typeName) && (typeName).name === 'const';
    }
    return false;
  }

  static isSchemaAsConst(declarator: unknown): boolean {
    if (!ObjectGuard.isObject(declarator)) { return false; }
    const { init } = declarator;
    if (!ObjectGuard.isObject(init)) { return false; }
    const initType = AstHelpers.getNodeType(init);
    // Plain: `{ ... } as const`
    if (initType === 'TSAsExpression') {
      return SchemaMemberGuards.isConstTypeAnnotation(init.typeAnnotation);
    }
    // `{ ... } as const satisfies T` — TypeScript processes as (literal as const) satisfies T
    // so the outer node is TSSatisfiesExpression wrapping a TSAsExpression
    if (initType === 'TSSatisfiesExpression') {
      const { expression } = init;
      if (!ObjectGuard.isObject(expression) || AstHelpers.getNodeType(expression) !== 'TSAsExpression') { return false; }
      return SchemaMemberGuards.isConstTypeAnnotation(expression.typeAnnotation);
    }
    return false;
  }

  static isFromSchemaRef(typeAnnotation: unknown): boolean {
    if (!ObjectGuard.isObject(typeAnnotation) || AstHelpers.getNodeType(typeAnnotation) !== 'TSTypeReference') { return false; }
    const { typeName } = typeAnnotation;
    if (!ObjectGuard.isObject(typeName)) { return false; }
    // Handle both plain Identifier and qualified name (e.g. Ns.FromSchema)
    const fromSchemaName =
      typeName.name === 'FromSchema' ||
      (ObjectGuard.isObject(typeName.right) && (typeName.right).name === 'FromSchema');
    if (!fromSchemaName) { return false; }
    // Check type arguments/parameters contains exactly one TSTypeQuery for `typeof Schema`
    let typeParams: Record<string, unknown> | undefined;
    if (ObjectGuard.isObject(typeAnnotation.typeParameters)) {
      typeParams = typeAnnotation.typeParameters;
    } else if (ObjectGuard.isObject(typeAnnotation.typeArguments)) {
      typeParams = typeAnnotation.typeArguments;
    }
    if (!ObjectGuard.isObject(typeParams)) { return false; }
    const { params } = typeParams;
    if (!Array.isArray(params) || params.length !== 1) { return false; }
    const arg: unknown = params[0];
    if (!ObjectGuard.isObject(arg) || AstHelpers.getNodeType(arg) !== 'TSTypeQuery') { return false; }
    const { exprName } = arg;
    if (!ObjectGuard.isObject(exprName)) { return false; }
    return (exprName).name === 'Schema';
  }

  static isTypeFromSchema(decl: unknown): boolean {
    if (!ObjectGuard.isObject(decl)) { return false; }
    const { typeAnnotation } = decl;
    if (!ObjectGuard.isObject(typeAnnotation)) { return false; }
    // Plain: `type Type = FromSchema<typeof Schema>`
    if (SchemaMemberGuards.isFromSchemaRef(typeAnnotation)) { return true; }
    // Intersection: `type Type = FromSchema<typeof Schema> & { ... }`
    // Accept when the first member of the intersection is FromSchema<typeof Schema>
    if (AstHelpers.getNodeType(typeAnnotation) === 'TSIntersectionType') {
      const { types } = typeAnnotation;
      if (!Array.isArray(types) || types.length < 2) { return false; }
      return SchemaMemberGuards.isFromSchemaRef(types[0]);
    }
    return false;
  }

  // Recognises `SchemaValidator.compile<Type>(Schema)` — the schema-derived
  // validator form. The compiled Ajv `ValidateFunction<Type>` is itself a
  // `(candidate: unknown) => candidate is Type` predicate, so a `const validate`
  // bound to it is a valid type guard with zero hand-written constraint logic.
  static isSchemaValidatorCompile(init: unknown): boolean {
    if (!ObjectGuard.isObject(init) || AstHelpers.getNodeType(init) !== 'CallExpression') { return false; }
    const { callee } = init;
    if (!ObjectGuard.isObject(callee) || AstHelpers.getNodeType(callee) !== 'MemberExpression') { return false; }
    const { object, property } = callee;
    if (!ObjectGuard.isObject(object) || (object).name !== 'SchemaValidator') { return false; }
    if (!ObjectGuard.isObject(property) || (property).name !== 'compile') { return false; }
    // Require an explicit `<Type>` argument so the guard narrows to the entity Type.
    let typeParams: unknown = init.typeArguments;
    if (!ObjectGuard.isObject(typeParams)) { typeParams = init.typeParameters; }
    if (!ObjectGuard.isObject(typeParams)) { return false; }
    const { params } = typeParams;
    if (!Array.isArray(params) || params.length !== 1) { return false; }
    const arg: unknown = params[0];
    if (!ObjectGuard.isObject(arg) || AstHelpers.getNodeType(arg) !== 'TSTypeReference') { return false; }
    const { typeName } = arg;
    return ObjectGuard.isObject(typeName) && (typeName).name === 'Type';
  }

  static isValidateTypeGuard(decl: unknown): boolean {
    if (!ObjectGuard.isObject(decl)) { return false; }
    const declType = AstHelpers.getNodeType(decl);

    // `export const validate = SchemaValidator.compile<Type>(Schema)` — the
    // schema-as-source-of-truth form. No explicit predicate annotation needed.
    if (declType === 'VariableDeclaration') {
      const { declarations } = decl;
      if (Array.isArray(declarations) && declarations.length > 0 && ObjectGuard.isObject(declarations[0])) {
        const firstDeclarator = declarations[0];
        if (SchemaMemberGuards.isSchemaValidatorCompile(firstDeclarator.init)) { return true; }
      }
    }

    let returnType: unknown;
    let firstParamName: string | undefined;

    if (declType === 'FunctionDeclaration') {
      returnType = decl.returnType;
      const { params } = decl;
      if (Array.isArray(params) && params.length > 0 && ObjectGuard.isObject(params[0])) {
        const p = params[0];
        if (ObjectGuard.isObject(p.name)) {
          firstParamName = (p.name).name as string | undefined;
        } else {
          firstParamName = p.name as string | undefined;
        }
      }
    } else if (declType === 'VariableDeclaration') {
      // const validate = (...): candidate is Type => { ... }
      const { declarations } = decl;
      if (!Array.isArray(declarations) || declarations.length === 0) { return false; }
      const declarator: unknown = declarations[0];
      if (!ObjectGuard.isObject(declarator)) { return false; }
      const { init } = declarator;
      if (!ObjectGuard.isObject(init)) { return false; }
      const initType = AstHelpers.getNodeType(init);
      // ArrowFunctionExpression or FunctionExpression
      if (initType !== 'ArrowFunctionExpression' && initType !== 'FunctionExpression') { return false; }
      returnType = init.returnType;
      const { params } = init;
      if (Array.isArray(params) && params.length > 0 && ObjectGuard.isObject(params[0])) {
        const p = params[0];
        if (ObjectGuard.isObject(p.name)) {
          firstParamName = (p.name).name as string | undefined;
        } else {
          firstParamName = p.name as string | undefined;
        }
      }
    } else {
      return false;
    }

    // returnType may be wrapped in a TSTypeAnnotation node
    let predicateNode: unknown = returnType;
    if (ObjectGuard.isObject(predicateNode) && AstHelpers.getNodeType(predicateNode) === 'TSTypeAnnotation') {
      predicateNode = (predicateNode).typeAnnotation;
    }
    if (!ObjectGuard.isObject(predicateNode) || AstHelpers.getNodeType(predicateNode) !== 'TSTypePredicate') { return false; }
    const predicate = predicateNode;

    // parameterName must match firstParamName
    if (ObjectGuard.isObject(predicate.parameterName)) {
      const pName = (predicate.parameterName).name;
      if (pName !== firstParamName) { return false; }
    } else {
      return false;
    }

    // typeAnnotation of predicate must reference Type
    const predTypeAnnotation = predicate.typeAnnotation;
    if (!ObjectGuard.isObject(predTypeAnnotation)) { return false; }
    // May be wrapped in TSTypeAnnotation
    let refNode: unknown = predTypeAnnotation;
    if (AstHelpers.getNodeType(refNode) === 'TSTypeAnnotation') {
      refNode = (refNode as Record<string, unknown>).typeAnnotation;
    }
    if (!ObjectGuard.isObject(refNode) || AstHelpers.getNodeType(refNode) !== 'TSTypeReference') { return false; }
    const { typeName } = refNode;
    if (!ObjectGuard.isObject(typeName)) { return false; }
    return (typeName).name === 'Type';
  }
}

class NamespaceScanner {
  static scanBody(bodyNode: unknown): NamespaceMembersType {
    const result: NamespaceMembersType = {
      'hasSchema': false,
      'hasSchemaAsConst': false,
      'hasType': false,
      'hasTypeFromSchema': false,
      'hasValidate': false,
      'hasValidateTypeGuard': false
    };

    if (!ObjectGuard.isObject(bodyNode)) { return result; }
    const { body } = bodyNode;
    if (!Array.isArray(body)) { return result; }

    for (const stmt of body) {
      if (AstHelpers.getNodeType(stmt) !== 'ExportNamedDeclaration') { continue; }
      const decl = FolderShapeHelpers.getDeclaration(stmt);
      const declType = AstHelpers.getNodeType(decl);

      if (declType === 'VariableDeclaration') {
        if (!ObjectGuard.isObject(decl)) { continue; }
        const { declarations } = decl;
        if (!Array.isArray(declarations)) { continue; }
        for (const d of declarations) {
          if (!ObjectGuard.isObject(d) || !ObjectGuard.isObject(d.id)) { continue; }
          const { name } = d.id;
          if (name === 'Schema') {
            result.hasSchema = true;
            result.hasSchemaAsConst = SchemaMemberGuards.isSchemaAsConst(d);
          }
          if (name === 'validate') {
            result.hasValidate = true;
            result.hasValidateTypeGuard = SchemaMemberGuards.isValidateTypeGuard(decl);
          }
        }
      } else if (declType === 'TSTypeAliasDeclaration') {
        if (FolderShapeHelpers.getIdName(decl) === 'Type') {
          result.hasType = true;
          result.hasTypeFromSchema = SchemaMemberGuards.isTypeFromSchema(decl);
        }
      } else if (declType === 'FunctionDeclaration') {
        if (FolderShapeHelpers.getIdName(decl) === 'validate') {
          result.hasValidate = true;
          result.hasValidateTypeGuard = SchemaMemberGuards.isValidateTypeGuard(decl);
        }
      }
    }

    return result;
  }
}

class EntityNamespaceCheck {
  static run(context: Rule.RuleContext, program: ProgramExitNodeType, expectedName: string): void {
    const body = Array.isArray((program as unknown as { 'body': unknown }).body)
      ? (program as unknown as { 'body': unknown[] }).body
      : [];

    const namespaceExports = body.filter((stmt) => {
      if (AstHelpers.getNodeType(stmt) !== 'ExportNamedDeclaration') { return false; }
      return AstHelpers.getNodeType(FolderShapeHelpers.getDeclaration(stmt)) === 'TSModuleDeclaration';
    });

    if (namespaceExports.length === 0) {
      context.report({ 'messageId': 'noNamespace', 'node': program });
      return;
    }

    for (const exportStmt of namespaceExports) {
      const decl = FolderShapeHelpers.getDeclaration(exportStmt);
      if (!ObjectGuard.isObject(decl)) { continue; }

      const nsName = FolderShapeHelpers.getIdName(decl);
      if (nsName !== expectedName) {
        context.report({
          'data': { 'expected': expectedName, 'found': nsName ?? '(unknown)' },
          'messageId': 'namespaceMismatch',
          'node': exportStmt as Rule.Node
        });
      }

      const members = NamespaceScanner.scanBody(decl.body);
      const reportNode = exportStmt as Rule.Node;

      if (!members.hasSchema) { context.report({ 'messageId': 'missingSchema', 'node': reportNode }); }
      else if (!members.hasSchemaAsConst) { context.report({ 'messageId': 'schemaNotConst', 'node': reportNode }); }
      if (!members.hasType) { context.report({ 'messageId': 'missingType', 'node': reportNode }); }
      else if (!members.hasTypeFromSchema) { context.report({ 'messageId': 'typeNotFromSchema', 'node': reportNode }); }
      if (!members.hasValidate) { context.report({ 'messageId': 'missingValidate', 'node': reportNode }); }
      else if (!members.hasValidateTypeGuard) { context.report({ 'messageId': 'validateNotTypeGuard', 'node': reportNode }); }
    }
  }
}

/**
 * Regex literals — `/pattern/flags` syntax or `new RegExp('pattern', flags)` with an inlined
 * string pattern — are data constants exactly like a magic number or an enum value, so they
 * must live in a `constants/` folder (or `fixtures/` for test/example data) alongside them.
 * Unlike the 2+-threshold constants-count check, this is zero-tolerance: a single inline regex
 * is enough to flag, since a regex pattern is never "trivial enough" to leave undocumented and
 * unnamed inline the way a lone boolean literal might be.
 */
class RegexLiteralCheck {
  static isRegexLiteral(node: Rule.Node): boolean {
    const rawNode = node as unknown as Record<string, unknown>;
    return rawNode.type === 'Literal' && ObjectGuard.isObject(rawNode.regex);
  }

  static isInlineRegExpConstruction(node: Rule.Node): boolean {
    const rawNode = node as unknown as Record<string, unknown>;
    if (rawNode.type !== 'NewExpression') { return false; }

    const callee: unknown = rawNode.callee;
    if (!ObjectGuard.isObject(callee) || callee.type !== 'Identifier' || callee.name !== 'RegExp') { return false; }

    const args: unknown = rawNode.arguments;
    if (!Array.isArray(args) || args.length === 0) { return false; }

    const firstArg: unknown = args[0];
    return ObjectGuard.isObject(firstArg) && firstArg.type === 'Literal' && typeof firstArg.value === 'string';
  }

  static run(context: Rule.RuleContext, node: Rule.Node): void {
    context.report({
      'messageId': 'regexBelongsInConstants',
      'node': node
    });
  }
}

class ConstantsCountCheck {
  static run(context: Rule.RuleContext, program: ProgramExitNodeType, physicalFilename: string): void {
    const programBody: unknown = (program as unknown as { 'body': unknown }).body;
    if (!Array.isArray(programBody)) { return; }

    const constNames: string[] = [];

    for (const statement of programBody) {
      if (!ObjectGuard.isObject(statement)) { continue; }

      const statementType: unknown = statement.type;
      let variableDeclaration: unknown = undefined;

      if (statementType === 'VariableDeclaration') {
        variableDeclaration = statement;
      } else if (statementType === 'ExportNamedDeclaration') {
        const decl: unknown = statement.declaration;

        if (ObjectGuard.isObject(decl) && decl.type === 'VariableDeclaration') {
          variableDeclaration = decl;
        }
      }

      if (!ObjectGuard.isObject(variableDeclaration)) { continue; }
      if (variableDeclaration.kind !== 'const') { continue; }

      const declarations: unknown = variableDeclaration.declarations;
      if (!Array.isArray(declarations)) { continue; }

      for (const declarator of declarations) {
        if (DeclaratorName.isNonDataConstantInit(declarator)) { continue; }

        const declaratorNames = DeclaratorName.getAll(declarator);

        for (const declaratorName of declaratorNames) {
          if (!EXEMPT_CONST_NAMES.has(declaratorName)) {
            constNames.push(declaratorName);
          }
        }
      }
    }

    if (constNames.length > 1) {
      context.report({
        'data': {
          'count': String(constNames.length),
          'file': path.basename(physicalFilename),
          'names': constNames.join(', ')
        },
        'messageId': 'mustLiveInConstantsFolder',
        'node': program
      });
    }
  }
}

type FileCategoryType =
  | { readonly 'kind': 'constants' }
  | { readonly 'kind': 'declaration'; readonly 'underInterfacesFolder': boolean; readonly 'underTypesFolder': boolean }
  | { readonly 'expectedName': string; readonly 'kind': 'entity' }
  | { readonly 'kind': 'none' };

class FileCategoryResolver {
  static resolve(filename: string): FileCategoryType {
    if (!FolderCategory.isEmptyFilename(filename) && FolderCategory.isEntityFile(filename)) {
      return { 'expectedName': FolderShapeHelpers.getEntityBaseName(filename), 'kind': 'entity' };
    }

    if (!FolderCategory.isDeclarationExemptPath(filename)) {
      const underInterfacesFolder = FolderCategory.isUnderFolder(filename, 'interfaces');
      const underTypesFolder = FolderCategory.isUnderFolder(filename, 'types');

      if (underInterfacesFolder || underTypesFolder) {
        return { 'kind': 'declaration', 'underInterfacesFolder': underInterfacesFolder, 'underTypesFolder': underTypesFolder };
      }
    }

    if (!FolderCategory.isConstantsExemptPath(filename)) {
      return { 'kind': 'constants' };
    }

    return { 'kind': 'none' };
  }
}

export const folderContentShape: Rule.RuleModule = {
  'create': (context) => {
    const { filename } = context;
    const category = FileCategoryResolver.resolve(filename);

    const visitLiteralForRegex: NonNullable<Rule.RuleListener['Literal']> = (node) => {
      if (RegexLiteralCheck.isRegexLiteral(node)) { RegexLiteralCheck.run(context, node); }
    };

    const visitNewExpressionForRegex: NonNullable<Rule.RuleListener['NewExpression']> = (node) => {
      if (RegexLiteralCheck.isInlineRegExpConstruction(node)) { RegexLiteralCheck.run(context, node); }
    };

    const regexListeners: Rule.RuleListener = FolderCategory.isConstantsExemptPath(filename)
      ? {}
      : { 'Literal': visitLiteralForRegex, 'NewExpression': visitNewExpressionForRegex };

    if (category.kind === 'none') { return regexListeners; }

    if (category.kind === 'declaration') {
      const { underInterfacesFolder, underTypesFolder } = category;

      const visitTSTypeAliasDeclaration: NonNullable<Rule.RuleListener['TSTypeAliasDeclaration']> = (node: Rule.Node) => {
        if (!underInterfacesFolder) { return; }

        const rawNode = node as unknown as TopLevelDeclarationNodeType;
        if (!TopLevelScope.isTopLevel(rawNode)) { return; }

        const name = rawNode.id?.name ?? '(unknown)';

        context.report({
          'data': { 'name': name },
          'messageId': 'typeInInterfacesFolder',
          'node': node
        });
      };

      const visitTSInterfaceDeclaration: NonNullable<Rule.RuleListener['TSInterfaceDeclaration']> = (node: Rule.Node) => {
        if (!underTypesFolder) { return; }

        const rawNode = node as unknown as TopLevelDeclarationNodeType;
        if (!TopLevelScope.isTopLevel(rawNode)) { return; }

        const name = rawNode.id?.name ?? '(unknown)';

        context.report({
          'data': { 'name': name },
          'messageId': 'interfaceInTypesFolder',
          'node': node
        });
      };

      return {
        ...regexListeners,
        'TSInterfaceDeclaration': visitTSInterfaceDeclaration,
        'TSTypeAliasDeclaration': visitTSTypeAliasDeclaration
      };
    }

    if (category.kind === 'entity') {
      const { expectedName } = category;

      const onProgramExit: NonNullable<Rule.RuleListener['Program:exit']> = (program) => {
        EntityNamespaceCheck.run(context, program, expectedName);
      };

      return { ...regexListeners, 'Program:exit': onProgramExit };
    }

    const { physicalFilename } = context;

    const onProgramExit: NonNullable<Rule.RuleListener['Program:exit']> = (program) => {
      ConstantsCountCheck.run(context, program, physicalFilename);
    };

    return { ...regexListeners, 'Program:exit': onProgramExit };
  },
  'meta': {
    'docs': {
      'description':
        "Folder location signals what a file's top-level declarations must look like: entity files must export a Schema/Type/validate namespace; 'interfaces/' folders hold `interface` declarations; 'types/' folders hold `type` alias declarations; files with 2+ top-level consts must live under a 'constants/' folder (or 'fixtures/' for test/example data); regex literals must never be declared inline and must live in 'constants/'/'fixtures/' alongside other constants and enums (zero-tolerance, unlike the 2+ threshold for other constants).",
      'recommended': false
    },
    'messages': {
      'interfaceInTypesFolder':
        "Interface '{{name}}' is declared in a 'types/' folder, which is reserved for data shapes (`type` alias declarations). Move this contract to an 'interfaces/' folder, or — if it's actually a pure data shape with no contract signal — declare it as a `type {{name}}` instead.",
      'missingSchema': 'Entity namespace must export `const Schema` — a JSON Schema object literal declared `as const`.',
      'missingType': 'Entity namespace must export `type Type` derived via `FromSchema<typeof Schema>`.',
      'missingValidate': 'Entity namespace must export `validate` — either `const validate = SchemaValidator.compile<Type>(Schema)` (preferred) or `function validate(candidate: unknown): candidate is Type`.',
      'mustLiveInConstantsFolder':
        "File '{{file}}' declares {{count}} top-level constants ({{names}}) but lives outside a 'constants/' folder. Move these into '<area>/constants/<Name>.ts' (or '<area>/fixtures/<Name>.ts' for test/example data), grouped under one exported namespace or frozen object literal.",
      'namespaceMismatch': 'Namespace name `{{found}}` must match the filename base `{{expected}}`.',
      'noNamespace': 'Entity files must export exactly one namespace (e.g. `export namespace XxxEntity { ... }`).',
      'regexBelongsInConstants':
        "Regex literals must not be declared inline — they are data constants, like magic numbers and enums, and must live alongside them. Move this pattern into '<area>/constants/<Name>.ts' (or '<area>/fixtures/<Name>.ts' for test/example data) and import it from there.",
      'schemaNotConst': 'Entity `Schema` must be declared `as const` to preserve the literal type for `FromSchema<typeof Schema>`.',
      'typeInInterfacesFolder':
        "Type alias '{{name}}' is declared in an 'interfaces/' folder, which is reserved for runtime contracts (`interface` declarations). Move this data shape to a 'types/' folder, or declare it as an actual `interface` if it has a genuine contract signal (call/construct signature, or a member typed as a function/constructor/class instance).",
      'typeNotFromSchema': 'Entity `type Type` must be derived as `FromSchema<typeof Schema>` — do not hand-write the type.',
      'validateNotTypeGuard': 'Entity `validate` must be a type guard: `const validate = SchemaValidator.compile<Type>(Schema)` (preferred) or `function validate(candidate: unknown): candidate is Type { ... }`.'
    },
    'schema': [],
    'type': 'problem'
  }
};
