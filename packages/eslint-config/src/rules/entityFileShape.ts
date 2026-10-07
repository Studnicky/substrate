import type { NodeStaticType } from '@studnicky/entity/types';
import type { Rule } from 'eslint';

import { SchemaNode } from '@studnicky/entity/types';

import { Predicates } from '#runtime';

import {
  ENTITY_DIR_REGEX,
  ENTITY_FILE_REGEX,
  FILE_EXTENSION_STRIP_PATTERN,
  INDEX_FILES
} from './constants/EntityFileShapeConstants.js';
import { AstHelpers } from './shared/astHelpers.js';
import { DeclaratorName } from './shared/DeclaratorName.js';
import { SchemaMemberGuards } from './shared/SchemaMemberGuards.js';

/**
 * entity-file-shape — folder location signals what a file's top-level
 * declarations must look like.
 *
 * Three mutually-exclusive checks, dispatched per-file:
 *
 *  1. Entity files (`entities/` folder, or `*Entity.ts`-style basenames,
 *     excluding barrel `index.*` files) must export a single namespace
 *     containing `Schema` (const, value-first authored — `as const` or a
 *     schema-builder call), `Type` (derived from `typeof Schema` via any
 *     deriving type, e.g. `FromSchema<typeof Schema>` or `Static<typeof Schema>`),
 *     `validate` (a type guard), and `intake` (the boundary that returns a
 *     newly proven entity value). Entities whose literal root Schema type is
 *     `object` must also export `create`.
 *
 *     `validate` narrows a variable in place and produces no value, so nothing
 *     a caller holds proves the check happened and every downstream site
 *     re-checks. `intake` returns a new value whose type cannot be obtained
 *     without crossing the boundary. Both exist for those distinct jobs, and
 *     `intake` is mandatory because entities are the proof that unparsed input
 *     crossed it.
 *
 *     `create` is separate from `intake` because the distinction is provenance,
 *     not shape. `intake` parses outside data — HTTP bodies, queue messages,
 *     config blobs, file imports, database rows, and IPC payloads — and runs
 *     default-filling and unknown-property stripping (neither `intake` nor
 *     `create` coerces a value's type). `create` is for data produced locally:
 *     defaults merged, no transforms. Transforming a local fixture is wrong;
 *     skipping transforms on a request body is worse.
 *     `create` is object-only because `Partial<'healthy' | 'degraded'>` is
 *     meaningless.
 *
 *  2. Files under an `interfaces/` folder must declare an `interface` (not a
 *     `type` alias); files under a `types/` folder must declare a `type`
 *     alias (not an `interface`). Only top-level declarations are judged.
 *
 *  3. All other files with 2+ top-level `const` declarations (excluding
 *     function/class-bound consts) must live under a `constants/` folder —
 *     or a `fixtures/` folder, an equally valid destination reserved for
 *     test/example data — unless the file is itself structurally exempt (see
 *     below).
 *
 * A file matches at most one category — entity detection takes priority over
 * folder-based declaration-form checks, which take priority over the
 * constants-count check.
 *
 * A fourth, independent check runs alongside whichever category above a file
 * falls into (except in files that are themselves structurally exempt from
 * the constants-count check — see `ModuleShape.isStructurallyExemptFromConstantsCheck`
 * below): regex literals (`/pattern/flags` syntax, or `new RegExp('pattern', ...)`
 * with an inlined string pattern) are data constants exactly like magic numbers
 * and enums, and must never be declared inline — this check is zero-tolerance
 * (a single inline regex is flagged, unlike the 2+ threshold for other constants).
 *
 * A file is exempt from the constants-count check (and, transitively, from the
 * regex-literal check) purely by what it structurally *is* — never by which
 * folder it lives in or what its declarations are named:
 *
 *  - a **pure constants module** — every top-level statement is an import, a
 *    type declaration, or a `const` declaration (exported or not) — is already
 *    a self-contained constants file regardless of its folder;
 *  - a module that exports a namespace whose name ends in `Entity` carries the
 *    same entity-namespace signal `entityFileShape`'s entity check looks
 *    for, so its non-Schema/Type/validate top-level consts are exempt too;
 *  - a **pure barrel** — every top-level statement is a re-export
 *    (`export … from …` / `export * from …`) with no local declaration of its
 *    own — re-exports carry no data of their own to relocate.
 */

class PortablePath {
  public static basename(filename: string): string {
    const normalized = PortablePath.normalize(filename);
    const segmentIndex = normalized.lastIndexOf('/');
    const result = segmentIndex === -1 ? normalized : normalized.slice(segmentIndex + 1);

    return result;
  }

  public static normalize(filename: string): string {
    const result = filename.replaceAll('\\', '/');

    return result;
  }
}

class FolderCategory {
  static isEmptyFilename(filename: string): boolean {
    const result = filename === '<input>' || filename.length === 0;

    return result;
  }

  // Strips a leading `.../packages/<pkg-name>/` prefix before checking segment
  // membership, so a package's own name (e.g. `@studnicky/types`) never counts
  // as a `types/`/`interfaces/` convention-folder signal on its own — only a
  // real subfolder within the package does.
  static isUnderFolder(filename: string, folder: string): boolean {
    const normalized = PortablePath.normalize(filename);
    const segments = normalized.split('/');
    const packagesIndex = segments.indexOf('packages');
    const relevantSegments = packagesIndex === -1 ? segments : segments.slice(packagesIndex + 2);
    const result = relevantSegments.includes(folder);

    return result;
  }

