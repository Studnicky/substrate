import type { Rule } from 'eslint';

import path from 'node:path';

const DIRECTIVE_PATTERN = /^\s*json-schema-uninexpressible:\s*\S.{9,}/v;

const isInEntitiesFile = (filename: string): boolean => {
  const normalized = filename.split(path.sep).join('/');
  return normalized.includes('/entities/');
};

const isObject = (value: unknown): value is Record<string, unknown> =>
{return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);};

type CommentToken = { readonly 'type': string; readonly 'value': string };

const commentsContainDirective = (comments: readonly CommentToken[]): boolean => {
  const length = comments.length;
  for (let index = 0; index < length; index++) {
    const comment = comments[index];
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

const isFromSchemaReference = (typeAnnotation: unknown): boolean => {
  if (!isObject(typeAnnotation)) { return false; }
  if (typeAnnotation.type !== 'TSTypeReference') { return false; }
  const typeName: unknown = typeAnnotation.typeName;
  if (!isObject(typeName)) { return false; }
  return typeName.name === 'FromSchema';
};

const isBrandedIntersection = (typeAnnotation: unknown): boolean => {
  if (!isObject(typeAnnotation)) { return false; }
  if (typeAnnotation.type !== 'TSIntersectionType') { return false; }
  const types: unknown = typeAnnotation.types;
  if (!Array.isArray(types)) { return false; }

  return types.some((member: unknown) => {
    if (!isObject(member)) { return false; }
    if (member.type !== 'TSTypeLiteral') { return false; }
    const members: unknown = member.members;
    if (!Array.isArray(members)) { return false; }

    return members.some((prop: unknown) => {
      if (!isObject(prop)) { return false; }
      if (prop.type !== 'TSPropertySignature') { return false; }
      const typeAnnotationNode: unknown = prop.typeAnnotation;
      if (!isObject(typeAnnotationNode)) { return false; }
      const innerType: unknown = typeAnnotationNode.typeAnnotation;
      if (!isObject(innerType)) { return false; }
      const innerTypeAnnotation: unknown = innerType.typeAnnotation;

      return innerType.type === 'TSTypeOperator'
        && innerType.operator === 'unique'
        && isObject(innerTypeAnnotation)
        && innerTypeAnnotation.type === 'TSSymbolKeyword';
    });
  });
};

const isExemptAnnotationType = (typeAnnotation: unknown): boolean => {
  if (!isObject(typeAnnotation)) { return false; }
  const annotationType: unknown = typeAnnotation.type;

  if (
    annotationType === 'TSFunctionType'
    || annotationType === 'TSConditionalType'
    || annotationType === 'TSMappedType'
  ) {
    return true;
  }

  if (annotationType === 'TSUnionType' || annotationType === 'TSIntersectionType') {
    const types: unknown = typeAnnotation.types;
    if (!Array.isArray(types)) { return false; }

    const allNamed = types.every((member: unknown) => {
      if (!isObject(member)) { return false; }
      return member.type === 'TSTypeReference';
    });

    if (allNamed) { return true; }
  }

  if (isBrandedIntersection(typeAnnotation)) { return true; }
  if (isFromSchemaReference(typeAnnotation)) { return true; }

  return false;
};

class NodeName {
  static get(rawNode: unknown): string {
    if (!isObject(rawNode)) { return ''; }
    const idNode: unknown = rawNode.id;
    if (!isObject(idNode)) { return ''; }
    const name: unknown = idNode.name;
    return typeof name === 'string' ? name : '';
  }
}

export const typesDerivedFromSchema: Rule.RuleModule = {
  'create': (context) => {
    const filename = context.filename;
    const { sourceCode } = context;

    const onTSTypeAliasDeclaration = (node: Rule.Node): void => {
      const nodeAsUnknown: unknown = node;
      if (!isObject(nodeAsUnknown)) { return; }
      const typeAnnotation: unknown = nodeAsUnknown.typeAnnotation;
      if (!isObject(typeAnnotation) || typeAnnotation.type !== 'TSTypeLiteral') { return; }

      if (filename !== '<input>' && isInEntitiesFile(filename)) { return; }
      if (isExemptAnnotationType(typeAnnotation)) { return; }
      if (hasExemptionComment(node, sourceCode)) { return; }

      context.report({
        'data': { 'name': NodeName.get(node) },
        'messageId': 'inline-shape',
        'node': node
      });
    };

    return { 'TSTypeAliasDeclaration': onTSTypeAliasDeclaration };
  },
  'meta': {
    'docs': {
      'description': 'Disallow inline object-literal type aliases; derive data shapes from JSON Schema.',
      'recommended': false
    },
    'messages': {
      'inline-shape': "Type alias '{{name}}' declares an inline object shape '{ ... }'. Data types must be derived from JSON Schema via 'FromSchema<typeof {{name}}Schema>'. Move this shape into an entity namespace at 'entities/{{name}}Entity.ts' (export namespace {{name}}Entity { export const Schema = ...; export type Type = FromSchema<typeof Schema>; export const validate = ...; }), or — if JSON Schema cannot express this shape (function type, branded primitive, mapped type, conditional type) — add '// json-schema-uninexpressible: <reason>' immediately before the declaration with a clear justification (at least 10 characters)."
    },
    'schema': [],
    'type': 'problem'
  }
};
