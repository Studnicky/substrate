import type { Rule } from 'eslint';

import { AstHelpers } from '../shared/astHelpers.js';
import { ImportSourceValue } from '../shared/importSourceValue.js';
import { ModuleImportGraph } from '../shared/ModuleImportGraph.js';

/**
 * Reports an import/re-export whose target module can reach back to the importing file — a
 * circular import, `type`-only or not. Built on the linted file's TypeScript `Program`
 * (`ModuleImportGraph`, cached per-`Program` the way `SemanticTypeCatalog` caches its
 * candidates), never by shelling out to a separate tool.
 */
class CircularImportCheck {
  public static reportIfCyclic(node: Rule.Node, context: Rule.RuleContext): void {
    const servicesUnknown: unknown = context.sourceCode.parserServices;

    if (!AstHelpers.hasTypeServices(servicesUnknown)) {
      return;
    }

    const statement = servicesUnknown.esTreeNodeToTSNodeMap.get(node);

    if (statement === undefined) {
      return;
    }

    const sourceFile = statement.getSourceFile();
    const checker = servicesUnknown.program.getTypeChecker();
    const target = ModuleImportGraph.resolveStatementTarget(sourceFile, statement, checker);

    if (target === undefined) {
      return;
    }

    const graph = ModuleImportGraph.forProgram(servicesUnknown.program);

    if (!graph.closesCycle(sourceFile, target)) {
      return;
    }

    context.report({
      'data': { 'specifier': ImportSourceValue.get(node) ?? target.fileName },
      'messageId': 'circularImport',
      'node': node
    });
  }
}

export const noCircularImports: Rule.RuleModule = {
  'create': (context) => {
    const onImportOrExportSource = (node: Rule.Node): void => {
      CircularImportCheck.reportIfCyclic(node, context);
    };

    return {
      'ExportAllDeclaration': onImportOrExportSource,
      'ExportNamedDeclaration': onImportOrExportSource,
      'ImportDeclaration': onImportOrExportSource
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow circular imports between package source files — a cycle is a shared construct screaming to be created.',
      'recommended': false
    },
    'messages': {
      'circularImport': "'{{specifier}}' closes a circular import with this file. Extract the construct both files depend on into its own module."
    },
    'schema': [],
    'type': 'problem'
  }
};
