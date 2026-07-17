import type { Rule } from 'eslint';

import path from 'node:path';

import { ExemptionComment } from './shared/exemptionComment.js';
import { ObjectGuard } from './shared/ObjectGuard.js';

const DIRECTIVE_PATTERN = /^\s*json-schema-uninexpressible:\s*\S.{9,}/v;

const EXEMPT_PATH_PATTERNS = [
  /\/entities\/[^\/]+\.ts$/v,
  /\/src\/types\//v,
  /\/tests\//v,
  /\/eslint-config\//v,
  /eslint\.config\.mjs$/v
];

class PathGuards {
  static isExemptPath(filename: string): boolean {
    if (filename === '<input>' || filename.length === 0) { return true; }
    const normalized = filename.split(path.sep).join('/');
    return EXEMPT_PATH_PATTERNS.some((pattern) => { const result = pattern.test(normalized); return result; });
  }
}

class NodeName {
  static get(rawNode: unknown): string {
    if (!ObjectGuard.isObject(rawNode)) { return ''; }
    const idNode: unknown = rawNode.id;
    if (!ObjectGuard.isObject(idNode) || typeof idNode.name !== 'string') { return ''; }
    return idNode.name;
  }

  static isInsideNamespace(rawNode: unknown): boolean {
    let current: unknown = ObjectGuard.isObject(rawNode) ? rawNode.parent : undefined;
    while (ObjectGuard.isObject(current)) {
      const nodeType: unknown = current.type;
      if (nodeType === 'TSModuleDeclaration') { return true; }
      if (nodeType === 'Program') { return false; }
      current = current.parent;
    }
    return false;
  }
}

export const allTypesAreEntities: Rule.RuleModule = {
  'create': (context) => {
    const filename = context.filename;
    if (PathGuards.isExemptPath(filename)) { return {}; }

    const onTSTypeAliasDeclaration = (node: Rule.Node): void => {
      if (NodeName.isInsideNamespace(node)) { return; }
      if (ExemptionComment.hasWithExportFallback(node, context.sourceCode, DIRECTIVE_PATTERN)) { return; }

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