  static isEntityFile(filename: string): boolean {
    if (INDEX_FILES.has(PortablePath.basename(filename))) {
      return false;
    }

    const normalized = PortablePath.normalize(filename);
    const result = ENTITY_FILE_REGEX.test(normalized) || ENTITY_DIR_REGEX.test(normalized);

    return result;
  }
}

class TopLevelScope {
  public static getName(rawNode: unknown): string | undefined {
    if (!Predicates.isRecord(rawNode) || !Predicates.isRecord(rawNode.id)) {
      return undefined;
    }

    const result = typeof rawNode.id.name === 'string' ? rawNode.id.name : undefined;

    return result;
  }

  // Walks up through `export` wrappers and TS namespace-module wrappers (`TSModuleBlock` →
  // `TSModuleDeclaration`, however many levels deep) to reach `Program`. A declaration nested
  // inside `export namespace Wrapper { ... }` is still "top level" for this check's purposes —
  // wrapping a declaration in a namespace is not a legitimate way to escape the interfaces/types
  // folder-shape convention. Any OTHER kind of nesting (a function body, a class body, a plain
  // block) breaks the chain and stays genuinely non-top-level.
  public static isTopLevel(rawNode: unknown): boolean {
    if (!Predicates.isRecord(rawNode)) {
      return false;
    }
    let parent: unknown = rawNode.parent;

    while (Predicates.isRecord(parent)) {
      const parentType = parent.type;

      if (parentType === 'Program') {
        return true;
      }

      if (parentType === 'ExportNamedDeclaration') {
        parent = parent.parent;
        continue;
      }

      if (parentType === 'TSModuleBlock') {
        const moduleDeclaration = parent.parent;

        if (!Predicates.isRecord(moduleDeclaration) || moduleDeclaration.type !== 'TSModuleDeclaration') {
          return false;
        }
        parent = moduleDeclaration.parent;
        continue;
      }

      return false;
    }

    return false;
  }
}

class FolderShapeHelpers {
  public static getIdName(node: unknown): string | undefined {
    if (!Predicates.isRecord(node)) {
      return undefined;
    }
    const { id } = node;

    if (!Predicates.isRecord(id)) {
      return undefined;
    }
    const { name } = id;
    const result = typeof name === 'string' ? name : undefined;

    return result;
  }

  public static getDeclaration(node: unknown): unknown {
    if (!Predicates.isRecord(node)) {
      return undefined;
    }

    return node.declaration;
  }
}

class NamespaceScanner {
  // Object composition and schema builders can describe an object without a
  // literal root `type`. That is undecidable from this one declarator, so do
  // not require `create` and risk a false positive.
  private static hasObjectRootType(schemaDeclarator: unknown): boolean {
    if (!Predicates.isRecord(schemaDeclarator)) {
      return false;
    }

    const schemaExpression = DeclaratorName.unwrapTsExpression(schemaDeclarator.init);

    if (!Predicates.isRecord(schemaExpression) || AstHelpers.getNodeType(schemaExpression) !== 'ObjectExpression') {
      return false;
    }

    const properties: unknown = schemaExpression.properties;

    if (!Array.isArray(properties)) {
      return false;
    }

    const result = NamespaceScanner.objectPropertiesHaveObjectTypeKey(properties);

    return result;
  }

  private static isTypePropertyKey(key: unknown): boolean {
    const result =
      Predicates.isRecord(key) &&
      ((AstHelpers.getNodeType(key) === 'Identifier' && key.name === 'type') ||
        (AstHelpers.getNodeType(key) === 'Literal' && key.value === 'type'));

    return result;
  }

  private static objectPropertiesHaveObjectTypeKey(properties: unknown[]): boolean {
    const propertiesLength = properties.length;

    for (let propertyIndex = 0; propertyIndex < propertiesLength; propertyIndex += 1) {
      const property: unknown = properties.at(propertyIndex);

      if (
        !Predicates.isRecord(property) ||
        AstHelpers.getNodeType(property) !== 'Property' ||
        property.computed === true
      ) {
        continue;
      }

      if (!NamespaceScanner.isTypePropertyKey(property.key)) {
        continue;
      }

      const value = DeclaratorName.unwrapTsExpression(property.value);
      const result =
        Predicates.isRecord(value) && AstHelpers.getNodeType(value) === 'Literal' && value.value === 'object';

      return result;
    }

    return false;
  }

  private static readonly DECLARATION_SCANNERS = new Map<
    string,
    (decl: unknown, result: ReturnType<typeof NamespaceScanner.scanBody>) => void
  >([
    ['FunctionDeclaration', NamespaceScanner.scanFunctionDeclaration],
    ['TSInterfaceDeclaration', NamespaceScanner.scanInterfaceDeclaration],
    ['TSTypeAliasDeclaration', NamespaceScanner.scanTypeAliasDeclaration],
    ['VariableDeclaration', NamespaceScanner.scanVariableDeclaration]
  ]);

  // `Schema` must be scanned before `Type`, so `Type`'s derivation-defeat check reads a settled
  // `schemaDefeatsDerivation` — a two-pass scan over these declaration-type groups.
  private static readonly SCHEMA_DECL_TYPES: ReadonlySet<string> = new Set(['VariableDeclaration']);
  private static readonly TYPE_DECL_TYPES: ReadonlySet<string> = new Set([
    'FunctionDeclaration',
    'TSInterfaceDeclaration',
    'TSTypeAliasDeclaration'
  ]);

