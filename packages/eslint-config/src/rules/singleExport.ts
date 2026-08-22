import type { Rule } from 'eslint';
import type {
  FromSchema, JSONSchema
} from 'json-schema-to-ts';

import path from 'node:path';
import {
  type Program, type Symbol, SymbolFlags, type Type
} from 'typescript';

import {
  INDEX_FILES,
  RESTRICTED_TOPOLOGY_NAMES,
  SCREAMING_SNAKE_CASE_PATTERN,
  WORD_REGEX
} from './constants/SingleExportConstants.js';
import { ObjectGuard } from './shared/ObjectGuard.js';

// Locale-aware string comparator for display-ordering export names in lint messages.
// `Intl.Collator.prototype.compare` is a pre-bound native function (per ECMA-402) —
// passing it directly avoids writing a wrapper arrow that would do nothing but forward
// to `String.prototype.localeCompare`, and default-options comparison is spec-equivalent
// to calling `left.localeCompare(right)` with no arguments.
const NAME_COLLATOR = new Intl.Collator();

class CaseConverter {
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

      const result = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

      return result;
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
    let out = '';
    let previousWasSeparator = true;
    let previousWasLowerOrDigit = false;
    const valueLength = value.length;

    for (let index = 0; index < valueLength; index += 1) {
      const character = value.at(index);

      if (character === undefined) {
        continue;
      }
      const isLowercase = character >= 'a' && character <= 'z';
      const isUppercase = character >= 'A' && character <= 'Z';
      const isDigit = character >= '0' && character <= '9';
      const isAlphaNumeric = isLowercase || isUppercase || isDigit;

      if (!isAlphaNumeric) {
        if (!previousWasSeparator && out.length > 0) {
          out += '_';
        }
        previousWasSeparator = true;
        previousWasLowerOrDigit = false;
        continue;
      }

      if (!previousWasSeparator && isUppercase && previousWasLowerOrDigit) {
        out += '_';
      }

      out += character.toUpperCase();
      previousWasSeparator = false;
      previousWasLowerOrDigit = isLowercase || isDigit;
    }

    if (out.endsWith('_')) {
      out = out.slice(0, -1);
    }

    return out;
  }

  public static getFileBase(fileName: string): string {
    const baseName = path.basename(fileName);
    const extension = path.extname(baseName).toLowerCase();
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
    const normalized = fileName.split(path.sep).join('/');

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
    const normalized = fileName.split(path.sep).join('/');

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
      const result = candidate.length > 0;

      return result;
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
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}

const ExportShape = {
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
  readonly 'getTypeAtLocation': (node: unknown) => Type;
  readonly 'program': Program;
}

interface SourceCodeServicesAccessorInterface {
  readonly 'parserServices'?: ParserServicesInterface;
}

