import type { Rule } from 'eslint';

import path from 'node:path';

const INDEX_BASES = new Set([
  'index.js',
  'index.mjs',
  'index.mts',
  'index.ts'
]);

class PathGuards {
  static isIndexFile(filename: string): boolean {
    const result = INDEX_BASES.has(path.basename(filename));
    return result;
  }
}

class AstHelpers {
  public static getIdentifierName(node: unknown): string | undefined {
    if (node === null || node === undefined || typeof node !== 'object' || Array.isArray(node)) {
      return undefined;
    }
    const obj = node as Record<string, unknown>;
    const name = obj.name;

    return typeof name === 'string' ? name : undefined;
  }
}

export const canonicalExportNames: Rule.RuleModule = {
  'create': (context) => {
    const filename = context.filename;

    const inIndex = PathGuards.isIndexFile(filename);
    const importedBindings = new Set<string>();

    const onImportDeclaration = (node: Rule.Node): void => {
      const rawNode = node as unknown as {
        'specifiers': { 'local': unknown }[];
      };

      for (const specifier of rawNode.specifiers) {
        const localName = AstHelpers.getIdentifierName(specifier.local);

        if (localName !== undefined) {
          importedBindings.add(localName);
        }
      }
    };

    const onExportSpecifier = (node: Rule.Node): void => {
      const rawNode = node as unknown as {
        'exported': { 'name': string; 'type': string; };
        'local': { 'name': string; 'type': string; };
        'parent': { 'source': unknown; 'type': string; };
      };

      const localName = rawNode.local.name;
      const exportedName = rawNode.exported.name;

      if (localName === exportedName) {
        return;
      }

      if (rawNode.parent.type === 'ExportNamedDeclaration' && rawNode.parent.source !== null) {
        context.report({
          'data': { 'exported': exportedName, 'local': localName },
          'messageId': 'exportAlias',
          'node': node
        });

        return;
      }

      context.report({
        'data': { 'exported': exportedName, 'local': localName },
        'messageId': 'exportAlias',
        'node': node
      });
    };

    const onExportNamedDeclaration = (node: Rule.Node): void => {
      const rawNode = node as unknown as {
        'source': unknown;
        'specifiers': { 'exported': { 'name': string }; 'local': { 'name': string }; }[];
      };

      if (!inIndex) {
        if (rawNode.source !== null && rawNode.source !== undefined) {
          const hasAliasedSpecifier = rawNode.specifiers.some((specifier) => {
            return AstHelpers.getIdentifierName(specifier.local) !== AstHelpers.getIdentifierName(specifier.exported);
          });

          if (!hasAliasedSpecifier) {
            context.report({
              'messageId': 'reExportOutsideIndex',
              'node': node
            });
          }

          return;
        }

        const exportsImportedBinding = rawNode.specifiers.some((specifier) => {
          const localName = AstHelpers.getIdentifierName(specifier.local);

          return localName !== undefined && importedBindings.has(localName);
        });

        if (exportsImportedBinding) {
          context.report({
            'messageId': 'exportImportedBindingOutsideIndex',
            'node': node
          });
        }
      }
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

    return {
      'ExportAllDeclaration': onExportAllDeclaration,
      'ExportNamedDeclaration': onExportNamedDeclaration,
      'ExportSpecifier': onExportSpecifier,
      'ImportDeclaration': onImportDeclaration
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow aliased exports and any non-index re-export path.',
      'recommended': false
    },
    'messages': {
      'exportAlias': "Export alias '{{exported}}' hides the canonical name '{{local}}'. Export as '{{local}}' or rename the symbol at its source.",
      'exportImportedBindingOutsideIndex':
        'Exporting an imported binding is only permitted in index files. Import and use the symbol directly instead of forwarding it.',
      'reExportOutsideIndex': 'Re-exports from external modules are only permitted in index files. Move this re-export to the package index or import and use the symbol directly.',
      'starReExportOutsideIndex': "'export *' re-exports are only permitted in index files."
    },
    'schema': [],
    'type': 'problem'
  }
};
