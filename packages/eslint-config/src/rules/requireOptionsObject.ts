import type { Rule } from 'eslint';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { ObjectGuard } from './shared/ObjectGuard.js';

namespace RequireOptionsObjectOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'minimumOptionals': {
        'default': 2,
        'description': 'Minimum number of optional parameters to trigger the rule.',
        'minimum': 2,
        'type': 'number'
      }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}

const DEFAULT_MINIMUM_OPTIONALS = 2;

interface TypeScriptRuleListenerInterface extends Rule.RuleListener {
  'TSCallSignatureDeclaration': (node: Rule.Node) => void;
  'TSConstructSignatureDeclaration': (node: Rule.Node) => void;
  'TSFunctionType': (node: Rule.Node) => void;
  'TSMethodSignature': (node: Rule.Node) => void;
}

class ParamInspector {
  /**
   * Returns true when an `Identifier` param's own type annotation is a union containing
   * `undefined` (`value: T | undefined`). No `?` and no default value are present, but a caller
   * may still idiomatically omit the argument (`undefined` is a valid explicit value at every
   * call site), so this counts the same as an explicitly optional parameter.
   */
  private static hasUndefinedUnionAnnotation(param: Record<string, unknown>): boolean {
    const ann = param.typeAnnotation;
    if (!ObjectGuard.isObject(ann) || !ObjectGuard.isObject(ann.typeAnnotation)) { return false; }
    const typeAnnotation = ann.typeAnnotation;
    if (typeAnnotation.type !== 'TSUnionType' || !Array.isArray(typeAnnotation.types)) { return false; }
    const result = typeAnnotation.types.some((member) => {const result = ObjectGuard.isObject(member) && member.type === 'TSUndefinedKeyword';
      return result;});
    return result;
  }

  /**
   * A rest param typed as a tuple (`...args: [name?: string, age?: number]`) is not a single
   * non-optional unit — its own optional tuple members are exactly the kind of "caller may omit
   * this" surface the rule exists to catch. Named tuple members mark themselves via
   * `optional: true`; unnamed members wrap their element type in `TSOptionalType`.
   */
  private static tupleOptionalCount(param: Record<string, unknown>): number {
    const ann = param.typeAnnotation;
    if (!ObjectGuard.isObject(ann) || !ObjectGuard.isObject(ann.typeAnnotation)) { return 0; }
    const typeAnnotation = ann.typeAnnotation;
    if (typeAnnotation.type !== 'TSTupleType' || !Array.isArray(typeAnnotation.elementTypes)) { return 0; }

    let count = 0;
    typeAnnotation.elementTypes.forEach((element) => {
      if (!ObjectGuard.isObject(element)) { return; }
      if (element.type === 'TSNamedTupleMember' && element.optional === true) { count += 1; return; }
      if (element.type === 'TSOptionalType') { count += 1; }
    });
    return count;
  }

  /**
   * Returns how many "caller may omit" optional slots a single parameter contributes. Ordinary
   * optional parameters contribute at most one; a rest-tuple parameter can contribute several,
   * one per optional tuple member, since it is not really a single param for this rule's purposes.
   */
  public static optionalCount(param: unknown): number {
    if (!ObjectGuard.isObject(param)) { return 0; }
    if (param.type === 'RestElement') { const result = ParamInspector.tupleOptionalCount(param);
      return result; }
    if (param.type === 'ObjectPattern') { return 0; }
    if (param.type === 'AssignmentPattern') { return 1; }
    if (param.type === 'Identifier') {
      if (param.optional === true) { return 1; }
      const result = ParamInspector.hasUndefinedUnionAnnotation(param) ? 1 : 0;
      return result;
    }
    return 0;
  }

  public static isOptionsObject(param: unknown): boolean {
    if (!ObjectGuard.isObject(param)) { return false; }
    if (param.type === 'AssignmentPattern') {
      const result = ObjectGuard.isObject(param.left) && param.left.type === 'ObjectPattern';
      return result;
    }
    if (param.type === 'Identifier') {
      const ann = param.typeAnnotation;
      if (!ObjectGuard.isObject(ann) || !ObjectGuard.isObject(ann.typeAnnotation)) { return false; }
      const typeAnnotation = ann.typeAnnotation;
      if (typeAnnotation.type !== 'TSTypeLiteral' || !Array.isArray(typeAnnotation.members)) { return false; }
      // An empty `{}` or a pure index-signature literal (`{ [key: string]: unknown }`) carries
      // none of a real options object's type safety — require at least one named member.
      const result = typeAnnotation.members.some((member) => {const result = ObjectGuard.isObject(member) && (member.type === 'TSPropertySignature' || member.type === 'TSMethodSignature');
        return result;});
      return result;
    }
    return false;
  }

  public static check(
    parameters: readonly unknown[],
    context: Rule.RuleContext,
    node: Rule.Node,
    name: string,
    minimumOptionals: number
  ): void {
    let optionalsCount = 0;
    let lastOptionalParam: unknown;
    parameters.forEach((param) => {
      const contribution = ParamInspector.optionalCount(param);
      if (contribution <= 0) { return; }
      optionalsCount += contribution;
      lastOptionalParam = param;
    });

    if (optionalsCount < minimumOptionals) { return; }
    if (lastOptionalParam !== undefined && ParamInspector.isOptionsObject(lastOptionalParam)) { return; }
    context.report({
      'data': { 'count': String(optionalsCount), 'name': name },
      'messageId': 'requireOptionsObject',
      'node': node
    });
  }
}

