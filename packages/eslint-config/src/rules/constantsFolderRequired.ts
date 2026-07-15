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

class PathGuards {
  static isExemptPath(filename: string): boolean {
    if (filename === '<input>' || filename.length === 0) { return true; }

    const normalized = filename.split(path.sep).join('/');

    return EXEMPT_PATH_PATTERNS.some((pattern) => { const result = pattern.test(normalized);
      return result; });
  }
}

class TypeGuards {
  static isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
  }
}

const FUNCTION_LIKE_INIT_TYPES = new Set([
  'ArrowFunctionExpression',
  'ClassExpression',
  'FunctionExpression'
]);

class DeclaratorName {
  static collectPatternNames(patternNode: unknown, names: string[]): void {
    if (!TypeGuards.isObject(patternNode)) { return; }

    const nodeType: unknown = patternNode.type;

    if (nodeType === 'Identifier') {
      const name: unknown = patternNode.name;
      if (typeof name === 'string') { names.push(name); }
      return;
    }

    if (nodeType === 'AssignmentPattern') {
      DeclaratorName.collectPatternNames(patternNode.left, names);
      return;
    }

    if (nodeType === 'RestElement') {
      DeclaratorName.collectPatternNames(patternNode.argument, names);
      return;
    }

    if (nodeType === 'ObjectPattern') {
      const properties: unknown = patternNode.properties;
      if (!Array.isArray(properties)) { return; }

      for (const property of properties) {
        if (!TypeGuards.isObject(property)) { continue; }

        if (property.type === 'RestElement') {
          DeclaratorName.collectPatternNames(property.argument, names);
          continue;
        }

        DeclaratorName.collectPatternNames(property.value, names);
      }
      return;
    }

    if (nodeType === 'ArrayPattern') {
      const elements: unknown = patternNode.elements;
      if (!Array.isArray(elements)) { return; }

      for (const element of elements) {
        if (element === null) { continue; }
        DeclaratorName.collectPatternNames(element, names);
      }
    }
  }

  static getAll(declarator: unknown): string[] {
    if (!TypeGuards.isObject(declarator)) { return []; }

    const names: string[] = [];
    DeclaratorName.collectPatternNames(declarator.id, names);
    return names;
  }

  static isFunctionLikeInit(declarator: unknown): boolean {
    if (!TypeGuards.isObject(declarator)) { return false; }

    const initNode: unknown = declarator.init;
    if (!TypeGuards.isObject(initNode)) { return false; }

    const initType: unknown = initNode.type;
    return typeof initType === 'string' && FUNCTION_LIKE_INIT_TYPES.has(initType);
  }
}

export const constantsFolderRequired: Rule.RuleModule = {
  'create': (context) => {
    const filename = context.physicalFilename;

    if (PathGuards.isExemptPath(filename)) { return {}; }

    const onProgramExit: NonNullable<Rule.RuleListener['Program:exit']> = (node) => {
      const nodeAsUnknown: unknown = node;
      if (!TypeGuards.isObject(nodeAsUnknown)) { return; }

      const programBody: unknown = nodeAsUnknown.body;
      if (!Array.isArray(programBody)) { return; }

      const constNames: string[] = [];

      for (const statement of programBody) {
        if (!TypeGuards.isObject(statement)) { continue; }

        const statementType: unknown = statement.type;
        let variableDeclaration: unknown = undefined;

        if (statementType === 'VariableDeclaration') {
          variableDeclaration = statement;
        } else if (statementType === 'ExportNamedDeclaration') {
          const decl: unknown = statement.declaration;

          if (TypeGuards.isObject(decl) && decl.type === 'VariableDeclaration') {
            variableDeclaration = decl;
          }
        }

        if (!TypeGuards.isObject(variableDeclaration)) { continue; }
        if (variableDeclaration.kind !== 'const') { continue; }

        const declarations: unknown = variableDeclaration.declarations;
        if (!Array.isArray(declarations)) { continue; }

        for (const declarator of declarations) {
          if (DeclaratorName.isFunctionLikeInit(declarator)) { continue; }

          const declaratorNames = DeclaratorName.getAll(declarator);

          for (const declaratorName of declaratorNames) {
            if (!EXEMPT_CONST_NAMES.has(declaratorName)) {
              constNames.push(declaratorName);
            }
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
