import type { Rule } from 'eslint';

import path from 'node:path';

const isJsonObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const INDEX_FILES = new Set([
  'index.cts',
  'index.mts',
  'index.ts',
  'index.tsx'
]);

const WORD_REGEX = /[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/gv;

const toWords = (value: string): string[] => {
  return value.match(WORD_REGEX) ?? [];
};

const isAllUpper = (value: string): boolean => {
  return value.length > 1 && value === value.toUpperCase() && value !== value.toLowerCase();
};

const toPascalCase = (value: string, preserveAcronyms: boolean): string => {
  const words = toWords(value);

  if (words.length === 0) {
    return '';
  }

  return words.map((word) => {
    if (preserveAcronyms && isAllUpper(word)) {
      return word;
    }

    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join('');
};

const toCamelCase = (value: string, preserveAcronyms: boolean): string => {
  const words = toWords(value);

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
};

const toScreamingSnakeCase = (value: string): string => {
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
};

const getFileBase = (fileName: string): string => {
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
};

const TYPE_FILES = new Set([
  'types.cts',
  'types.mts',
  'types.ts',
  'types.tsx'
]);

const isExcludedFile = (fileName: string): boolean => {
  const base = path.basename(fileName);

  if (INDEX_FILES.has(base) || TYPE_FILES.has(base)) {
    return true;
  }
  const normalized = fileName.split(path.sep).join('/');

  return (
    normalized.includes('/types/')
    || normalized.includes('/interfaces/')
    || normalized.includes('/constants/')
    || normalized.includes('/errors/')
  );
};

const hasEnumDeclaration = (program: unknown): boolean => {
  if (!isJsonObject(program)) {
    return false;
  }

  if (program.type !== 'Program') {
    return false;
  }
  const body = program.body;

  if (!Array.isArray(body)) {
    return false;
  }

  return body.some((node: unknown) => {
    return isJsonObject(node) && node.type === 'TSEnumDeclaration';
  });
};

const matchesFilename = (exportName: string, fileName: string): boolean => {
  const base = getFileBase(fileName);
  const normalized = fileName.split(path.sep).join('/');

  if (normalized.includes('/constants/')) {
    return base === toScreamingSnakeCase(exportName);
  }
  const candidates = new Set<string>();

  candidates.add(exportName);
  if (exportName.length > 0) {
    candidates.add(exportName.charAt(0).toLowerCase() + exportName.slice(1));
    candidates.add(exportName.charAt(0).toUpperCase() + exportName.slice(1));
  }
  candidates.add(toCamelCase(exportName, true));
  candidates.add(toCamelCase(exportName, false));
  candidates.add(toPascalCase(exportName, true));
  candidates.add(toPascalCase(exportName, false));

  return candidates.has(base);
};

const getFilenameCandidates = (exportName: string, fileName: string): string[] => {
  const base = getFileBase(fileName);
  const normalized = fileName.split(path.sep).join('/');

  if (normalized.includes('/constants/')) {
    const constant = toScreamingSnakeCase(exportName);

    return base === constant ? [constant] : [constant];
  }
  const candidates = new Set<string>();

  candidates.add(exportName);
  if (exportName.length > 0) {
    candidates.add(exportName.charAt(0).toLowerCase() + exportName.slice(1));
    candidates.add(exportName.charAt(0).toUpperCase() + exportName.slice(1));
  }
  candidates.add(toCamelCase(exportName, true));
  candidates.add(toCamelCase(exportName, false));
  candidates.add(toPascalCase(exportName, true));
  candidates.add(toPascalCase(exportName, false));

  return [...candidates].filter((candidate) => {
    return candidate.length > 0;
  }).toSorted((left, right) => {
    const result = left.localeCompare(right);
    return result;
  });
};

const extractExportNames = (node: Rule.Node): string[] => {
  const names: string[] = [];

  if (node.type !== 'ExportNamedDeclaration') {
    return names;
  }

  if (node.declaration) {
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
};

const createSingleExport: NonNullable<Rule.RuleModule['create']> = (context) => {
  const fileName = context.filename;

  if (fileName === '<input>' || fileName.length === 0) {
    return {};
  }
  if (isExcludedFile(fileName)) {
    return {};
  }

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
    exportNames = exportNames.concat(extractExportNames(node));
  };

  const onProgramExit: NonNullable<Rule.RuleListener['Program:exit']> = (node) => {
    if (hasEnumDeclaration(node)) {
      return;
    }
    if (sawExportAll) {
      const reportNode = firstExportNode ?? node;

      context.report({
        'data': { 'file': path.basename(fileName) },
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
      const base = getFileBase(fileName);
      const candidates = getFilenameCandidates(exportName, fileName);

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
};

export const singleExport: Rule.RuleModule = {
  'create': createSingleExport,
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
