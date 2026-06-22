import type { Rule } from 'eslint';

import path from 'node:path';

const ENTITY_FILE_REGEX = /Entity\.[cm]?[tj]sx?$/v;
const ENTITY_DIR_REGEX = /\/entities\//v;

const isEntityFile = (filename: string): boolean => {
  const normalized = filename.split(path.sep).join('/');
  return ENTITY_FILE_REGEX.test(normalized) || ENTITY_DIR_REGEX.test(normalized);
};

const getEntityBaseName = (filename: string): string => {
  return path.basename(filename).replace(/\.[cm]?[tj]sx?$/v, '');
};

const isJsonObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const getNodeType = (node: unknown): string | undefined => {
  if (!isJsonObject(node)) { return undefined; }
  const { type } = node;
  return typeof type === 'string' ? type : undefined;
};

const getIdName = (node: unknown): string | undefined => {
  if (!isJsonObject(node)) { return undefined; }
  const { id } = node;
  if (!isJsonObject(id)) { return undefined; }
  const { name } = id;
  return typeof name === 'string' ? name : undefined;
};

const getDeclaration = (node: unknown): unknown => {
  if (!isJsonObject(node)) { return undefined; }
  return node.declaration;
};

type NamespaceMembersType = {
  'hasSchema': boolean;
  'hasType': boolean;
  'hasValidate': boolean;
};

const scanNamespaceBody = (bodyNode: unknown): NamespaceMembersType => {
  const result: NamespaceMembersType = { 'hasSchema': false, 'hasType': false, 'hasValidate': false };

  if (!isJsonObject(bodyNode)) { return result; }
  const { body } = bodyNode;
  if (!Array.isArray(body)) { return result; }

  const bodyLen = body.length;
  for (let i = 0; i < bodyLen; i += 1) {
    const stmt = body[i];
    if (getNodeType(stmt) !== 'ExportNamedDeclaration') { continue; }
    const decl = getDeclaration(stmt);
    const declType = getNodeType(decl);

    if (declType === 'VariableDeclaration') {
      if (!isJsonObject(decl)) { continue; }
      const { declarations } = decl;
      if (!Array.isArray(declarations)) { continue; }
      const declsLen = declarations.length;
      for (let di = 0; di < declsLen; di += 1) {
        const d = declarations[di];
        if (!isJsonObject(d) || !isJsonObject(d.id)) { continue; }
        const { name } = d.id;
        if (name === 'Schema') { result.hasSchema = true; }
        if (name === 'validate') { result.hasValidate = true; }
      }
    } else if (declType === 'TSTypeAliasDeclaration') {
      if (getIdName(decl) === 'Type') { result.hasType = true; }
    } else if (declType === 'FunctionDeclaration') {
      if (getIdName(decl) === 'validate') { result.hasValidate = true; }
    }
  }

  return result;
};

const createEntityNamespace: NonNullable<Rule.RuleModule['create']> = (context) => {
  const { filename } = context;

  if (filename === '<input>' || !isEntityFile(filename)) { return {}; }

  const expectedName = getEntityBaseName(filename);

  return {
    'Program:exit': (program) => {
      const body = Array.isArray(program.body) ? program.body : [];

      const namespaceExports = (body as unknown[]).filter((stmt) => {
        if (getNodeType(stmt) !== 'ExportNamedDeclaration') { return false; }
        return getNodeType(getDeclaration(stmt)) === 'TSModuleDeclaration';
      });

      if (namespaceExports.length === 0) {
        context.report({ 'messageId': 'noNamespace', 'node': program });
        return;
      }

      const exportsLen = namespaceExports.length;
      for (let ei = 0; ei < exportsLen; ei += 1) {
        const exportStmt = namespaceExports[ei];
        const decl = getDeclaration(exportStmt);
        if (!isJsonObject(decl)) { continue; }

        const nsName = getIdName(decl);
        if (nsName !== expectedName) {
          context.report({
            'data': { 'expected': expectedName, 'found': nsName ?? '(unknown)' },
            'messageId': 'namespaceMismatch',
            'node': exportStmt as Rule.Node
          });
        }

        const members = scanNamespaceBody(decl.body);
        const reportNode = exportStmt as Rule.Node;

        if (!members.hasSchema) { context.report({ 'messageId': 'missingSchema', 'node': reportNode }); }
        if (!members.hasType) { context.report({ 'messageId': 'missingType', 'node': reportNode }); }
        if (!members.hasValidate) { context.report({ 'messageId': 'missingValidate', 'node': reportNode }); }
      }
    }
  };
};

export const entityNamespace: Rule.RuleModule = {
  'create': createEntityNamespace,
  'meta': {
    'docs': {
      'description': 'Entity files must export a single namespace containing Schema (const), Type (from FromSchema), and validate (type guard).',
      'recommended': false
    },
    'messages': {
      'missingSchema': 'Entity namespace must export `const Schema` — a JSON Schema object literal declared `as const`.',
      'missingType': 'Entity namespace must export `type Type` derived via `FromSchema<typeof Schema>`.',
      'missingValidate': 'Entity namespace must export `function validate(candidate: unknown): candidate is Type`.',
      'namespaceMismatch': 'Namespace name `{{found}}` must match the filename base `{{expected}}`.',
      'noNamespace': 'Entity files must export exactly one namespace (e.g. `export namespace XxxEntity { ... }`).'
    },
    'schema': [],
    'type': 'problem'
  }
};
