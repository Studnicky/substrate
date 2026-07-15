import type { Rule } from 'eslint';

import path from 'node:path';

/**
 * folder-declaration-shape — folder location signals declaration form.
 *
 * The law: an `interfaces/` folder holds runtime contracts (`interface`
 * declarations); a `types/` folder holds data shapes (`type` alias
 * declarations). A `type` alias filed under `interfaces/` or an `interface`
 * filed under `types/` signals the file lives in the wrong place — either the
 * declaration should move to the matching folder, or (if it genuinely has a
 * contract/data signal) it should be redeclared with the matching keyword.
 *
 * Only top-level declarations are judged — a `type` or `interface` nested
 * inside a function body, class, or namespace is local implementation detail,
 * not a folder-level API surface signal. Entity namespaces (`entities/`) are
 * naturally exempt: their `type Type` member lives inside a `TSModuleDeclaration`
 * body, not directly in the `Program` body, so it never reaches the top-level
 * check here regardless of any `interfaces/`/`types/` path segment.
 */

const EXEMPT_PATH_PATTERNS = [
  /\/tests\//v,
  /\/eslint-config\//v,
  /eslint\.config\.mjs$/v
];

const isExemptPath = (filename: string): boolean => {
  if (filename === '<input>' || filename.length === 0) { return true; }

  const normalized = filename.split(path.sep).join('/');

  return EXEMPT_PATH_PATTERNS.some((pattern) => { const result = pattern.test(normalized);
    return result; });
};

const isUnderFolder = (filename: string, folder: string): boolean => {
  const normalized = filename.split(path.sep).join('/');
  return normalized.split('/').includes(folder);
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
};

type TopLevelDeclarationNodeType = {
  readonly 'id'?: { readonly 'name': string };
  readonly 'parent': unknown;
};

class TopLevelScope {
  public static isTopLevel(rawNode: TopLevelDeclarationNodeType): boolean {
    const { parent } = rawNode;
    if (!isObject(parent)) { return false; }

    const parentType = parent.type;
    if (parentType === 'Program') { return true; }
    if (parentType !== 'ExportNamedDeclaration') { return false; }

    const grandparent = parent.parent;
    return isObject(grandparent) && grandparent.type === 'Program';
  }
}

export const folderDeclarationShape: Rule.RuleModule = {
  'create': (context) => {
    const { filename } = context;

    if (isExemptPath(filename)) { return {}; }

    const underInterfacesFolder = isUnderFolder(filename, 'interfaces');
    const underTypesFolder = isUnderFolder(filename, 'types');

    if (!underInterfacesFolder && !underTypesFolder) { return {}; }

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
      'TSInterfaceDeclaration': visitTSInterfaceDeclaration,
      'TSTypeAliasDeclaration': visitTSTypeAliasDeclaration
    };
  },
  'meta': {
    'docs': {
      'description':
        "Folder location signals declaration form: 'interfaces/' folders hold `interface` declarations (runtime contracts), 'types/' folders hold `type` alias declarations (data shapes).",
      'recommended': false
    },
    'messages': {
      'interfaceInTypesFolder':
        "Interface '{{name}}' is declared in a 'types/' folder, which is reserved for data shapes (`type` alias declarations). Move this contract to an 'interfaces/' folder, or — if it's actually a pure data shape with no contract signal — declare it as a `type {{name}}` instead.",
      'typeInInterfacesFolder':
        "Type alias '{{name}}' is declared in an 'interfaces/' folder, which is reserved for runtime contracts (`interface` declarations). Move this data shape to a 'types/' folder, or declare it as an actual `interface` if it has a genuine contract signal (call/construct signature, or a member typed as a function/constructor/class instance)."
    },
    'schema': [],
    'type': 'problem'
  }
};
