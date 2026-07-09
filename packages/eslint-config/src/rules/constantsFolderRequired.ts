import type { Rule } from 'eslint';

import path from 'node:path';

const EXEMPT_CONST_NAMES = new Set([
  'ajv',
  'compiledValidator',
  'Schema',
  'validate'
]);

const EXEMPT_PATH_PATTERNS = [
  /\/entities\/[^\/]+\.ts$/v,
  /\/constants\//v,
  /\/tests\//v,
  /\/eslint-config\//v,
  /eslint\.config\.mjs$/v,
  /\/index\.ts$/v
];

const isExemptPath = (filename: string): boolean => {
  if (filename === '<input>' || filename.length === 0) { return true; }

  const normalized = filename.split(path.sep).join('/');

  return EXEMPT_PATH_PATTERNS.some((pattern) => { const result = pattern.test(normalized);
    return result; });
};

const isObject = (value: unknown): value is Record<string, unknown> =>
{return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);};

class DeclaratorName {
  static get(declarator: unknown): string | undefined {
    if (!isObject(declarator)) { return undefined; }

    const idNode: unknown = declarator.id;
    if (!isObject(idNode)) { return undefined; }

    const name: unknown = idNode.name;
    return typeof name === 'string' ? name : undefined;
  }
}

export const constantsFolderRequired: Rule.RuleModule = {
  'create': (context) => {
    const filename = context.physicalFilename;

    if (isExemptPath(filename)) { return {}; }

    const onProgramExit: NonNullable<Rule.RuleListener['Program:exit']> = (node) => {
      const nodeAsUnknown: unknown = node;
      if (!isObject(nodeAsUnknown)) { return; }

      const programBody: unknown = nodeAsUnknown.body;
      if (!Array.isArray(programBody)) { return; }

      const constNames: string[] = [];

      for (const statement of programBody) {
        if (!isObject(statement)) { continue; }

        const statementType: unknown = statement.type;
        let variableDeclaration: unknown = undefined;

        if (statementType === 'VariableDeclaration') {
          variableDeclaration = statement;
        } else if (statementType === 'ExportNamedDeclaration') {
          const decl: unknown = statement.declaration;

          if (isObject(decl) && decl.type === 'VariableDeclaration') {
            variableDeclaration = decl;
          }
        }

        if (!isObject(variableDeclaration)) { continue; }
        if (variableDeclaration.kind !== 'const') { continue; }

        const declarations: unknown = variableDeclaration.declarations;
        if (!Array.isArray(declarations)) { continue; }

        for (const declarator of declarations) {
          const declaratorName = DeclaratorName.get(declarator);

          if (declaratorName !== undefined && !EXEMPT_CONST_NAMES.has(declaratorName)) {
            constNames.push(declaratorName);
          }
        }
      }

      if (constNames.length > 1) {
        context.report({
          'data': {
            'count': String(constNames.length),
            'file': path.basename(filename),
            'names': constNames.join(', ')
          },
          'messageId': 'mustLiveInConstantsFolder',
          'node': node
        });
      }
    };

    return { 'Program:exit': onProgramExit };
  },
  'meta': {
    'docs': {
      'description': "Files with more than one top-level const declaration must live under a 'constants/' folder.",
      'recommended': false
    },
    'messages': {
      'mustLiveInConstantsFolder':
        "File '{{file}}' declares {{count}} top-level constants ({{names}}) but lives outside a 'constants/' folder. Move these into '<area>/constants/<Name>.ts', grouped under one exported namespace or frozen object literal."
    },
    'schema': [],
    'type': 'problem'
  }
};