  static scanBody(bodyNode: unknown) {
    const result = {
      'hasCreate': false,
      'hasIntake': false,
      'hasObjectRootSchema': false,
      'hasSchema': false,
      'hasSchemaValueAuthored': false,
      'hasType': false,
      'hasTypeFromSchema': false,
      'hasValidate': false,
      'hasValidateTypeGuard': false,
      'schemaComposesExternalReference': false,
      'schemaDefeatsDerivation': false
    };

    if (!Predicates.isRecord(bodyNode)) {
      return result;
    }
    const { body } = bodyNode;

    if (!Array.isArray(body)) {
      return result;
    }

    NamespaceScanner.scanDeclarations(body, result, NamespaceScanner.SCHEMA_DECL_TYPES);
    NamespaceScanner.scanDeclarations(body, result, NamespaceScanner.TYPE_DECL_TYPES);

    return result;
  }

  private static scanDeclarations(
    body: readonly unknown[],
    result: ReturnType<typeof NamespaceScanner.scanBody>,
    declTypes: ReadonlySet<string>
  ): void {
    const bodyLength = body.length;

    for (let bodyIndex = 0; bodyIndex < bodyLength; bodyIndex += 1) {
      const stmt: unknown = body.at(bodyIndex);

      if (AstHelpers.getNodeType(stmt) !== 'ExportNamedDeclaration') {
        continue;
      }
      const decl = FolderShapeHelpers.getDeclaration(stmt);
      const declType = AstHelpers.getNodeType(decl);

      if (typeof declType !== 'string' || !declTypes.has(declType)) {
        continue;
      }

      NamespaceScanner.DECLARATION_SCANNERS.get(declType)?.(decl, result);
    }
  }

  private static scanVariableDeclaration(decl: unknown, result: ReturnType<typeof NamespaceScanner.scanBody>): void {
    if (!Predicates.isRecord(decl)) {
      return;
    }
    const { declarations } = decl;

    if (!Array.isArray(declarations)) {
      return;
    }
    const declarationsLength = declarations.length;

    for (let declIndex = 0; declIndex < declarationsLength; declIndex += 1) {
      NamespaceScanner.scanVariableDeclarator(declarations.at(declIndex), decl, result);
    }
  }

  private static scanVariableDeclarator(
    d: unknown,
    decl: unknown,
    result: ReturnType<typeof NamespaceScanner.scanBody>
  ): void {
    if (!Predicates.isRecord(d) || !Predicates.isRecord(d.id)) {
      return;
    }
    const { name } = d.id;

    if (name === 'Schema') {
      result.hasSchema = true;
      result.hasSchemaValueAuthored = SchemaMemberGuards.isSchemaValueAuthored(d);
      result.hasObjectRootSchema = NamespaceScanner.hasObjectRootType(d);
      result.schemaDefeatsDerivation = SchemaMemberGuards.schemaDefeatsStructuralDerivation(d);
      result.schemaComposesExternalReference = SchemaMemberGuards.schemaComposesExternalReference(d);
    }
    if (name === 'intake') {
      result.hasIntake = true;
    }
    if (name === 'create') {
      result.hasCreate = true;
    }
    if (name === 'validate') {
      result.hasValidate = true;
      result.hasValidateTypeGuard = SchemaMemberGuards.isValidateTypeGuard(decl);
    }
  }

  private static scanTypeAliasDeclaration(decl: unknown, result: ReturnType<typeof NamespaceScanner.scanBody>): void {
    if (FolderShapeHelpers.getIdName(decl) !== 'Type') {
      return;
    }

    result.hasType = true;

    // Structural derivation with no override argument needs no proof — there is nothing to
    // disguise. Anything else (an override argument replacing the derived type, or a bare
    // hand-written `Type`) is accepted only when the schema itself proves no structural
    // derivation exists, or — when the schema composes another file's schema this walk cannot
    // see into — when `Type` itself composes that other file's already-justified `.Type`.
    const structurallyDerived =
      SchemaMemberGuards.isTypeFromSchema(decl) && !SchemaMemberGuards.derivedTypeHasOverride(decl);
    const composedFromJustifiedEntity =
      result.schemaComposesExternalReference && SchemaMemberGuards.typeIsComposedFromEntityType(decl);

    result.hasTypeFromSchema = structurallyDerived || result.schemaDefeatsDerivation || composedFromJustifiedEntity;
  }

  private static scanInterfaceDeclaration(decl: unknown, result: ReturnType<typeof NamespaceScanner.scanBody>): void {
    if (FolderShapeHelpers.getIdName(decl) !== 'Type') {
      return;
    }

    result.hasType = true;

    const structurallyDerived =
      SchemaMemberGuards.isInterfaceSchemaDerived(decl) && !SchemaMemberGuards.interfaceDerivedTypeHasOverride(decl);

    result.hasTypeFromSchema = structurallyDerived || result.schemaDefeatsDerivation;
  }

  private static scanFunctionDeclaration(decl: unknown, result: ReturnType<typeof NamespaceScanner.scanBody>): void {
    if (FolderShapeHelpers.getIdName(decl) === 'validate') {
      result.hasValidate = true;
      result.hasValidateTypeGuard = SchemaMemberGuards.isValidateTypeGuard(decl);
    }
  }
}

