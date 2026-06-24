import type { Rule } from 'eslint';

import path from 'node:path';

const INDEX_FILES = new Set([
  'index.cts',
  'index.mts',
  'index.ts',
  'index.tsx'
]);

const WORD_REGEX = /[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/gv;

class CaseConverter {
  public static toWords(value: string): string[] {
    return value.match(WORD_REGEX) ?? [];
  }

  public static toPascalCase(value: string, preserveAcronyms: boolean): string {
    const words = CaseConverter.toWords(value);

    if (words.length === 0) {
      return '';
    }

    return words.map((word) => {
      if (preserveAcronyms && isAllUpper(word)) {
        return word;
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join('');
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
      if (preserveAcronyms && isAllUpper(word)) {
        return word;
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join('');

    return `${firstOut}${restOut}`;
  }

  public static toScreamingSnakeCase(value: string): string {
    let out = '';
    let previousWasSeparator = true;
    let previousWasLowerOrDigit = false;
    const valueLength = value.length;

    for (let index = 0; index < valueLength; index += 1) {
      const character = value[index];

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

    return baseName.slice(0, -extension.length);
  }

  public static getFilenameCandidates(exportName: string, fileName: string): string[] {
    const base = CaseConverter.getFileBase(fileName);
    const normalized = fileName.split(path.sep).join('/');

    if (normalized.includes('/constants/')) {
      const constant = CaseConverter.toScreamingSnakeCase(exportName);

      return base === constant ? [constant] : [constant];
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

    return [...candidates].filter((candidate) => {
      return candidate.length > 0;
    }).toSorted((left, right) => {
      const result = left.localeCompare(right);
      return result;
    });
  }
}

const isAllUpper = (value: string): boolean => {
  return value.length > 1 && value === value.toUpperCase() && value !== value.toLowerCase();
};

const matchesFilename = (exportName: string, fileName: string): boolean => {
  const base = CaseConverter.getFileBase(fileName);
  const normalized = fileName.split(path.sep).join('/');

  if (normalized.includes('/constants/')) {
    return base === CaseConverter.toScreamingSnakeCase(exportName);
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

  return candidates.has(base);
};

type ExportKind =
  | 'const-function'
  | 'const-value'
  | 'enum'
  | 'error-class'
  | 'function'
  | 'interface'
  | 'namespace'
  | 'other'
  | 'other-class'
  | 'type'
  | 'type-reexport';

class ExportClassifier {
  public static classify(node: Rule.Node): ExportKind {
    if (node.type !== 'ExportNamedDeclaration') {
      return 'other';
    }
    const exportNode = node as unknown as {
      'declaration'?: {
        'body'?: unknown;
        'declarations'?: {
          'id'?: { 'name'?: string; 'type'?: string; };
          'init'?: { 'type'?: string; };
        }[];
        'id'?: { 'name'?: string; 'type'?: string; };
        'kind'?: string;
        'superClass'?: { 'name'?: string; 'type'?: string; } | null;
        'type'?: string;
      } | null;
      'exportKind'?: string;
      'specifiers'?: unknown[];
    };

    // Type-only re-export: export type { Foo } from '...' or export type { Foo }
    if (exportNode.exportKind === 'type') {
      return 'type-reexport';
    }

    const decl = exportNode.declaration;

    if (decl === null || decl === undefined) {
      return 'other';
    }

    const declType = decl.type ?? '';

    if (declType === 'TSTypeAliasDeclaration') {
      return 'type';
    }

    if (declType === 'TSInterfaceDeclaration') {
      return 'interface';
    }

    if (declType === 'TSEnumDeclaration') {
      return 'enum';
    }

    if (declType === 'TSModuleDeclaration') {
      return 'namespace';
    }

    if (declType === 'FunctionDeclaration') {
      return 'function';
    }

    if (declType === 'ClassDeclaration') {
      const superClass = decl.superClass;

      if (superClass !== null && superClass !== undefined) {
        const superName = superClass.name ?? '';

        if (superName === 'Error' || superName.endsWith('Error')) {
          return 'error-class';
        }
      }

      return 'other-class';
    }

    if (declType === 'VariableDeclaration' && decl.kind === 'const') {
      for (const declarator of decl.declarations ?? []) {
        const initType = declarator.init?.type ?? '';

        if (initType === 'ArrowFunctionExpression' || initType === 'FunctionExpression') {
          return 'const-function';
        }
      }

      return 'const-value';
    }

    return 'other';
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
        for (const declarator of declaration.declarations ?? []) {
          if (declarator.id?.type === 'Identifier') {
            const idName = declarator.id.name;

            if (typeof idName === 'string' && idName.length > 0) {
              names.push(idName);
            }
          }
        }
      }
    }

    if (node.specifiers.length > 0) {
      for (const specifier of node.specifiers) {
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

const isTypeKind = (kind: ExportKind): boolean => {
  return kind === 'type' || kind === 'interface' || kind === 'type-reexport';
};

const isConstValueKind = (kind: ExportKind): boolean => {
  return kind === 'const-value';
};

const isEnumKind = (kind: ExportKind): boolean => {
  return kind === 'enum';
};

const isErrorClassKind = (kind: ExportKind): boolean => {
  return kind === 'error-class';
};

export const singleExport: Rule.RuleModule = {
  'create': (context) => {
    const fileName = context.filename;

    if (fileName === '<input>' || fileName.length === 0) {
      return {};
    }

    const baseName = path.basename(fileName);

    if (INDEX_FILES.has(baseName)) {
      // Index files are exempt: multiple exports and export * are allowed.
      // Only default exports remain forbidden.
      const onExportDefaultDeclaration: NonNullable<Rule.RuleListener['ExportDefaultDeclaration']> = (node) => {
        context.report({
          'messageId': 'defaultExport',
          'node': node
        });
      };

      return {
        'ExportDefaultDeclaration': onExportDefaultDeclaration
      };
    }

    const exportKinds: ExportKind[] = [];
    let exportNames: string[] = [];
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
      exportKinds.push(ExportClassifier.classify(node));
      exportNames = exportNames.concat(ExportNames.extract(node));
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
        return name.length > 0;
      });

      if (unique.length === 0) {
        return;
      }

      // Content-based exemption: check if ALL exports are of the same exempt category.
      if (exportKinds.length > 0) {
        if (exportKinds.every(isTypeKind)) {
          return;
        }

        if (exportKinds.every(isConstValueKind)) {
          return;
        }

        if (exportKinds.every(isEnumKind)) {
          return;
        }

        if (exportKinds.every(isErrorClassKind)) {
          return;
        }
      }

      if (unique.length > 1) {
        const reportNode = firstExportNode ?? node;

        context.report({
          'data': {
            'exports': unique.toSorted((left, right) => {
              const result = left.localeCompare(right);
              return result;
            }).join(', ')
          },
          'messageId': 'tooMany',
          'node': reportNode
        });

        return;
      }
      const exportName = unique[0] ?? '';

      if (!matchesFilename(exportName, fileName)) {
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
