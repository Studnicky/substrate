import type { NodeStaticType } from '@studnicky/entity/types';
import type { Rule } from 'eslint';
import type * as ts from 'typescript';

import { SchemaNode } from '@studnicky/entity/types';
import { Predicates } from '@studnicky/types/browser';
import {
  type Program, type Symbol, SymbolFlags
} from 'typescript';

import {
  CANONICAL_INDEX_BASES,
  INDEX_FILES,
  RESTRICTED_TOPOLOGY_NAMES,
  SCREAMING_SNAKE_CASE_PATTERN,
  WORD_REGEX
} from './constants/SingleExportConstants.js';
import { AstHelpers } from './shared/astHelpers.js';

// Locale-aware string comparator for display-ordering export names in lint messages.
// `Intl.Collator.prototype.compare` is a pre-bound native function (per ECMA-402) —
// passing it directly avoids writing a wrapper arrow that would do nothing but forward
// to `String.prototype.localeCompare`, and default-options comparison is spec-equivalent
// to calling `left.localeCompare(right)` with no arguments.
const NAME_COLLATOR = new Intl.Collator();

interface CaseConversionStateInterface {
  readonly 'out': string;
  readonly 'previousWasLowerOrDigit': boolean;
  readonly 'previousWasSeparator': boolean;
}

class CaseConverter {
  public static basename(value: string): string {
    const normalized = CaseConverter.normalizePath(value);
    const lastSeparator = normalized.lastIndexOf('/');
    const result = normalized.slice(lastSeparator + 1);

    return result;
  }

  private static extension(value: string): string {
    const lastDot = value.lastIndexOf('.');
    const result = lastDot <= 0 ? '' : value.slice(lastDot).toLowerCase();

    return result;
  }

  public static normalizePath(value: string): string {
    const result = value.replaceAll('\\', '/');

    return result;
  }

  public static toWords(value: string): string[] {
    const words: string[] = [];

    WORD_REGEX.lastIndex = 0;
    let match = WORD_REGEX.exec(value);

    while (match !== null) {
      words.push(match.at(0) ?? '');
      match = WORD_REGEX.exec(value);
    }

    return words;
  }

  public static toPascalCase(value: string, preserveAcronyms: boolean): string {
    const words = CaseConverter.toWords(value);

    if (words.length === 0) {
      return '';
    }

    const result = words.map((word) => {
      if (preserveAcronyms && CaseConverter.isAllUpper(word)) {
        return word;
      }

      const capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

      return capitalizedWord;
    }).join('');

    return result;
  }

  public static toCamelCase(value: string, preserveAcronyms: boolean): string {
    const words = CaseConverter.toWords(value);

    if (words.length === 0) {
      return '';
    }
    const [
      first,
      ...rest
    ] = words;
    const firstOut = first !== undefined && first.length > 0 ? first.toLowerCase() : '';
    const restOut = rest.map((word) => {
      if (preserveAcronyms && CaseConverter.isAllUpper(word)) {
        return word;
      }

      const result = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

      return result;
    }).join('');

    return `${firstOut}${restOut}`;
  }

  public static toScreamingSnakeCase(value: string): string {
    let state: CaseConversionStateInterface = {
      'out': '', 'previousWasLowerOrDigit': false, 'previousWasSeparator': true
    };
    const valueLength = value.length;

    for (let index = 0; index < valueLength; index += 1) {
      const character = value.at(index);

      if (character === undefined) {
        continue;
      }

      state = CaseConverter.nextScreamingSnakeCaseState(state, character);
    }

    const result = state.out.endsWith('_') ? state.out.slice(0, -1) : state.out;

    return result;
  }

  private static classifyCharacter(character: string): Readonly<{ 'isAlphaNumeric': boolean; 'isDigit': boolean; 'isLowercase': boolean; 'isUppercase': boolean }> {
    const isLowercase = character >= 'a' && character <= 'z';
    const isUppercase = character >= 'A' && character <= 'Z';
    const isDigit = character >= '0' && character <= '9';
    const isAlphaNumeric = isLowercase || isUppercase || isDigit;

    return {
      'isAlphaNumeric': isAlphaNumeric, 'isDigit': isDigit, 'isLowercase': isLowercase, 'isUppercase': isUppercase
    };
  }

  private static nextScreamingSnakeCaseState(state: CaseConversionStateInterface, character: string): CaseConversionStateInterface {
    const classification = CaseConverter.classifyCharacter(character);

    if (!classification.isAlphaNumeric) {
      const out = !state.previousWasSeparator && state.out.length > 0 ? `${state.out}_` : state.out;

      return {
        'out': out, 'previousWasLowerOrDigit': false, 'previousWasSeparator': true
      };
    }

    const needsSeparator = !state.previousWasSeparator && classification.isUppercase && state.previousWasLowerOrDigit;
    const out = `${needsSeparator ? `${state.out}_` : state.out}${character.toUpperCase()}`;

    return {
      'out': out, 'previousWasLowerOrDigit': classification.isLowercase || classification.isDigit, 'previousWasSeparator': false
    };
  }