class EntityNamespaceCheck {
  static run(
    context: Rule.RuleContext,
    program: Parameters<NonNullable<Rule.RuleListener['Program:exit']>>[0],
    expectedName: string
  ): void {
    const rawProgram: unknown = program;
    const body = Predicates.isRecord(rawProgram) && Array.isArray(rawProgram.body) ? rawProgram.body : [];
    const namespaceExports = EntityNamespaceCheck.getNamespaceExports(body);

    if (EntityNamespaceCheck.isNodeSupportModule(namespaceExports, expectedName)) {
      return;
    }

    if (namespaceExports.length === 0) {
      context.report({
        'messageId': 'noNamespace',
        'node': program
      });

      return;
    }

    const namespaceExportsLength = namespaceExports.length;

    for (let index = 0; index < namespaceExportsLength; index += 1) {
      const exportStmt: unknown = namespaceExports.at(index);

      if (exportStmt === undefined) {
        continue;
      }
      EntityNamespaceCheck.checkNamespaceExport(context, exportStmt, expectedName);
    }
  }

  private static isNodeSupportModule(namespaceExports: unknown[], expectedName: string): boolean {
    if (!expectedName.endsWith('Node')) {
      return false;
    }
    if (namespaceExports.length !== 1) {
      return false;
    }

    const namespaceExport = namespaceExports.at(0);
    const namespaceDeclaration = FolderShapeHelpers.getDeclaration(namespaceExport);

    if (!Predicates.isRecord(namespaceDeclaration)) {
      return false;
    }
    if (FolderShapeHelpers.getIdName(namespaceDeclaration) !== expectedName) {
      return false;
    }

    const result = EntityNamespaceCheck.hasSingleNodeExport(namespaceDeclaration);

    return result;
  }

  private static hasSingleNodeExport(namespaceDeclaration: Record<string, unknown>): boolean {
    const namespaceBody: unknown = namespaceDeclaration.body;

    if (!Predicates.isRecord(namespaceBody) || !Array.isArray(namespaceBody.body)) {
      return false;
    }
    const exportedDeclarations = namespaceBody.body.filter((statement) => {
      const result = AstHelpers.getNodeType(statement) === 'ExportNamedDeclaration';

      return result;
    });

    if (exportedDeclarations.length !== 1) {
      return false;
    }
    const declaration = FolderShapeHelpers.getDeclaration(exportedDeclarations.at(0));

    if (!Predicates.isRecord(declaration) || AstHelpers.getNodeType(declaration) !== 'VariableDeclaration') {
      return false;
    }
    if (!Array.isArray(declaration.declarations) || declaration.declarations.length !== 1) {
      return false;
    }
    const result = FolderShapeHelpers.getIdName(declaration.declarations.at(0)) === 'Node';

    return result;
  }

  private static getNamespaceExports(body: unknown[]): unknown[] {
    const result = body.filter((stmt) => {
      if (AstHelpers.getNodeType(stmt) !== 'ExportNamedDeclaration') {
        return false;
      }

      const isNamespace = AstHelpers.getNodeType(FolderShapeHelpers.getDeclaration(stmt)) === 'TSModuleDeclaration';

      return isNamespace;
    });

    return result;
  }

  private static checkNamespaceExport(context: Rule.RuleContext, exportStmt: unknown, expectedName: string): void {
    if (!AstHelpers.isNode(exportStmt)) {
      return;
    }

    const decl = FolderShapeHelpers.getDeclaration(exportStmt);

    if (!Predicates.isRecord(decl)) {
      return;
    }

    const nsName = FolderShapeHelpers.getIdName(decl);

    if (nsName !== expectedName) {
      context.report({
        'data': {
          'expected': expectedName,
          'found': nsName ?? '(unknown)'
        },
        'messageId': 'namespaceMismatch',
        'node': exportStmt
      });
    }

    const members = NamespaceScanner.scanBody(decl.body);

    EntityNamespaceCheck.reportMemberShapeIssues(context, members, exportStmt);
  }

