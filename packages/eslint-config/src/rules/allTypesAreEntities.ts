import type { Rule } from 'eslint';

import path from 'node:path';

const DIRECTIVE_PATTERN = /^\s*json-schema-uninexpressible:\s*\S.{9,}/v;

const EXEMPT_PATH_PATTERNS = [
  /\/entities\/[^\/]+\.ts$/v,
  /\/src\/types\//v,
  /\/tests\//v,
  /\/eslint-config\//v,
  /eslint\.config\.mjs$/v
];

const isExemptPath = (filename: string): boolean => {
  if (filename === '<input>' || filename.length === 0) { return true; }
  const normalized = filename.split(path.sep).join('/');
  return EXEMPT_PATH_PATTERNS.some((pattern) => { const result = pattern.test(normalized); return result; });
};

const isObject = (value: unknown): value is Record<string, unknown> =>
{return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);};

type CommentToken = { readonly 'type': string; readonly 'value': string };

const commentsContainDirective = (comments: readonly CommentToken[]): boolean => {
  for (const comment of comments) {
    if (comment?.type === 'Line' && DIRECTIVE_PATTERN.test(comment.value)) { return true; }
  }
  return false;
};

type SourceCodeLike = { 'getCommentsBefore': (node: unknown) => readonly CommentToken[] };

const isSourceCodeLike = (value: unknown): value is SourceCodeLike =>
{return isObject(value) && typeof value.getCommentsBefore === 'function';};

const hasExemptionComment = (rawNode: unknown, rawSourceCode: unknown): boolean => {
  if (!isSourceCodeLike(rawSourceCode)) { return false; }
  if (commentsContainDirective(rawSourceCode.getCommentsBefore(rawNode))) { return true; }
  if (!isObject(rawNode)) { return false; }
  const parent: unknown = rawNode.parent;
  if (isObject(parent) && parent.type === 'ExportNamedDeclaration') {
    return commentsContainDirective(rawSourceCode.getCommentsBefore(parent));
  }
  return false;
};

const isInsideNamespace = (rawNode: unknown): boolean => {
  let current: unknown = isObject(rawNode) ? rawNode.parent : undefined;
  while (isObject(current)) {
    const nodeType: unknown = current.type;
    if (nodeType === 'TSModuleDeclaration') { return true; }
    if (nodeType === 'Program') { return false; }
    current = current.parent;
  }
  return false;
};

class NodeName {
  static get(rawNode: unknown): string {
    if (!isObject(rawNode)) { return ''; }
    const idNode: unknown = rawNode.id;
    if (!isObject(idNode) || typeof idNode.name !== 'string') { return ''; }
    return idNode.name;
  }
}

export const allTypesAreEntities: Rule.RuleModule = {
  'create': (context) => {
    const filename = context.filename;
    if (isExemptPath(filename)) { return {}; }

    const onTSTypeAliasDeclaration = (node: Rule.Node): void => {
      if (isInsideNamespace(node)) { return; }
      if (hasExemptionComment(node, context.sourceCode)) { return; }

      context.report({
        'data': { 'name': NodeName.get(node) },
        'messageId': 'forbidden-type-alias',
        'node': node
      });
    };

    return { 'TSTypeAliasDeclaration': onTSTypeAliasDeclaration };
  },
  'meta': {
    'docs': {
      'description': 'Disallow free-standing type aliases outside entity namespaces.',
      'recommended': false
    },
    'messages': {
      'forbidden-type-alias': "Free-standing type alias '{{name}}' is forbidden. Data types live inside an entity namespace (e.g. 'export namespace {{name}}Entity { export const Schema = ...; export type Type = FromSchema<typeof Schema>; export const validate = ...; }') under an 'entities/' directory. If JSON Schema truly cannot express this shape, add '// json-schema-uninexpressible: <reason>' immediately before the declaration with a clear justification (at least 10 characters)."
    },
    'schema': [],
    'type': 'problem'
  }
};
