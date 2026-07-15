import type { Rule } from 'eslint';

import type { LayerOptionsType } from '../types/LayerOptionsType.js';

import { layerOptionsSchema } from './layers/layerOptionsSchema.js';
import { LayerResolver } from './layers/LayerResolver.js';

const DIRECTIVE_PATTERN = /^\s*external-contract:\s*\S.{9,}/v;

const isNonNullObject = (value: unknown): value is Record<string, unknown> =>
{return value !== null && value !== undefined && typeof value === 'object';};

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
{return isNonNullObject(value) && typeof (value as { 'getCommentsBefore'?: unknown }).getCommentsBefore === 'function';};

const hasExemptionComment = (rawNode: unknown, rawSourceCode: unknown): boolean => {
  if (!isSourceCodeLike(rawSourceCode)) { return false; }
  return commentsContainDirective(rawSourceCode.getCommentsBefore(rawNode));
};

class UnderscoreName {
  public static get(node: unknown): string | undefined {
    if (!isNonNullObject(node)) { return undefined; }
    if (Reflect.get(node, 'computed') === true) { return undefined; }

    const key: unknown = Reflect.get(node, 'key');
    if (!isNonNullObject(key)) { return undefined; }
    if (Reflect.get(key, 'type') !== 'Identifier') { return undefined; }

    const name: unknown = Reflect.get(key, 'name');
    if (typeof name !== 'string' || !name.startsWith('_')) { return undefined; }

    return name;
  }
}

class ExemptionEligibility {
  public static resolve(context: Rule.RuleContext): boolean {
    const options = (context.options as unknown[]).at(0) as LayerOptionsType | undefined;
    if (options === undefined) { return false; }

    const layer = LayerResolver.layerForPath(context.physicalFilename, options);
    return layer === 'adapters' || layer === 'ports';
  }
}

const reportUnderscoreName = (context: Rule.RuleContext, node: Rule.Node, name: string): void => {
  context.report({ 'data': { 'name': name }, 'messageId': 'forbidden', 'node': node });
};

const onClassMember = (context: Rule.RuleContext, exemptionEligible: boolean, node: Record<string, unknown>): void => {
  const name = UnderscoreName.get(node);
  if (name === undefined) { return; }

  if (exemptionEligible && hasExemptionComment(node, context.sourceCode)) { return; }

  reportUnderscoreName(context, node.key as Rule.Node, name);
};

const unwrapParameterIdentifier = (parameter: unknown): Record<string, unknown> | undefined => {
  if (!isNonNullObject(parameter)) { return undefined; }
  if (Reflect.get(parameter, 'type') !== 'AssignmentPattern') { return parameter; }

  const left: unknown = Reflect.get(parameter, 'left');
  return isNonNullObject(left) ? left : undefined;
};

const isDeclaredField = (node: Record<string, unknown>): boolean => {
  return Reflect.get(node, 'accessibility') !== undefined || Reflect.get(node, 'readonly') === true;
};

const onParameterProperty = (context: Rule.RuleContext, exemptionEligible: boolean, node: unknown): void => {
  if (!isNonNullObject(node)) { return; }
  if (!isDeclaredField(node)) { return; }

  const identifier = unwrapParameterIdentifier(Reflect.get(node, 'parameter'));
  if (identifier === undefined) { return; }
  if (Reflect.get(identifier, 'type') !== 'Identifier') { return; }

  const name: unknown = Reflect.get(identifier, 'name');
  if (typeof name !== 'string' || !name.startsWith('_')) { return; }

  if (exemptionEligible && hasExemptionComment(node, context.sourceCode)) { return; }

  reportUnderscoreName(context, identifier as unknown as Rule.Node, name);
};

const noUnderscorePrivateSchema = {
  'additionalProperties': false,
  'properties': { ...layerOptionsSchema.properties },
  'required': layerOptionsSchema.required,
  'type': 'object'
} as const;

export const noUnderscorePrivate: Rule.RuleModule = {
  'create': (context) => {
    const exemptionEligible = ExemptionEligibility.resolve(context);

    const onMethodDefinition = (node: unknown): void => { onClassMember(context, exemptionEligible, node as Record<string, unknown>); };
    const onPropertyDefinition = (node: unknown): void => { onClassMember(context, exemptionEligible, node as Record<string, unknown>); };
    const onTSParameterProperty = (node: unknown): void => { onParameterProperty(context, exemptionEligible, node); };

    return {
      'MethodDefinition': onMethodDefinition,
      'PropertyDefinition': onPropertyDefinition,
      'TSParameterProperty': onTSParameterProperty
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow underscore-prefixed class members; use real `#private` fields/methods instead.',
      'recommended': false
    },
    'messages': {
      'forbidden': '"{{name}}" uses the underscore-private convention. Use a real `#{{name}}`-style private field or method instead.'
    },
    'schema': [noUnderscorePrivateSchema],
    'type': 'problem'
  }
};