  private static reportMemberShapeIssues(
    context: Rule.RuleContext,
    members: ReturnType<typeof NamespaceScanner.scanBody>,
    reportNode: Rule.Node
  ): void {
    if (!members.hasSchema) {
      context.report({
        'messageId': 'missingSchema',
        'node': reportNode
      });
    } else if (!members.hasSchemaValueAuthored) {
      context.report({
        'messageId': 'schemaNotConst',
        'node': reportNode
      });
    }
    if (!members.hasType) {
      context.report({
        'messageId': 'missingType',
        'node': reportNode
      });
    } else if (!members.hasTypeFromSchema) {
      context.report({
        'messageId': 'typeNotFromSchema',
        'node': reportNode
      });
    }
    if (!members.hasValidate) {
      context.report({
        'messageId': 'missingValidate',
        'node': reportNode
      });
    } else if (!members.hasValidateTypeGuard) {
      context.report({
        'messageId': 'validateNotTypeGuard',
        'node': reportNode
      });
    }
    if (!members.hasIntake) {
      context.report({
        'messageId': 'missingIntake',
        'node': reportNode
      });
    }
    if (members.hasObjectRootSchema && !members.hasCreate) {
      context.report({
        'messageId': 'missingCreate',
        'node': reportNode
      });
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
    const rawNode: unknown = node;

    if (!Predicates.isRecord(rawNode)) {
      return false;
    }

    const result = rawNode.type === 'Literal' && Predicates.isRecord(rawNode.regex);

    return result;
  }

  // A string argument is "inlined" — and thus a regex pattern belonging in constants/fixtures —
  // when its full text is knowable statically at the call site: a plain string literal, a
  // template literal with no interpolated expressions (`` `^abc$` ``), or a `+`-chain of only
  // such static operands (`"^a" + "bc$"`). A reference to a runtime variable is never inlined,
  // regardless of how the variable itself was built elsewhere.
  static isStaticStringArgument(node: unknown): boolean {
    if (!Predicates.isRecord(node)) {
      return false;
    }

    if (node.type === 'Literal') {
      const result = typeof node.value === 'string';

      return result;
    }

    if (node.type === 'TemplateLiteral') {
      const expressions: unknown = node.expressions;

      const result = Array.isArray(expressions) && expressions.length === 0;

      return result;
    }

    if (node.type === 'BinaryExpression' && node.operator === '+') {
      const result =
        RegexLiteralCheck.isStaticStringArgument(node.left) && RegexLiteralCheck.isStaticStringArgument(node.right);

      return result;
    }

    return false;
  }

  static isInlineRegExpConstruction(node: Rule.Node): boolean {
    const rawNode: unknown = node;

    if (!Predicates.isRecord(rawNode)) {
      return false;
    }
    if (rawNode.type !== 'NewExpression') {
      return false;
    }

    const callee: unknown = rawNode.callee;

    if (!Predicates.isRecord(callee) || callee.type !== 'Identifier' || callee.name !== 'RegExp') {
      return false;
    }

    const argumentList: unknown = rawNode.arguments;

    if (!Array.isArray(argumentList) || argumentList.length === 0) {
      return false;
    }

    const firstArgument: unknown = argumentList.at(0);

    const result = RegexLiteralCheck.isStaticStringArgument(firstArgument);

    return result;
  }

  static run(context: Rule.RuleContext, node: Rule.Node): void {
    context.report({
      'messageId': 'regexBelongsInConstants',
      'node': node
    });
  }
}

/**
 * Replaces the old path-pattern exemptions (`constants/`, `entities/`,
 * `index.ts`) with structural tests over the parsed `Program`: a file earns
 * exemption from the constants-count (and regex-literal) check by what its
 * top-level declarations structurally *are*, never by the folder it lives in
 * or what it is named.
 */
class ModuleShape {
  private static isTypeOnlyDeclaration(nodeType: unknown): boolean {
    const result = nodeType === 'TSTypeAliasDeclaration' || nodeType === 'TSInterfaceDeclaration';

    return result;
  }

  // Every declarator in a `const` VariableDeclaration must itself be a data
  // constant — not a function/class value, dispatch-map, or non-collection
  // `new` instance — reusing the exact same per-declarator test the
  // constants-count check applies (`DeclaratorName.isNonDataConstantInit`).
  private static isPureConstDeclaration(variableDeclaration: unknown): boolean {
    if (!Predicates.isRecord(variableDeclaration) || variableDeclaration.kind !== 'const') {
      return false;
    }

    const declarations: unknown = variableDeclaration.declarations;

    if (!Array.isArray(declarations) || declarations.length === 0) {
      return false;
    }

    const result = declarations.every((declarator) => {
      const isDataConstant = !DeclaratorName.isNonDataConstantInit(declarator);

      return isDataConstant;
    });

    return result;
  }

  // A pure constants module: every top-level statement is an import, a type
  // declaration, or a `const` declaration (exported or bare) whose declarators
  // are all genuine data constants — no function/class declaration, no
  // mutable `let`/`var`, and no function-valued `const` appears at the top
  // level. Such a file is already, in its entirety, a self-contained
  // constants module regardless of which folder it lives in — a file mixing
  // data constants with functions or classes still needs relocating, exactly
  // as before.
  static isPureConstantsModule(program: unknown): boolean {
    if (!Predicates.isRecord(program)) {
      return false;
    }
    const body: unknown = program.body;

    if (!Array.isArray(body) || body.length === 0) {
      return false;
    }

    let hasConstDeclarator = false;

    const isPure = body.every((statement) => {
      const classification = ModuleShape.classifyPureConstantsStatement(statement);

      if (classification.hasConstDeclarator) {
        hasConstDeclarator = true;
      }

      return classification.isValid;
    });

    const result = isPure && hasConstDeclarator;

    return result;
  }

  private static classifyPureConstantsStatement(
    statement: unknown
  ): Readonly<{ 'hasConstDeclarator': boolean; 'isValid': boolean }> {
    if (!Predicates.isRecord(statement)) {
      return {
        'hasConstDeclarator': false,
        'isValid': false
      };
    }
    const statementType: unknown = statement.type;

    if (statementType === 'ImportDeclaration') {
      return {
        'hasConstDeclarator': false,
        'isValid': true
      };
    }
    if (ModuleShape.isTypeOnlyDeclaration(statementType)) {
      return {
        'hasConstDeclarator': false,
        'isValid': true
      };
    }

    if (statementType === 'VariableDeclaration') {
      const pure = ModuleShape.isPureConstDeclaration(statement);

      return {
        'hasConstDeclarator': pure,
        'isValid': pure
      };
    }

    if (statementType === 'ExportNamedDeclaration') {
      const result = ModuleShape.classifyExportedPureConstantsStatement(statement.declaration);

      return result;
    }

    return {
      'hasConstDeclarator': false,
      'isValid': false
    };
  }

