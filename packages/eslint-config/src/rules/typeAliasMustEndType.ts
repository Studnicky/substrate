import type { JSSyntaxElement, Rule } from 'eslint';

type ExportSpecifierNodeType = {
  readonly 'exportKind'?: string;
  readonly 'local': { readonly 'name': string };
};

type ProgramExportNodeType = JSSyntaxElement & {
  readonly 'declaration'?: unknown;
  readonly 'exportKind'?: string;
  readonly 'source'?: unknown;
  readonly 'specifiers'?: ExportSpecifierNodeType[];
};

/**
 * Detects the separate re-export form: `type Foo = {...}; export type { Foo };`
 * (or `export { type Foo };`). The declaration's own parent is `Program`, not
 * `ExportNamedDeclaration`, so this walks the Program body for a same-file
 * export specifier list (no `source`) naming the alias, exported as a type
 * either at the declaration level (`export type { Foo }`) or the specifier
 * level (`export { type Foo }`).
 */
class ReexportDetection {
  public static isReexportedAsType(context: Rule.RuleContext, name: string): boolean {
    const program = context.sourceCode.ast as unknown as { 'body': ProgramExportNodeType[] };

    return program.body.some((statement) => {
      if (statement.type !== 'ExportNamedDeclaration') { return false; }
      if (statement.declaration !== null && statement.declaration !== undefined) { return false; }
      if (statement.source !== null && statement.source !== undefined) { return false; }

      return (statement.specifiers ?? []).some((specifier) => {
        if (specifier.local.name !== name) { return false; }
        return statement.exportKind === 'type' || specifier.exportKind === 'type';
      });
    });
  }
}

export const typeAliasMustEndType: Rule.RuleModule = {
  'create': (context) => {
    const listener: NonNullable<Rule.RuleListener['TSTypeAliasDeclaration']> = (node: Rule.Node) => {
      const rawNode = node as unknown as {
        'id': { 'name': string };
        'parent': { 'type': string };
      };

      const isInlineExport = rawNode.parent.type === 'ExportNamedDeclaration';
      const isSeparateReexport =
        rawNode.parent.type === 'Program' && ReexportDetection.isReexportedAsType(context, rawNode.id.name);

      if (!isInlineExport && !isSeparateReexport) { return; }
      if (rawNode.id.name.endsWith('Type')) { return; }

      context.report({
        'data': { 'name': rawNode.id.name },
        'messageId': 'mustEndType',
        'node': node
      });
    };
    return { 'TSTypeAliasDeclaration': listener };
  },
  'meta': {
    'docs': {
      'description':
        'Exported type aliases must end in `Type`. Rename `XxxFoo` to `XxxFooType`.'
    },
    'messages': {
      'mustEndType':
        "Exported type alias '{{name}}' must end in 'Type'. Rename to '{{name}}Type'."
    },
    'schema': [],
    'type': 'problem'
  }
};