  public static getFileBase(fileName: string): string {
    const baseName = CaseConverter.basename(fileName);
    const extension = CaseConverter.extension(baseName);
    const stripExtensions = new Set([
      '.cjs',
      '.cts',
      '.js',
      '.mjs',
      '.mts',
      '.ts',
      '.tsx'
    ]);

    if (!stripExtensions.has(extension)) {
      return baseName;
    }

    const result = baseName.slice(0, -extension.length);

    return result;
  }

  public static isAllUpper(value: string): boolean {
    const result = value.length > 1 && value === value.toUpperCase() && value !== value.toLowerCase();

    return result;
  }

  public static matchesFilename(exportName: string, fileName: string): boolean {
    const base = CaseConverter.getFileBase(fileName);
    const normalized = CaseConverter.normalizePath(fileName);

    if (normalized.includes('/constants/')) {
      const result = base === CaseConverter.toScreamingSnakeCase(exportName);

      return result;
    }
    const candidates = new Set<string>();

    candidates.add(exportName);
    if (exportName.length > 0) {
      candidates.add(exportName.charAt(0).toLowerCase() + exportName.slice(1));
      candidates.add(exportName.charAt(0).toUpperCase() + exportName.slice(1));
    }
    candidates.add(CaseConverter.toCamelCase(exportName, true));
    candidates.add(CaseConverter.toCamelCase(exportName, false));
    candidates.add(CaseConverter.toPascalCase(exportName, true));
    candidates.add(CaseConverter.toPascalCase(exportName, false));

    const result = candidates.has(base);

    return result;
  }

  public static getFilenameCandidates(exportName: string, fileName: string): string[] {
    const base = CaseConverter.getFileBase(fileName);
    const normalized = CaseConverter.normalizePath(fileName);

    if (normalized.includes('/constants/')) {
      const constant = CaseConverter.toScreamingSnakeCase(exportName);

      const result = base === constant ? [constant] : [constant];

      return result;
    }
    const candidates = new Set<string>();

    candidates.add(exportName);
    if (exportName.length > 0) {
      candidates.add(exportName.charAt(0).toLowerCase() + exportName.slice(1));
      candidates.add(exportName.charAt(0).toUpperCase() + exportName.slice(1));
    }
    candidates.add(CaseConverter.toCamelCase(exportName, true));
    candidates.add(CaseConverter.toCamelCase(exportName, false));
    candidates.add(CaseConverter.toPascalCase(exportName, true));
    candidates.add(CaseConverter.toPascalCase(exportName, false));

    const result = [...candidates].filter((candidate) => {
      const isNonEmpty = candidate.length > 0;

      return isNonEmpty;
    }).toSorted(NAME_COLLATOR.compare);

    return result;
  }
}