  private static classifyExportedPureConstantsStatement(
    decl: unknown
  ): Readonly<{ 'hasConstDeclarator': boolean; 'isValid': boolean }> {
    if (decl === null || decl === undefined || !Predicates.isRecord(decl)) {
      return {
        'hasConstDeclarator': false,
        'isValid': false
      };
    }

    const declType: unknown = decl.type;

    if (ModuleShape.isTypeOnlyDeclaration(declType)) {
      return {
        'hasConstDeclarator': false,
        'isValid': true
      };
    }
    if (declType === 'VariableDeclaration') {
      const pure = ModuleShape.isPureConstDeclaration(decl);

      return {
        'hasConstDeclarator': pure,
        'isValid': pure
      };
    }

    return {
      'hasConstDeclarator': false,
      'isValid': false
    };
  }

  // An entity-namespace export (`export namespace XxxEntity { ... }`) is the
  // same structural signal `EntityNamespaceCheck` looks for. A file that
  // carries it is entity-shaped by content, so its remaining top-level consts
  // (support constants alongside the namespace) are exempt too.
  static hasEntityNamespaceExport(program: unknown): boolean {
    if (!Predicates.isRecord(program)) {
      return false;
    }
    const body: unknown = program.body;

    if (!Array.isArray(body)) {
      return false;
    }

    const result = body.some((statement) => {
      if (AstHelpers.getNodeType(statement) !== 'ExportNamedDeclaration') {
        return false;
      }
      const decl = FolderShapeHelpers.getDeclaration(statement);

      if (AstHelpers.getNodeType(decl) !== 'TSModuleDeclaration') {
        return false;
      }

      const name = FolderShapeHelpers.getIdName(decl);

      const isEntityNamed = typeof name === 'string' && name.endsWith('Entity');

      return isEntityNamed;
    });

    return result;
  }

  private static isPureReExportStatement(statement: unknown): boolean {
    if (!Predicates.isRecord(statement)) {
      return false;
    }
    const statementType: unknown = statement.type;

    if (statementType === 'ExportAllDeclaration') {
      return true;
    }
    if (statementType !== 'ExportNamedDeclaration') {
      return false;
    }

    const decl: unknown = statement.declaration;

    if (decl !== null && decl !== undefined) {
      return false;
    }

    const result = Predicates.isRecord(statement.source);

    return result;
  }

  // A pure barrel: every top-level statement re-exports from another module
  // (`export { X } from '...'` / `export * from '...'`), with no local
  // declaration of its own. A re-export carries no data of its own to
  // relocate, so the file is exempt regardless of its filename.
  static isPureBarrel(program: unknown): boolean {
    if (!Predicates.isRecord(program)) {
      return false;
    }
    const body: unknown = program.body;

    if (!Array.isArray(body) || body.length === 0) {
      return false;
    }

    const result = body.every(ModuleShape.isPureReExportStatement);

    return result;
  }

  static isStructurallyExemptFromConstantsCheck(program: unknown): boolean {
    const result =
      ModuleShape.isPureConstantsModule(program) ||
      ModuleShape.hasEntityNamespaceExport(program) ||
      ModuleShape.isPureBarrel(program);

    return result;
  }
}

// THE `constantsNotIsolated` MESSAGE USED TO PRESCRIBE AN IMPOSSIBLE REMEDY.
//
// It advertised two remedies: extract the constants "grouped under one
// exported namespace OR frozen object literal". Only the second is actually
// reachable. `export-shape` requires a module's sole export to be named in
// SCREAMING_SNAKE_CASE, and a TS `namespace` declaration is a PascalCase
// construct — there is no SCREAMING_SNAKE_CASE spelling of `namespace Foo {}`
// that TypeScript accepts. Verified directly: a constants file isolating its
// values under `export namespace SOME_CONSTANTS { ... }` still fails
// `export-shape` (the namespace's own identifier casing is wrong by
// construction, independent of what's inside it), while the same values
// isolated as `export const SOME_CONSTANTS = { ... } as const;` passes both
// rules clean. The namespace alternative is dropped from the message below —
// not because grouping is wrong, but because that specific spelling of
// grouping can never satisfy the paired rule. `export-shape` itself is
// unchanged; the fix is only to stop this rule from pointing at a dead end.
class ConstantsCountCheck {
  static run(
    context: Rule.RuleContext,
    program: Parameters<NonNullable<Rule.RuleListener['Program:exit']>>[0],
    physicalFilename: string
  ): void {
    const rawProgram: unknown = program;

    if (!Predicates.isRecord(rawProgram)) {
      return;
    }
    const programBody: unknown = rawProgram.body;

    if (!Array.isArray(programBody)) {
      return;
    }

    const constNames = ConstantsCountCheck.collectConstNames(programBody);

    if (constNames.length > 1) {
      context.report({
        'data': {
          'count': String(constNames.length),
          'file': PortablePath.basename(physicalFilename),
          'names': constNames.join(', ')
        },
        'messageId': 'constantsNotIsolated',
        'node': program
      });
    }
  }

  private static collectConstNames(programBody: unknown[]): string[] {
    const constNames: string[] = [];
    const programBodyLength = programBody.length;

    for (let bodyIndex = 0; bodyIndex < programBodyLength; bodyIndex += 1) {
      const statement: unknown = programBody.at(bodyIndex);

      if (!Predicates.isRecord(statement)) {
        continue;
      }

      const variableDeclaration = ConstantsCountCheck.constVariableDeclarationForStatement(statement);

      if (variableDeclaration === undefined) {
        continue;
      }

      ConstantsCountCheck.collectConstDeclaratorNames(variableDeclaration, constNames);
    }

    return constNames;
  }