class FunctionName {
  public static fromParent(node: Rule.Node): string {
    const parent: unknown = node.parent;
    if (!ObjectGuard.isObject(parent)) { return '(anonymous)'; }
    if (parent.type === 'VariableDeclarator' && ObjectGuard.isObject(parent.id) && parent.id.type === 'Identifier') {
      const result = typeof parent.id.name === 'string' ? parent.id.name : '(anonymous)';
      return result;
    }
    if (
      (parent.type === 'MethodDefinition' || parent.type === 'Property')
      && ObjectGuard.isObject(parent.key)
      && parent.key.type === 'Identifier'
    ) {
      const result = typeof parent.key.name === 'string' ? parent.key.name : '(anonymous)';
      return result;
    }
    return '(anonymous)';
  }
}

class FunctionNodeProperties {
  public static getIdentifierName(node: unknown): string | undefined {
    if (!ObjectGuard.isObject(node) || !ObjectGuard.isObject(node.id)) { return undefined; }
    if (node.id.type !== 'Identifier' || typeof node.id.name !== 'string') { return undefined; }
    return node.id.name;
  }

  public static getMethodName(node: unknown): string | undefined {
    if (!ObjectGuard.isObject(node) || !ObjectGuard.isObject(node.key)) { return undefined; }
    if (node.key.type !== 'Identifier' || typeof node.key.name !== 'string') { return undefined; }
    return node.key.name;
  }

  public static getParameters(node: unknown): readonly unknown[] {
    if (!ObjectGuard.isObject(node) || !Array.isArray(node.params)) { return []; }
    return node.params;
  }
}

class RuleHandlers {
  public static onArrowFunctionExpression(node: Rule.Node, context: Rule.RuleContext, minimumOptionals: number): void {
    const name = FunctionName.fromParent(node);
    ParamInspector.check(FunctionNodeProperties.getParameters(node), context, node, name, minimumOptionals);
  }

  public static onFunctionDeclaration(node: Rule.Node, context: Rule.RuleContext, minimumOptionals: number): void {
    const name = FunctionNodeProperties.getIdentifierName(node) ?? '(anonymous)';
    ParamInspector.check(FunctionNodeProperties.getParameters(node), context, node, name, minimumOptionals);
  }

  public static onFunctionExpression(node: Rule.Node, context: Rule.RuleContext, minimumOptionals: number): void {
    const name = FunctionName.fromParent(node);
    ParamInspector.check(FunctionNodeProperties.getParameters(node), context, node, name, minimumOptionals);
  }

  public static onTypeScriptSignature(node: Rule.Node, context: Rule.RuleContext, minimumOptionals: number): void {
    ParamInspector.check(FunctionNodeProperties.getParameters(node), context, node, '(anonymous)', minimumOptionals);
  }

  public static onTypeScriptMethod(node: Rule.Node, context: Rule.RuleContext, minimumOptionals: number): void {
    const name = FunctionNodeProperties.getMethodName(node) ?? '(anonymous)';
    ParamInspector.check(FunctionNodeProperties.getParameters(node), context, node, name, minimumOptionals);
  }
}

class MinimumOptionals {
  static get(rawOptions: unknown): number {
    if (!ObjectGuard.isObject(rawOptions)) { return DEFAULT_MINIMUM_OPTIONALS; }
    const value = rawOptions.minimumOptionals;
    const result = typeof value === 'number' && Number.isInteger(value) && value >= 2
      ? value
      : DEFAULT_MINIMUM_OPTIONALS;
    return result;
  }
}

export const requireOptionsObject: Rule.RuleModule = {
  'create': (context) => {
    const minimumOptionals = MinimumOptionals.get(context.options.at(0));

    const arrowFunctionHandler = (node: Rule.Node): void => { RuleHandlers.onArrowFunctionExpression(node, context, minimumOptionals); };
    const functionDeclarationHandler = (node: Rule.Node): void => { RuleHandlers.onFunctionDeclaration(node, context, minimumOptionals); };
    const functionExpressionHandler = (node: Rule.Node): void => { RuleHandlers.onFunctionExpression(node, context, minimumOptionals); };
    const typeScriptMethodHandler = (node: Rule.Node): void => { RuleHandlers.onTypeScriptMethod(node, context, minimumOptionals); };
    const typeScriptSignatureHandler = (node: Rule.Node): void => { RuleHandlers.onTypeScriptSignature(node, context, minimumOptionals); };

    const listener: TypeScriptRuleListenerInterface = {
      'ArrowFunctionExpression': arrowFunctionHandler,
      'FunctionDeclaration': functionDeclarationHandler,
      'FunctionExpression': functionExpressionHandler,
      'TSCallSignatureDeclaration': typeScriptSignatureHandler,
      'TSConstructSignatureDeclaration': typeScriptSignatureHandler,
      'TSFunctionType': typeScriptSignatureHandler,
      'TSMethodSignature': typeScriptMethodHandler
    };

    return listener;
  },
  'meta': {
    'docs': {
      'description': 'Require 2+ optional parameters to be collected into a single trailing options object.',
      'recommended': false
    },
    'messages': {
      'requireOptionsObject': "Callable '{{name}}' has {{count}} optional parameters. Collect them into a single trailing options object: '{{name}}(required, options?: { fieldA?, fieldB? })'."
    },
    'schema': [RequireOptionsObjectOptionsEntity.Schema],
    'type': 'suggestion'
  }
};