namespace ExportShapeEntity {
  export const Schema = {
    'enum': [
      'const-function',
      'const-value',
      'enum',
      'error-class',
      'function',
      'interface',
      'namespace',
      'other',
      'other-class',
      'type',
      'type-reexport'
    ],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum([
    'const-function',
    'const-value',
    'enum',
    'error-class',
    'function',
    'interface',
    'namespace',
    'other',
    'other-class',
    'type',
    'type-reexport'
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}

const ExportShapeKind = {
  'ConstFunction': 'const-function',
  'ConstValue': 'const-value',
  'Enum': 'enum',
  'ErrorClass': 'error-class',
  'Function': 'function',
  'Interface': 'interface',
  'Namespace': 'namespace',
  'Other': 'other',
  'OtherClass': 'other-class',
  'Type': 'type',
  'TypeReexport': 'type-reexport'
} as const satisfies Record<string, ExportShapeEntity.Type>;

interface ParserServicesInterface {
  readonly 'getSymbolAtLocation': (node: unknown) => Symbol | undefined;
  readonly 'getTypeAtLocation': (node: unknown) => ts.Type;
  readonly 'program': Program;
}

interface SourceCodeServicesAccessorInterface {
  readonly 'parserServices'?: ParserServicesInterface;
}

class ParserServicesGuard {
  public static hasTypeInformation(value: unknown): value is ParserServicesInterface {
    if (!Predicates.isRecord(value)) {
      return false;
    }
    if (typeof value.getSymbolAtLocation !== 'function' || typeof value.getTypeAtLocation !== 'function') {
      return false;
    }
    const result = Predicates.isRecord(value.program) && typeof value.program.getTypeChecker === 'function';

    return result;
  }
}

class ContextHelpers {
  public static getServices(context: Rule.RuleContext): ParserServicesInterface | undefined {
    const sourceCode: SourceCodeServicesAccessorInterface = context.sourceCode;
    const services: unknown = sourceCode.parserServices;
    const result = ParserServicesGuard.hasTypeInformation(services) ? services : undefined;

    return result;
  }
}

class TypeCheckerHelpers {
  /**
   * Resolves whether a class declaration actually, through the type system,
   * extends the real global `Error` — direct or indirect inheritance. Falls
   * back to `false` (never 'error-class') whenever type-aware services are
   * unavailable, so the rest of the rule keeps working without type info.
   */
  public static isErrorClass(
    classNode: unknown,
    services: ParserServicesInterface | undefined
  ): boolean {
    if (services?.program === undefined || services.program === null) {
      return false;
    }

    const checker = services.program.getTypeChecker();
    const errorSymbol = checker.resolveName('Error', undefined, SymbolFlags.Type, false);

    if (errorSymbol === undefined) {
      return false;
    }

    const errorType = checker.getDeclaredTypeOfSymbol(errorSymbol);
    const classType = services.getTypeAtLocation(classNode);

    const result = checker.isTypeAssignableTo(classType, errorType);

    return result;
  }
}

class ExportClassifier {
  private static readonly SIMPLE_DECLARATION_SHAPES = new Map<string, ExportShapeEntity.Type>([
    ['FunctionDeclaration', ExportShapeKind.Function],
    ['TSEnumDeclaration', ExportShapeKind.Enum],
    ['TSInterfaceDeclaration', ExportShapeKind.Interface],
    ['TSModuleDeclaration', ExportShapeKind.Namespace],
    ['TSTypeAliasDeclaration', ExportShapeKind.Type]
  ]);

  public static classify(node: Rule.Node, services: ParserServicesInterface | undefined): ExportShapeEntity.Type {
    if (node.type !== 'ExportNamedDeclaration') {
      return ExportShapeKind.Other;
    }
    const exportNode: unknown = node;

    if (!Predicates.isRecord(exportNode)) {
      return ExportShapeKind.Other;
    }

    const decl: unknown = exportNode.declaration;

    // Type-only re-export: `export type { Foo } from '...'` / `export type { Foo }` — no local
    // declaration of its own. `exportKind: 'type'` alone is not enough to detect this: this
    // parser sets it on `export type Foo = ...`/`export interface Foo { ... }` too, since a type
    // alias or interface declaration is inherently type-only — those own an actual `declaration`
    // and must fall through to the `TSTypeAliasDeclaration`/`TSInterfaceDeclaration` branches
    // below instead of being swallowed into `TypeReexport` here.
    if (exportNode.exportKind === 'type' && !Predicates.isRecord(decl)) {
      return ExportShapeKind.TypeReexport;
    }

    if (!Predicates.isRecord(decl)) {
      return ExportShapeKind.Other;
    }

    const result = ExportClassifier.classifyDeclaration(decl, services);

    return result;
  }

  private static classifyDeclaration(
    decl: Record<string, unknown>,
    services: ParserServicesInterface | undefined
  ): ExportShapeEntity.Type {
    const declType = decl.type ?? '';
    const simpleShape = typeof declType === 'string' ? ExportClassifier.SIMPLE_DECLARATION_SHAPES.get(declType) : undefined;

    if (simpleShape !== undefined) {
      return simpleShape;
    }

    if (declType === 'ClassDeclaration') {
      const result = TypeCheckerHelpers.isErrorClass(decl, services) ? ExportShapeKind.ErrorClass : ExportShapeKind.OtherClass;

      return result;
    }

    if (declType === 'VariableDeclaration' && decl.kind === 'const') {
      const result = ExportClassifier.classifyConstDeclaration(decl);

      return result;
    }

    return ExportShapeKind.Other;
  }

  private static classifyConstDeclaration(decl: Record<string, unknown>): ExportShapeEntity.Type {
    const declarations: readonly unknown[] = Array.isArray(decl.declarations) ? decl.declarations : [];
    const declarationsLength = declarations.length;

    for (let index = 0; index < declarationsLength; index += 1) {
      const declarator = declarations.at(index);

      if (!Predicates.isRecord(declarator) || !Predicates.isRecord(declarator.init)) {
        continue;
      }
      const initType = declarator.init.type;

      if (initType === 'ArrowFunctionExpression' || initType === 'FunctionExpression') {
        return ExportShapeKind.ConstFunction;
      }
    }

    return ExportShapeKind.ConstValue;
  }

  public static isEnumOrConstValueShape(shape: ExportShapeEntity.Type): boolean {
    const result = shape === ExportShapeKind.ConstValue || shape === ExportShapeKind.Enum;

    return result;
  }

  public static isTypeOrConstValueShape(shape: ExportShapeEntity.Type): boolean {
    const result = shape === ExportShapeKind.ConstValue || shape === ExportShapeKind.Type;

    return result;
  }

  /**
   * A companion enum shares one exported name between a `Type` declaration and a
   * `ConstValue` declaration (the type + const satisfies-object pattern that replaces `enum`).
   */
  public static findCompanionEnumName(records: readonly ExportRecordInterface[]): string | undefined {
    const shapesByName = new Map<string, Set<ExportShapeEntity.Type>>();

    for (let recordIndex = 0; recordIndex < records.length; recordIndex += 1) {
      const record = records.at(recordIndex);

      if (record === undefined) {
        continue;
      }

      for (let nameIndex = 0; nameIndex < record.names.length; nameIndex += 1) {
        const name = record.names.at(nameIndex);

        if (name === undefined || name.length === 0) {
          continue;
        }

        const shapes = shapesByName.get(name) ?? new Set<ExportShapeEntity.Type>();

        shapes.add(record.shape);
        shapesByName.set(name, shapes);
      }
    }

    for (const [
      name,
      shapes
    ] of shapesByName) {
      if (shapes.has(ExportShapeKind.Type) && shapes.has(ExportShapeKind.ConstValue)) {
        return name;
      }
    }

    return undefined;
  }
}

class ExportNames {
  private static readonly SINGLE_NAME_DECLARATION_TYPES = new Set([
    'ClassDeclaration',
    'FunctionDeclaration',
    'TSEnumDeclaration',
    'TSInterfaceDeclaration',
    'TSModuleDeclaration',
    'TSTypeAliasDeclaration'
  ]);

  public static extract(node: Rule.Node): string[] {
    const names: string[] = [];

    if (node.type !== 'ExportNamedDeclaration') {
      return names;
    }

    if (node.declaration !== null && node.declaration !== undefined) {
      ExportNames.collectDeclarationNames(node.declaration, names);
    }

    ExportNames.collectSpecifierNames(node, names);

    return names;
  }

  private static collectSpecifierNames(node: Rule.Node, names: string[]): void {
    if (node.type !== 'ExportNamedDeclaration') {
      return;
    }

    const specifiersLength = node.specifiers.length;

    for (let index = 0; index < specifiersLength; index += 1) {
      const specifier = node.specifiers.at(index);

      if (specifier === undefined) {
        continue;
      }
      if (specifier.exported.type === 'Identifier') {
        names.push(specifier.exported.name);
      }
      if (specifier.exported.type === 'Literal' && typeof specifier.exported.value === 'string') {
        names.push(specifier.exported.value);
      }
    }
  }

  private static collectDeclarationNames(declarationNode: unknown, names: string[]): void {
    const declaration = declarationNode as {
      'declarations'?: { 'id'?: { 'name'?: string; 'type'?: string; }; }[];
      'id'?: { 'name'?: string; 'type'?: string; };
      'type'?: string;
    };
    const declarationType = declaration.type ?? '';

    if (ExportNames.SINGLE_NAME_DECLARATION_TYPES.has(declarationType) && declaration.id?.type === 'Identifier') {
      const idName = declaration.id.name;

      if (typeof idName === 'string' && idName.length > 0) {
        names.push(idName);
      }
    }

    if (declarationType === 'VariableDeclaration') {
      ExportNames.collectVariableDeclaratorNames(declaration.declarations ?? [], names);
    }
  }

  private static collectVariableDeclaratorNames(
    declarators: readonly { 'id'?: { 'name'?: string; 'type'?: string; }; }[],
    names: string[]
  ): void {
    const declaratorsLength = declarators.length;

    for (let index = 0; index < declaratorsLength; index += 1) {
      const declarator = declarators.at(index);

      if (declarator?.id?.type === 'Identifier') {
        const idName = declarator.id.name;

        if (typeof idName === 'string' && idName.length > 0) {
          names.push(idName);
        }
      }
    }
  }
}

interface ExportTrackingStateInterface {
  readonly 'baseName': string;
  readonly 'exportNames': readonly string[];
  readonly 'exportRecords': readonly ExportRecordInterface[];
  readonly 'exportShapes': readonly ExportShapeEntity.Type[];
  readonly 'fileName': string;
  readonly 'firstExportNode': Rule.Node | undefined;
  readonly 'restrictedTopology': (typeof RESTRICTED_TOPOLOGY_NAMES)[number] | undefined;
  readonly 'sawExportAll': boolean;
}

class RestrictedTopology {
  public static get(fileName: string): (typeof RESTRICTED_TOPOLOGY_NAMES)[number] | undefined {
    const normalized = CaseConverter.normalizePath(fileName);
    const base = CaseConverter.getFileBase(fileName);

    const namesLength = RESTRICTED_TOPOLOGY_NAMES.length;

    for (let index = 0; index < namesLength; index += 1) {
      const name = RESTRICTED_TOPOLOGY_NAMES.at(index);

      if (name !== undefined && (normalized.includes(`/${name}/`) || base === name || base.endsWith(`.${name}`))) {
        return name;
      }
    }

    return undefined;
  }
}

interface ExportRecordInterface {
  readonly 'names': readonly string[];
  readonly 'shape': ExportShapeEntity.Type;
}

/**
 * `errors/`/`entities/`/`interfaces/`/`types/` grant a topology exemption from the multi-export
 * and filename-match checks — but only once each file's own exports actually earn it. A path
 * alone (living under `errors/`, being named `*.errors.ts`) is not proof of shape; a file that
 * exports nothing but arbitrary consts still needs the normal checks. This reuses the same
 * type-aware `ExportShapeKind` classification `ExportClassifier` already computes for every export
 * (including its existing `TypeCheckerHelpers.isErrorClass` real-`Error`-inheritance check) rather
 * than introducing a second, parallel classifier — deliberately scoped to "does at least one
 * export in this file carry the shape this folder claims," not a full per-export audit, since the
 * folder-shape checks (`entity-file-shape`) already own the stricter per-declaration form
 * rules for `interfaces/`/`types/`; this rule only needs to stop a blank/arbitrary-content file
 * from slipping through on path alone.
 *
 * `constants/` is intentionally excluded — its exemption is already content-gated by the
 * SCREAMING_SNAKE_CASE check above this in `onProgramExit`, so no further verification is needed
 * here.
 */
class TopologyContentVerification {
  public static isSatisfied(
    topology: (typeof RESTRICTED_TOPOLOGY_NAMES)[number],
    records: readonly ExportRecordInterface[]
  ): boolean {
    if (topology === 'errors') {
      const result = records.some((record) => {
        if (record.shape === ExportShapeKind.ErrorClass) {
          return true;
        }
        // Without type services (a plain, non-type-aware lint run) a class can never classify as
        // `ErrorClass` — `TypeCheckerHelpers.isErrorClass` requires the checker. Fall back to the
        // same `*Error`-suffixed naming convention the single-export-per-file check's own
        // filename-matching already treats as this topology's signal, rather than granting no
        // exemption at all whenever type information happens to be unavailable.
        if (record.shape !== ExportShapeKind.OtherClass) {
          return false;
        }

        const names = record.names;

        for (let nameIndex = 0; nameIndex < names.length; nameIndex += 1) {
          if (names.at(nameIndex)?.endsWith('Error') === true) {
            return true;
          }
        }

        return false;
      });

      return result;
    }

    if (topology === 'interfaces') {
      const result = records.some((record) => {
        const isInterfaceShaped = record.shape === ExportShapeKind.Interface;

        return isInterfaceShaped;
      });

      return result;
    }

    if (topology === 'types') {
      const result = records.some((record) => {
        const isTypeShaped = record.shape === ExportShapeKind.Type;

        return isTypeShaped;
      });

      return result;
    }

    if (topology === 'entities') {
      // The entity convention (see `entity-file-shape`) is a namespace or a schema-derived
      // `Type` alias — either is proof the file is genuinely entity-shaped, not an arbitrary
      // grab-bag of consts sitting under `entities/`.
      const result = records.some((record) => {
        const isEntityShaped = record.shape === ExportShapeKind.Type || record.shape === ExportShapeKind.Namespace;

        return isEntityShaped;
      });

      return result;
    }

    return true;
  }
}

/** Per-file listeners enforcing exactly one named export whose name matches the filename. */
class ExportCardinalityListeners {
  public static create(context: Rule.RuleContext): Rule.RuleListener {
    const fileName = context.filename;

    if (fileName === '<input>' || fileName.length === 0) {
      return {};
    }

    const baseName = CaseConverter.basename(fileName);
    const restrictedTopology = RestrictedTopology.get(fileName);

    if (INDEX_FILES.has(baseName)) {
    // Index files are exempt: multiple exports and export * are allowed.
    // Only default exports remain forbidden.
      const onExportDefaultDeclaration: NonNullable<Rule.RuleListener['ExportDefaultDeclaration']> = (node) => {
        context.report({
          'messageId': 'defaultExport',
          'node': node
        });
      };

      return { 'ExportDefaultDeclaration': onExportDefaultDeclaration };
    }

    const services = ContextHelpers.getServices(context);
    const exportShapes: ExportShapeEntity.Type[] = [];
    const exportNames: string[] = [];
    const exportRecords: ExportRecordInterface[] = [];
    let reportedDefault = false;
    let firstExportNode: Rule.Node | undefined = undefined;
    let sawExportAll = false;

    const onExportAllDeclaration: NonNullable<Rule.RuleListener['ExportAllDeclaration']> = (node) => {
      firstExportNode ??= node;
      sawExportAll = true;
    };

    const onExportDefaultDeclaration: NonNullable<Rule.RuleListener['ExportDefaultDeclaration']> = (node) => {
      if (reportedDefault) {
        return;
      }
      reportedDefault = true;
      context.report({
        'messageId': 'defaultExport',
        'node': node
      });
    };

    const onExportNamedDeclaration: NonNullable<Rule.RuleListener['ExportNamedDeclaration']> = (node) => {
      if (node.parent.type !== 'Program') {
        return;
      }
      firstExportNode ??= node;
      const shape = ExportClassifier.classify(node, services);
      const names = ExportNames.extract(node);

      exportShapes.push(shape);
      exportNames.push(...names);
      exportRecords.push({
        'names': names, 'shape': shape
      });
    };

    const onProgramExit: NonNullable<Rule.RuleListener['Program:exit']> = (node) => {
      ExportCardinalityListeners.checkExports(context, node, {
        'baseName': baseName,
        'exportNames': exportNames,
        'exportRecords': exportRecords,
        'exportShapes': exportShapes,
        'fileName': fileName,
        'firstExportNode': firstExportNode,
        'restrictedTopology': restrictedTopology,
        'sawExportAll': sawExportAll
      });
    };

    return {
      'ExportAllDeclaration': onExportAllDeclaration,
      'ExportDefaultDeclaration': onExportDefaultDeclaration,
      'ExportNamedDeclaration': onExportNamedDeclaration,
      'Program:exit': onProgramExit
    };
  }

  private static checkExports(context: Rule.RuleContext, node: Parameters<NonNullable<Rule.RuleListener['Program:exit']>>[0], state: ExportTrackingStateInterface): void {
    if (ExportCardinalityListeners.reportExportAll(context, node, state)) {
      return;
    }

    const unique = ExportCardinalityListeners.uniqueExportNames(state.exportNames);

    if (unique.length === 0) {
      return;
    }

    if (ExportCardinalityListeners.reportConstantsCaseViolation(context, node, unique, state)) {
      return;
    }

    if (ExportCardinalityListeners.isTopologyContentExempt(state)) {
      return;
    }

    if (ExportCardinalityListeners.isEnumOnlyExport(state.exportShapes)) {
      return;
    }

    if (ExportCardinalityListeners.reportCompanionEnumIfApplicable(context, node, state)) {
      return;
    }

    ExportCardinalityListeners.reportSingleExportShape(context, node, unique, state);
  }

  private static reportExportAll(context: Rule.RuleContext, node: Parameters<NonNullable<Rule.RuleListener['Program:exit']>>[0], state: ExportTrackingStateInterface): boolean {
    if (!state.sawExportAll) {
      return false;
    }

    const reportNode = state.firstExportNode ?? node;

    context.report({
      'data': { 'file': state.baseName },
      'messageId': 'exportAll',
      'node': reportNode
    });

    return true;
  }

  private static uniqueExportNames(exportNames: readonly string[]): string[] {
    const result = [...new Set(exportNames)].filter((name) => {
      const isNonEmpty = name.length > 0;

      return isNonEmpty;
    });

    return result;
  }

  private static reportConstantsCaseViolation(
    context: Rule.RuleContext,
    node: Parameters<NonNullable<Rule.RuleListener['Program:exit']>>[0],
    unique: readonly string[],
    state: ExportTrackingStateInterface
  ): boolean {
    if (state.restrictedTopology !== 'constants') {
      return false;
    }

    const invalidConstantNames = unique.filter((name) => {
      const result = !SCREAMING_SNAKE_CASE_PATTERN.test(name);

      return result;
    });

    if (invalidConstantNames.length === 0) {
      return false;
    }

    const reportNode = state.firstExportNode ?? node;

    context.report({
      'data': {
        'exports': invalidConstantNames.toSorted(NAME_COLLATOR.compare).join(', ')
      },
      'messageId': 'constantsCase',
      'node': reportNode
    });

    return true;
  }

  // `constants/` is already content-gated above (SCREAMING_SNAKE_CASE); every other
  // restricted topology is exempt only once its own exports earn it — a blank/arbitrary-value
  // file merely sitting under `errors/`/`entities/`/`interfaces/`/`types/` (or matching the
  // filename-suffix convention) does not get a pass on path alone.
  private static isTopologyContentExempt(state: ExportTrackingStateInterface): boolean {
    if (state.restrictedTopology === undefined) {
      return false;
    }

    const result = state.restrictedTopology === 'constants' || TopologyContentVerification.isSatisfied(state.restrictedTopology, state.exportRecords);

    return result;
  }

  private static isEnumOnlyExport(exportShapes: readonly ExportShapeEntity.Type[]): boolean {
    const result = exportShapes.includes(ExportShapeKind.Enum) && exportShapes.every(ExportClassifier.isEnumOrConstValueShape);

    return result;
  }

  private static reportCompanionEnumIfApplicable(
    context: Rule.RuleContext,
    node: Parameters<NonNullable<Rule.RuleListener['Program:exit']>>[0],
    state: ExportTrackingStateInterface
  ): boolean {
    const companionEnumName = ExportClassifier.findCompanionEnumName(state.exportRecords);

    if (companionEnumName === undefined || !state.exportShapes.every(ExportClassifier.isTypeOrConstValueShape)) {
      return false;
    }

    if (!CaseConverter.matchesFilename(companionEnumName, state.fileName)) {
      const reportNode = state.firstExportNode ?? node;
      const base = CaseConverter.getFileBase(state.fileName);
      const candidates = CaseConverter.getFilenameCandidates(companionEnumName, state.fileName);

      context.report({
        'data': {
          'expected': candidates.join(', '),
          'exportName': companionEnumName,
          'fileBase': base
        },
        'messageId': 'mismatch',
        'node': reportNode
      });
    }

    return true;
  }

  private static reportSingleExportShape(
    context: Rule.RuleContext,
    node: Parameters<NonNullable<Rule.RuleListener['Program:exit']>>[0],
    unique: readonly string[],
    state: ExportTrackingStateInterface
  ): void {
    if (unique.length > 1) {
      const reportNode = state.firstExportNode ?? node;

      context.report({
        'data': {
          'exports': unique.toSorted(NAME_COLLATOR.compare).join(', ')
        },
        'messageId': 'tooMany',
        'node': reportNode
      });

      return;
    }
    const [exportName = ''] = unique;

    if (!CaseConverter.matchesFilename(exportName, state.fileName)) {
      const reportNode = state.firstExportNode ?? node;
      const base = CaseConverter.getFileBase(state.fileName);
      const candidates = CaseConverter.getFilenameCandidates(exportName, state.fileName);

      context.report({
        'data': {
          'expected': candidates.join(', '),
          'exportName': exportName,
          'fileBase': base
        },
        'messageId': 'mismatch',
        'node': reportNode
      });
    }
  }
}

/** Per-file listeners enforcing canonical export naming and index-only re-export placement. */
class ExportNamingListeners {
  public static create(context: Rule.RuleContext): Rule.RuleListener {
    const filename = context.filename;

    const lastSeparator = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'));
    const inIndex = CANONICAL_INDEX_BASES.has(filename.slice(lastSeparator + 1));
    const importedBindings = new Set<string>();

    const onImportDeclaration = (node: Rule.Node): void => {
      const rawNode = node as unknown as {
        'specifiers': { 'local': unknown }[];
      };

      const specifiers = rawNode.specifiers;
      const specifiersLength = specifiers.length;

      for (let index = 0; index < specifiersLength; index += 1) {
        const specifier = specifiers.at(index);
        const localName = specifier === undefined ? undefined : AstHelpers.getIdentifierName(specifier.local);

        if (localName !== undefined) {
          importedBindings.add(localName);
        }
      }
    };

    // Propagates the "this is an imported binding" taint through one level of simple
    // reassignment (`const localCopy = helper;`) — otherwise `export { localCopy }` for a name
    // that is really just a re-exported import escapes `exportImportedBindingOutsideIndex`
    // entirely, since only literal `ImportDeclaration` specifiers previously populated
    // `importedBindings`. Import declarations are hoisted and always precede their use, so this
    // single-pass, declaration-order propagation is sufficient for the direct-aliasing pattern;
    // it does not attempt to trace an identifier through arbitrary reassignment chains.
    const onVariableDeclarator = (node: Rule.Node): void => {
      const rawNode = node as unknown as {
        'id': unknown;
        'init': unknown;
      };

      if (AstHelpers.getNodeType(rawNode.init) !== 'Identifier') {
        return;
      }
      const initName = AstHelpers.getIdentifierName(rawNode.init);

      if (initName === undefined || !importedBindings.has(initName)) {
        return;
      }

      const declaredName = AstHelpers.getIdentifierName(rawNode.id);

      if (declaredName !== undefined) {
        importedBindings.add(declaredName);
      }
    };

    const onExportSpecifier = (node: Rule.Node): void => {
      const rawNode = node as unknown as {
        'exported': { 'name': string; 'type': string; };
        'local': { 'name': string; 'type': string; };
      };

      const localName = rawNode.local.name;
      const exportedName = rawNode.exported.name;

      if (localName === exportedName) {
        return;
      }

      context.report({
        'data': {
          'exported': exportedName, 'local': localName
        },
        'messageId': 'exportAlias',
        'node': node
      });
    };

    const onExportNamedDeclaration = (node: Rule.Node): void => {
      ExportNamingListeners.checkExportNamedDeclaration(context, node, inIndex, importedBindings);
    };

    const onExportAllDeclaration = (node: Rule.Node): void => {
      if (inIndex) {
        return;
      }

      context.report({
        'messageId': 'starReExportOutsideIndex',
        'node': node
      });
    };

    // `export = Foo` (`TSExportAssignment`) is structurally distinct from every other export
    // form this rule already listens for — it has no `ExportNamedDeclaration`/`ExportSpecifier`
    // shape at all — so re-exporting an imported namespace/binding through it was a blind spot.
    const onTSExportAssignment = (node: Rule.Node): void => {
      if (inIndex) {
        return;
      }

      const rawNode = node as unknown as { 'expression': unknown };

      if (AstHelpers.getNodeType(rawNode.expression) !== 'Identifier') {
        return;
      }
      const name = AstHelpers.getIdentifierName(rawNode.expression);

      if (name === undefined || !importedBindings.has(name)) {
        return;
      }

      context.report({
        'messageId': 'reExportOutsideIndex',
        'node': node
      });
    };

    return {
      'ExportAllDeclaration': onExportAllDeclaration,
      'ExportNamedDeclaration': onExportNamedDeclaration,
      'ExportSpecifier': onExportSpecifier,
      'ImportDeclaration': onImportDeclaration,
      'TSExportAssignment': onTSExportAssignment,
      'VariableDeclarator': onVariableDeclarator
    };
  }

  private static checkExportNamedDeclaration(
    context: Rule.RuleContext,
    node: Rule.Node,
    inIndex: boolean,
    importedBindings: ReadonlySet<string>
  ): void {
    if (inIndex) {
      return;
    }

    const rawNode = node as unknown as {
      'source': unknown;
      'specifiers': { 'exported': { 'name': string }; 'local': { 'name': string }; }[];
    };

    if (rawNode.source !== null && rawNode.source !== undefined) {
      ExportNamingListeners.checkReExportAliasing(context, node, rawNode.specifiers);

      return;
    }

    ExportNamingListeners.checkExportsImportedBinding(context, node, rawNode.specifiers, importedBindings);
  }

  private static checkReExportAliasing(
    context: Rule.RuleContext,
    node: Rule.Node,
    specifiers: readonly { 'exported': { 'name': string }; 'local': { 'name': string }; }[]
  ): void {
    const hasAliasedSpecifier = specifiers.some((specifier) => {
      const result = AstHelpers.getIdentifierName(specifier.local) !== AstHelpers.getIdentifierName(specifier.exported);

      return result;
    });

    if (!hasAliasedSpecifier) {
      context.report({
        'messageId': 'reExportOutsideIndex',
        'node': node
      });
    }
  }

  private static checkExportsImportedBinding(
    context: Rule.RuleContext,
    node: Rule.Node,
    specifiers: readonly { 'exported': { 'name': string }; 'local': { 'name': string }; }[],
    importedBindings: ReadonlySet<string>
  ): void {
    const exportsImportedBinding = specifiers.some((specifier) => {
      const localName = AstHelpers.getIdentifierName(specifier.local);

      const result = localName !== undefined && importedBindings.has(localName);

      return result;
    });

    if (exportsImportedBinding) {
      context.report({
        'messageId': 'exportImportedBindingOutsideIndex',
        'node': node
      });
    }
  }
}

/**
 * Every AST visitor key either listener family attaches — a fixed, known union, not a dynamic
 * key set. `Program:exit` and `TSExportAssignment` fall outside `RuleListener`'s well-known
 * ESTree keys, so the declared type ESLint infers for them is an unusable code-path-analysis
 * union; every merged handler is therefore built against the concrete `Rule.Node` shape and the
 * whole listener map is cast once at the end, rather than fighting each key's declared type.
 */
class ListenerMerge {
  private static dispatch(
    listeners: { readonly 'first': ((node: Rule.Node) => void) | undefined; readonly 'second': ((node: Rule.Node) => void) | undefined; }
  ): (node: Rule.Node) => void {
    const merged = (node: Rule.Node): void => {
      listeners.first?.(node);
      listeners.second?.(node);
    };

    return merged;
  }

  public static combine(first: Rule.RuleListener, second: Rule.RuleListener): Rule.RuleListener {
    const firstNode = first as unknown as Record<string, ((node: Rule.Node) => void) | undefined>;
    const secondNode = second as unknown as Record<string, ((node: Rule.Node) => void) | undefined>;
    const literal = {
      'ExportAllDeclaration': ListenerMerge.dispatch({ 'first': firstNode.ExportAllDeclaration, 'second': secondNode.ExportAllDeclaration }),
      'ExportDefaultDeclaration': ListenerMerge.dispatch({ 'first': firstNode.ExportDefaultDeclaration, 'second': secondNode.ExportDefaultDeclaration }),
      'ExportNamedDeclaration': ListenerMerge.dispatch({ 'first': firstNode.ExportNamedDeclaration, 'second': secondNode.ExportNamedDeclaration }),
      'ExportSpecifier': ListenerMerge.dispatch({ 'first': firstNode.ExportSpecifier, 'second': secondNode.ExportSpecifier }),
      'ImportDeclaration': ListenerMerge.dispatch({ 'first': firstNode.ImportDeclaration, 'second': secondNode.ImportDeclaration }),
      'Program:exit': ListenerMerge.dispatch({ 'first': firstNode['Program:exit'], 'second': secondNode['Program:exit'] }),
      'TSExportAssignment': ListenerMerge.dispatch({ 'first': firstNode.TSExportAssignment, 'second': secondNode.TSExportAssignment }),
      'VariableDeclarator': ListenerMerge.dispatch({ 'first': firstNode.VariableDeclarator, 'second': secondNode.VariableDeclarator })
    };
    const listeners = literal as unknown as Rule.RuleListener;

    return listeners;
  }
}

export const exportShape: Rule.RuleModule = {
  'create': (context) => {
    const cardinalityListeners = ExportCardinalityListeners.create(context);
    const namingListeners = ExportNamingListeners.create(context);
    const listeners = ListenerMerge.combine(cardinalityListeners, namingListeners);

    return listeners;
  },
  'meta': {
    'docs': {
      'description': 'Enforce a module\'s export surface: one named export matching the filename, canonical export names, and index-only re-export placement.',
      'recommended': false
    },
    'messages': {
      'constantsCase':
        'Constant modules must export SCREAMING_SNAKE_CASE symbols only (found: {{exports}}).',
      'defaultExport': 'Default exports are forbidden.',
      'exportAlias': "Export alias '{{exported}}' hides the canonical name '{{local}}'. Export as '{{local}}' or rename the symbol at its source.",
      'exportAll':
        'Export all re-exports are forbidden in {{file}}; export a single symbol instead.',
      'exportImportedBindingOutsideIndex':
        'Exporting an imported binding is only permitted in index files. Import and use the symbol directly instead of forwarding it.',
      'mismatch':
        'Export \'{{exportName}}\' must match filename base \'{{fileBase}}\' (expected one of: {{expected}}).',
      'reExportOutsideIndex': 'Re-exports from external modules are only permitted in index files. Move this re-export to the package index or import and use the symbol directly.',
      'starReExportOutsideIndex': "'export *' re-exports are only permitted in index files.",
      'tooMany':
        'Files must export exactly one named symbol (found: {{exports}}).'
    },
    'schema': [],
    'type': 'problem'
  }
};