  private static constVariableDeclarationForStatement(
    statement: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    const statementType: unknown = statement.type;
    let variableDeclaration: unknown;

    if (statementType === 'VariableDeclaration') {
      variableDeclaration = statement;
    } else if (statementType === 'ExportNamedDeclaration') {
      const decl: unknown = statement.declaration;

      if (Predicates.isRecord(decl) && decl.type === 'VariableDeclaration') {
        variableDeclaration = decl;
      }
    }

    if (!Predicates.isRecord(variableDeclaration) || variableDeclaration.kind !== 'const') {
      return undefined;
    }

    return variableDeclaration;
  }

  private static collectConstDeclaratorNames(variableDeclaration: Record<string, unknown>, constNames: string[]): void {
    const declarations: unknown = variableDeclaration.declarations;

    if (!Array.isArray(declarations)) {
      return;
    }

    const declarationsLength = declarations.length;

    for (let declIndex = 0; declIndex < declarationsLength; declIndex += 1) {
      const declarator: unknown = declarations.at(declIndex);

      if (DeclaratorName.isNonDataConstantInit(declarator)) {
        continue;
      }

      const declaratorNames = DeclaratorName.getAll(declarator);
      const declaratorNamesLength = declaratorNames.length;

      for (let nameIndex = 0; nameIndex < declaratorNamesLength; nameIndex += 1) {
        const declaratorName = declaratorNames.at(nameIndex);

        if (declaratorName !== undefined) {
          constNames.push(declaratorName);
        }
      }
    }
  }
}

namespace FileCategorySchema {
  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'expectedName': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, ['constants', 'declaration', 'entity', 'none'] as const),
      'underInterfacesFolder': SchemaNode.defineBoolean({
        'type': 'boolean'
      } as const),
      'underTypesFolder': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
    },
    ['expectedName', 'shape', 'underInterfacesFolder', 'underTypesFolder'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  );
}

class FileCategoryResolver {
  static resolve(filename: string): NodeStaticType<typeof FileCategorySchema.Node> {
    if (FolderCategory.isEmptyFilename(filename)) {
      return {
        'expectedName': '',
        'shape': 'none',
        'underInterfacesFolder': false,
        'underTypesFolder': false
      };
    }

    if (FolderCategory.isEntityFile(filename)) {
      return {
        'expectedName': PortablePath.basename(filename).replace(FILE_EXTENSION_STRIP_PATTERN, ''),
        'shape': 'entity',
        'underInterfacesFolder': false,
        'underTypesFolder': false
      };
    }

    const underInterfacesFolder = FolderCategory.isUnderFolder(filename, 'interfaces');
    const underTypesFolder = FolderCategory.isUnderFolder(filename, 'types');

    if (underInterfacesFolder || underTypesFolder) {
      return {
        'expectedName': '',
        'shape': 'declaration',
        'underInterfacesFolder': underInterfacesFolder,
        'underTypesFolder': underTypesFolder
      };
    }

    // Whether this file's top-level consts are actually flagged is decided
    // structurally, from the parsed Program, at Program:exit — see
    // `ModuleShape.isStructurallyExemptFromConstantsCheck`.
    return {
      'expectedName': '',
      'shape': 'constants',
      'underInterfacesFolder': false,
      'underTypesFolder': false
    };
  }
}