class ParserServicesGuard {
  public static hasTypeInformation(value: unknown): value is ParserServicesInterface {
    if (!ObjectGuard.isObject(value)) {
      return false;
    }
    if (typeof value.getSymbolAtLocation !== 'function' || typeof value.getTypeAtLocation !== 'function') {
      return false;
    }
    const result = ObjectGuard.isObject(value.program) && typeof value.program.getTypeChecker === 'function';

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
  public static classify(node: Rule.Node, services: ParserServicesInterface | undefined): ExportShapeEntity.Type {
    if (node.type !== 'ExportNamedDeclaration') {
      return ExportShape.Other;
    }
    const exportNode: unknown = node;

    if (!ObjectGuard.isObject(exportNode)) {
      return ExportShape.Other;
    }

    const decl: unknown = exportNode.declaration;

    // Type-only re-export: `export type { Foo } from '...'` / `export type { Foo }` — no local
    // declaration of its own. `exportKind: 'type'` alone is not enough to detect this: this
    // parser sets it on `export type Foo = ...`/`export interface Foo { ... }` too, since a type
    // alias or interface declaration is inherently type-only — those own an actual `declaration`
    // and must fall through to the `TSTypeAliasDeclaration`/`TSInterfaceDeclaration` branches
    // below instead of being swallowed into `TypeReexport` here.
    if (exportNode.exportKind === 'type' && !ObjectGuard.isObject(decl)) {
      return ExportShape.TypeReexport;
    }

    if (!ObjectGuard.isObject(decl)) {
      return ExportShape.Other;
    }

    const declType = decl.type ?? '';

    if (declType === 'TSTypeAliasDeclaration') {
      return ExportShape.Type;
    }

    if (declType === 'TSInterfaceDeclaration') {
      return ExportShape.Interface;
    }

    if (declType === 'TSEnumDeclaration') {
      return ExportShape.Enum;
    }

    if (declType === 'TSModuleDeclaration') {
      return ExportShape.Namespace;
    }

    if (declType === 'FunctionDeclaration') {
      return ExportShape.Function;
    }

    if (declType === 'ClassDeclaration') {
      if (TypeCheckerHelpers.isErrorClass(decl, services)) {
        return ExportShape.ErrorClass;
      }

      return ExportShape.OtherClass;
    }

    if (declType === 'VariableDeclaration' && decl.kind === 'const') {
      const declarations: readonly unknown[] = Array.isArray(decl.declarations) ? decl.declarations : [];
      const declarationsLength = declarations.length;

      for (let index = 0; index < declarationsLength; index += 1) {
        const declarator = declarations.at(index);

        if (!ObjectGuard.isObject(declarator) || !ObjectGuard.isObject(declarator.init)) {
          continue;
        }
        const initType = declarator.init.type;

        if (initType === 'ArrowFunctionExpression' || initType === 'FunctionExpression') {
          return ExportShape.ConstFunction;
        }
      }

      return ExportShape.ConstValue;
    }

    return ExportShape.Other;
  }

  public static isEnumOrConstValueShape(shape: ExportShapeEntity.Type): boolean {
    const result = shape === ExportShape.ConstValue || shape === ExportShape.Enum;

    return result;
  }
}

class ExportNames {
  public static extract(node: Rule.Node): string[] {
    const names: string[] = [];

    if (node.type !== 'ExportNamedDeclaration') {
      return names;
    }

    if (node.declaration !== null && node.declaration !== undefined) {
      const declaration = node.declaration as {
        'declarations'?: { 'id'?: { 'name'?: string; 'type'?: string; }; }[];
        'id'?: { 'name'?: string; 'type'?: string; };
        'type'?: string;
      };
      const declarationType = declaration.type ?? '';

      if ((
        declarationType === 'FunctionDeclaration'
        || declarationType === 'ClassDeclaration'
        || declarationType === 'TSInterfaceDeclaration'
        || declarationType === 'TSTypeAliasDeclaration'
        || declarationType === 'TSEnumDeclaration'
        || declarationType === 'TSModuleDeclaration'
      ) && declaration.id?.type === 'Identifier') {
        const idName = declaration.id.name;

        if (typeof idName === 'string' && idName.length > 0) {
          names.push(idName);
        }
      }

      if (declarationType === 'VariableDeclaration') {
        const declarators = declaration.declarations ?? [];
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

    if (node.specifiers.length > 0) {
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

    return names;
  }
}

class RestrictedTopology {
  public static get(fileName: string): (typeof RESTRICTED_TOPOLOGY_NAMES)[number] | undefined {
    const normalized = fileName.split(path.sep).join('/');
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
 * type-aware `ExportShape` classification `ExportClassifier` already computes for every export
 * (including its existing `TypeCheckerHelpers.isErrorClass` real-`Error`-inheritance check) rather
 * than introducing a second, parallel classifier — deliberately scoped to "does at least one
 * export in this file carry the shape this folder claims," not a full per-export audit, since the
 * folder-shape checks (`folder-content-shape`) already own the stricter per-declaration form
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
        if (record.shape === ExportShape.ErrorClass) {
          return true;
        }
        // Without type services (a plain, non-type-aware lint run) a class can never classify as
        // `ErrorClass` — `TypeCheckerHelpers.isErrorClass` requires the checker. Fall back to the
        // same `*Error`-suffixed naming convention `single-export`'s own filename-matching already
        // treats as this topology's signal, rather than granting no exemption at all whenever type
        // information happens to be unavailable.
        if (record.shape !== ExportShape.OtherClass) {
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
        const result = record.shape === ExportShape.Interface;

        return result;
      });

      return result;
    }

    if (topology === 'types') {
      const result = records.some((record) => {
        const result = record.shape === ExportShape.Type;

        return result;
      });

      return result;
    }

    if (topology === 'entities') {
      // The entity convention (see `folder-content-shape`) is a namespace or a schema-derived
      // `Type` alias — either is proof the file is genuinely entity-shaped, not an arbitrary
      // grab-bag of consts sitting under `entities/`.
      const result = records.some((record) => {
        const result = record.shape === ExportShape.Type || record.shape === ExportShape.Namespace;

        return result;
      });

      return result;
    }

    return true;
  }
}

export const singleExport: Rule.RuleModule = {
  'create': (context) => {
    const fileName = context.filename;

    if (fileName === '<input>' || fileName.length === 0) {
      return {};
    }

    const baseName = path.basename(fileName);
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
      if (sawExportAll) {
        const reportNode = firstExportNode ?? node;

        context.report({
          'data': { 'file': baseName },
          'messageId': 'exportAll',
          'node': reportNode
        });

        return;
      }

      const unique = [...new Set(exportNames)].filter((name) => {
        const result = name.length > 0;

        return result;
      });

      if (unique.length === 0) {
        return;
      }

      if (restrictedTopology === 'constants') {
        const invalidConstantNames = unique.filter((name) => {
          const result = !SCREAMING_SNAKE_CASE_PATTERN.test(name);

          return result;
        });

        if (invalidConstantNames.length > 0) {
          const reportNode = firstExportNode ?? node;

          context.report({
            'data': {
              'exports': invalidConstantNames.toSorted(NAME_COLLATOR.compare).join(', ')
            },
            'messageId': 'constantsCase',
            'node': reportNode
          });

          return;
        }
      }

      // `constants/` is already content-gated above (SCREAMING_SNAKE_CASE); every other
      // restricted topology is exempt only once its own exports earn it — a blank/arbitrary-value
      // file merely sitting under `errors/`/`entities/`/`interfaces/`/`types/` (or matching the
      // filename-suffix convention) does not get a pass on path alone.
      if (restrictedTopology !== undefined) {
        const contentVerified = restrictedTopology === 'constants' || TopologyContentVerification.isSatisfied(restrictedTopology, exportRecords);

        if (contentVerified) {
          return;
        }
      }

      if (exportShapes.includes(ExportShape.Enum) && exportShapes.every(ExportClassifier.isEnumOrConstValueShape)) {
        return;
      }

      if (unique.length > 1) {
        const reportNode = firstExportNode ?? node;

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

      if (!CaseConverter.matchesFilename(exportName, fileName)) {
        const reportNode = firstExportNode ?? node;
        const base = CaseConverter.getFileBase(fileName);
        const candidates = CaseConverter.getFilenameCandidates(exportName, fileName);

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
    };

    return {
      'ExportAllDeclaration': onExportAllDeclaration,
      'ExportDefaultDeclaration': onExportDefaultDeclaration,
      'ExportNamedDeclaration': onExportNamedDeclaration,
      'Program:exit': onProgramExit
    };
  },
  'meta': {
    'docs': {
      'description': 'Require a single named export per file with a matching filename.',
      'recommended': false
    },
    'messages': {
      'constantsCase':
        'Constant modules must export SCREAMING_SNAKE_CASE symbols only (found: {{exports}}).',
      'defaultExport': 'Default exports are forbidden.',
      'exportAll':
        'Export all re-exports are forbidden in {{file}}; export a single symbol instead.',
      'mismatch':
        'Export \'{{exportName}}\' must match filename base \'{{fileBase}}\' (expected one of: {{expected}}).',
      'tooMany':
        'Files must export exactly one named symbol (found: {{exports}}).'
    },
    'schema': [],
    'type': 'problem'
  }
};
