import type { Rule } from 'eslint';

import type { LayerOptionsType } from '../types/LayerOptionsType.js';

import { layerOptionsSchema } from './layers/layerOptionsSchema.js';
import { LayerResolver } from './layers/LayerResolver.js';

const DIRECTIVE_PATTERN = /^\s*external-contract:\s*\S.{9,}/v;

class ObjectGuard {
  public static isNonNullObject(value: unknown): value is Record<string, unknown> {
    return value !== null && value !== undefined && typeof value === 'object';
  }
}

type CommentToken = { readonly 'type': string; readonly 'value': string };

type SourceCodeLike = { 'getCommentsBefore': (node: unknown) => readonly CommentToken[] };

class ExemptionComment {
  public static commentsContainDirective(comments: readonly CommentToken[]): boolean {
    const length = comments.length;
    for (let index = 0; index < length; index++) {
      const comment = comments[index];
      if (comment?.type === 'Line' && DIRECTIVE_PATTERN.test(comment.value)) { return true; }
    }
    return false;
  }

  public static isSourceCodeLike(value: unknown): value is SourceCodeLike {
    return ObjectGuard.isNonNullObject(value) && typeof (value as { 'getCommentsBefore'?: unknown }).getCommentsBefore === 'function';
  }

  public static has(rawNode: unknown, rawSourceCode: unknown): boolean {
    if (!ExemptionComment.isSourceCodeLike(rawSourceCode)) { return false; }
    return ExemptionComment.commentsContainDirective(rawSourceCode.getCommentsBefore(rawNode));
  }
}

class UnderscoreName {
  public static get(node: unknown): string | undefined {
    if (!ObjectGuard.isNonNullObject(node)) { return undefined; }
    if (Reflect.get(node, 'computed') === true) { return undefined; }

    const key: unknown = Reflect.get(node, 'key');
    if (!ObjectGuard.isNonNullObject(key)) { return undefined; }
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

class ViolationReporter {
  public static reportUnderscoreName(context: Rule.RuleContext, node: Rule.Node, name: string): void {
    context.report({ 'data': { 'name': name }, 'messageId': 'forbidden', 'node': node });
  }
}

class ClassMemberCheck {
  public static onClassMember(context: Rule.RuleContext, exemptionEligible: boolean, node: Record<string, unknown>): void {
    const name = UnderscoreName.get(node);
    if (name === undefined) { return; }

    if (exemptionEligible && ExemptionComment.has(node, context.sourceCode)) { return; }

    ViolationReporter.reportUnderscoreName(context, node.key as Rule.Node, name);
  }

  public static unwrapParameterIdentifier(parameter: unknown): Record<string, unknown> | undefined {
    if (!ObjectGuard.isNonNullObject(parameter)) { return undefined; }
    if (Reflect.get(parameter, 'type') !== 'AssignmentPattern') { return parameter; }

    const left: unknown = Reflect.get(parameter, 'left');
    return ObjectGuard.isNonNullObject(left) ? left : undefined;
  }

  public static isDeclaredField(node: Record<string, unknown>): boolean {
    return Reflect.get(node, 'accessibility') !== undefined || Reflect.get(node, 'readonly') === true;
  }

  public static onParameterProperty(context: Rule.RuleContext, exemptionEligible: boolean, node: unknown): void {
    if (!ObjectGuard.isNonNullObject(node)) { return; }
    if (!ClassMemberCheck.isDeclaredField(node)) { return; }

    const identifier = ClassMemberCheck.unwrapParameterIdentifier(Reflect.get(node, 'parameter'));
    if (identifier === undefined) { return; }
    if (Reflect.get(identifier, 'type') !== 'Identifier') { return; }

    const name: unknown = Reflect.get(identifier, 'name');
    if (typeof name !== 'string' || !name.startsWith('_')) { return; }

    if (exemptionEligible && ExemptionComment.has(node, context.sourceCode)) { return; }

    ViolationReporter.reportUnderscoreName(context, identifier as unknown as Rule.Node, name);
  }
}

const noUnderscorePrivateSchema = {
  'additionalProperties': false,
  'properties': { ...layerOptionsSchema.properties },
  'required': layerOptionsSchema.required,
  'type': 'object'
} as const;

export const noUnderscorePrivate: Rule.RuleModule = {
  'create': (context) => {
    const exemptionEligible = ExemptionEligibility.resolve(context);

    const onMethodDefinition = (node: unknown): void => { ClassMemberCheck.onClassMember(context, exemptionEligible, node as Record<string, unknown>); };
    const onPropertyDefinition = (node: unknown): void => { ClassMemberCheck.onClassMember(context, exemptionEligible, node as Record<string, unknown>); };
    const onTSParameterProperty = (node: unknown): void => { ClassMemberCheck.onParameterProperty(context, exemptionEligible, node); };

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