// NO FIXER, BY DESIGN — NOT AN OVERSIGHT.
//
// Standing policy: an autofixer may exist only for a transformation that is
// GUARANTEED safe; any residual risk means no fixer at all. Every remedy this
// rule reports is a FILE-LEVEL move or a new-file creation — extract these
// top-level consts into a new `constants/`/`fixtures/` file, move a
// misplaced `interface`/`type` into the right sibling folder, add missing
// `Schema`/`Type`/`validate` members to an entity namespace — none of which
// is expressible as a single-file text edit ESLint's fixer API can perform.
// Same standing policy as `explicitReturnBinding.ts` (see that file's "NO
// FIXER" note) and `inline-trivial-logic`'s deleted fixer: a human resolves
// each violation by hand.
export const entityFileShape: Rule.RuleModule = {
  'create': (context) => {
    const { filename } = context;
    const category = FileCategoryResolver.resolve(filename);

    // Computed from the parsed Program as soon as traversal reaches it — before
    // any Literal/NewExpression node is visited — so both the regex-literal
    // check below and the constants-count check at Program:exit gate on the
    // same structural determination.
    let structurallyExemptFromConstantsCheck = false;

    const onProgramEnter: NonNullable<Rule.RuleListener['Program']> = (program) => {
      structurallyExemptFromConstantsCheck = ModuleShape.isStructurallyExemptFromConstantsCheck(program);
    };

    const visitLiteralForRegex: NonNullable<Rule.RuleListener['Literal']> = (node) => {
      if (structurallyExemptFromConstantsCheck) {
        return;
      }
      if (RegexLiteralCheck.isRegexLiteral(node)) {
        RegexLiteralCheck.run(context, node);
      }
    };

    const visitNewExpressionForRegex: NonNullable<Rule.RuleListener['NewExpression']> = (node) => {
      if (structurallyExemptFromConstantsCheck) {
        return;
      }
      if (RegexLiteralCheck.isInlineRegExpConstruction(node)) {
        RegexLiteralCheck.run(context, node);
      }
    };

    const regexListeners: Rule.RuleListener = {
      'Literal': visitLiteralForRegex,
      'NewExpression': visitNewExpressionForRegex,
      'Program': onProgramEnter
    };

    if (category.shape === 'none') {
      return regexListeners;
    }

    if (category.shape === 'declaration') {
      const { underInterfacesFolder, underTypesFolder } = category;

      const visitTSTypeAliasDeclaration: NonNullable<Rule.RuleListener['TSTypeAliasDeclaration']> = (
        node: Rule.Node
      ) => {
        if (!underInterfacesFolder) {
          return;
        }

        if (!TopLevelScope.isTopLevel(node)) {
          return;
        }

        const name = TopLevelScope.getName(node) ?? '(unknown)';

        context.report({
          'data': { 'name': name },
          'messageId': 'typeInInterfacesFolder',
          'node': node
        });
      };

      const visitTSInterfaceDeclaration: NonNullable<Rule.RuleListener['TSInterfaceDeclaration']> = (
        node: Rule.Node
      ) => {
        if (!underTypesFolder) {
          return;
        }

        if (!TopLevelScope.isTopLevel(node)) {
          return;
        }

        const name = TopLevelScope.getName(node) ?? '(unknown)';

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

    if (category.shape === 'entity') {
      const { expectedName } = category;

      const onProgramExit: NonNullable<Rule.RuleListener['Program:exit']> = (program) => {
        EntityNamespaceCheck.run(context, program, expectedName);
      };

      return {
        ...regexListeners,
        'Program:exit': onProgramExit
      };
    }

    const { physicalFilename } = context;

    const onProgramExit: NonNullable<Rule.RuleListener['Program:exit']> = (program) => {
      if (structurallyExemptFromConstantsCheck) {
        return;
      }
      ConstantsCountCheck.run(context, program, physicalFilename);
    };

    return {
      ...regexListeners,
      'Program:exit': onProgramExit
    };
  },
  'meta': {
    'docs': {
      'description':
        "Folder location signals what a file's top-level declarations must look like: entity files must export a Schema/Type/validate namespace; 'interfaces/' folders hold `interface` declarations; 'types/' folders hold `type` alias declarations; files with 2+ top-level consts must live under a 'constants/' folder (or 'fixtures/' for test/example data); regex literals must never be declared inline and must live in 'constants/'/'fixtures/' alongside other constants and enums (zero-tolerance, unlike the 2+ threshold for other constants).",
      'recommended': false
    },
    'messages': {
      'constantsNotIsolated':
        "File '{{file}}' declares {{count}} top-level constants ({{names}}) alongside other top-level declarations (re-exports, functions, classes, or mutable bindings), so it is not a self-contained constants module. Extract these constants into their own '<area>/constants/<Name>.ts' (or '<area>/fixtures/<Name>.ts' for test/example data) file, isolated from the other declarations, grouped under one exported frozen object literal.",
      'interfaceInTypesFolder':
        "Interface '{{name}}' is declared in a 'types/' folder, which is reserved for data shapes (`type` alias declarations). Move this contract to an 'interfaces/' folder, or — if it's actually a pure data shape with no contract signal — declare it as a `type {{name}}` instead.",
      'missingCreate':
        'Entity namespace with a literal object `Schema` must export `create` as `const create = EntityCompiler.compileCreate<Type>(Schema)` for locally produced partial data.',
      'missingIntake':
        'Entity namespace must export `intake` as `const intake = EntityCompiler.compileIntake<Type>(Schema)`, so callers hold a value proven to have crossed the input boundary.',
      'missingSchema':
        'Entity namespace must export `const Schema` — a JSON Schema object literal declared `as const`, or a schema-builder call (e.g. `Type.Object({...})`).',
      'missingType':
        'Entity namespace must export `type Type` derived from `typeof Schema` (e.g. `FromSchema<typeof Schema>` or `Static<typeof Schema>`).',
      'missingValidate':
        'Entity namespace must export `validate` — either `const validate = EntityCompiler.compile<Type>(Schema)` (preferred) or `function validate(candidate: unknown): candidate is Type`.',
      'namespaceMismatch': 'Namespace name `{{found}}` must match the filename base `{{expected}}`.',
      'noNamespace': 'Entity files must export exactly one namespace (e.g. `export namespace XxxEntity { ... }`).',
      'regexBelongsInConstants':
        "Regex literals must not be declared inline — they are data constants, like magic numbers and enums, and must live alongside them. Move this pattern into '<area>/constants/<Name>.ts' (or '<area>/fixtures/<Name>.ts' for test/example data) and import it from there.",
      'schemaNotConst':
        'Entity `Schema` must be value-first authored — declared `as const` (to preserve the literal type for `FromSchema<typeof Schema>`) or built via a schema-builder call (e.g. `Type.Object({...})`).',
      'typeInInterfacesFolder':
        "Type alias '{{name}}' is declared in an 'interfaces/' folder, which is reserved for runtime contracts (`interface` declarations). Move this data shape to a 'types/' folder, or declare it as an actual `interface` if it has a genuine contract signal (call/construct signature, or a member typed as a function/constructor/class instance).",
      'typeNotFromSchema':
        'Entity `type Type` must be derived from `typeof Schema` (e.g. `FromSchema<typeof Schema>` or `Static<typeof Schema>`) — do not hand-write the type.',
      'validateNotTypeGuard':
        'Entity `validate` must be a type guard: `const validate = EntityCompiler.compile<Type>(Schema)` (preferred) or `function validate(candidate: unknown): candidate is Type { ... }`.'
    },
    'schema': [],
    'type': 'problem'
  }
};
