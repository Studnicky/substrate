import type { Rule } from 'eslint';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { ObjectGuard } from './shared/ObjectGuard.js';

namespace RequireOptionsObjectOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'minOptionals': {
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

const DEFAULT_MIN_OPTIONALS = 2;

interface TypeScriptRuleListenerInterface extends Rule.RuleListener {
  'TSCallSignatureDeclaration': (node: Rule.Node) => void;
  'TSConstructSignatureDeclaration': (node: Rule.Node) => void;
  'TSFunctionType': (node: Rule.Node) => void;
  'TSMethodSignature': (node: Rule.Node) => void;
}

class ParamInspector {
  public static isOptional(param: unknown): boolean {
    if (!ObjectGuard.isObject(param)) { return false; }
    if (param.type === 'RestElement') { return false; }
    if (param.type === 'ObjectPattern') { return false; }
    if (param.type === 'AssignmentPattern') { return true; }
    if (param.type === 'Identifier') {
      return param.optional === true;
    }
    return false;
  }

  public static isOptionsObject(param: unknown): boolean {
    if (!ObjectGuard.isObject(param)) { return false; }
    if (param.type === 'AssignmentPattern') {
      return ObjectGuard.isObject(param.left) && param.left.type === 'ObjectPattern';
    }
    if (param.type === 'Identifier') {
      const ann = param.typeAnnotation;
      if (!ObjectGuard.isObject(ann) || !ObjectGuard.isObject(ann.typeAnnotation)) { return false; }
      return ann.typeAnnotation.type === 'TSTypeLiteral';
    }
    return false;
  }

  public static check(
    params: readonly unknown[],
    context: Rule.RuleContext,
    node: Rule.Node,
    name: string,
    minOptionals: number
  ): void {
    const optionals = params.filter(ParamInspector.isOptional);
    if (optionals.length < minOptionals) { return; }
    const lastOptional = optionals[optionals.length - 1];
    if (lastOptional !== undefined && ParamInspector.isOptionsObject(lastOptional)) { return; }
    context.report({
      'data': { 'count': String(optionals.length), 'name': name },
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
      return typeof parent.id.name === 'string' ? parent.id.name : '(anonymous)';
    }
    if (
      (parent.type === 'MethodDefinition' || parent.type === 'Property')
      && ObjectGuard.isObject(parent.key)
      && parent.key.type === 'Identifier'
    ) {
      return typeof parent.key.name === 'string' ? parent.key.name : '(anonymous)';
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

  public static getParams(node: unknown): readonly unknown[] {
    if (!ObjectGuard.isObject(node) || !Array.isArray(node.params)) { return []; }
    return node.params;
  }
}

class RuleHandlers {
  public static onArrowFunctionExpression(node: Rule.Node, context: Rule.RuleContext, minOptionals: number): void {
    const name = FunctionName.fromParent(node);
    ParamInspector.check(FunctionNodeProperties.getParams(node), context, node, name, minOptionals);
  }

  public static onFunctionDeclaration(node: Rule.Node, context: Rule.RuleContext, minOptionals: number): void {
    const name = FunctionNodeProperties.getIdentifierName(node) ?? '(anonymous)';
    ParamInspector.check(FunctionNodeProperties.getParams(node), context, node, name, minOptionals);
  }

  public static onFunctionExpression(node: Rule.Node, context: Rule.RuleContext, minOptionals: number): void {
    const name = FunctionName.fromParent(node);
    ParamInspector.check(FunctionNodeProperties.getParams(node), context, node, name, minOptionals);
  }

  public static onTypeScriptSignature(node: Rule.Node, context: Rule.RuleContext, minOptionals: number): void {
    ParamInspector.check(FunctionNodeProperties.getParams(node), context, node, '(anonymous)', minOptionals);
  }

  public static onTypeScriptMethod(node: Rule.Node, context: Rule.RuleContext, minOptionals: number): void {
    const name = FunctionNodeProperties.getMethodName(node) ?? '(anonymous)';
    ParamInspector.check(FunctionNodeProperties.getParams(node), context, node, name, minOptionals);
  }
}

class MinOptionals {
  static get(rawOptions: unknown): number {
    if (!ObjectGuard.isObject(rawOptions)) { return DEFAULT_MIN_OPTIONALS; }
    const value = rawOptions.minOptionals;
    return typeof value === 'number' && Number.isInteger(value) && value >= 2
      ? value
      : DEFAULT_MIN_OPTIONALS;
  }
}

export const requireOptionsObject: Rule.RuleModule = {
  'create': (context) => {
    const minOptionals = MinOptionals.get(context.options.at(0));

    const arrowFunctionHandler = (node: Rule.Node): void => { RuleHandlers.onArrowFunctionExpression(node, context, minOptionals); };
    const functionDeclarationHandler = (node: Rule.Node): void => { RuleHandlers.onFunctionDeclaration(node, context, minOptionals); };
    const functionExpressionHandler = (node: Rule.Node): void => { RuleHandlers.onFunctionExpression(node, context, minOptionals); };
    const typeScriptMethodHandler = (node: Rule.Node): void => { RuleHandlers.onTypeScriptMethod(node, context, minOptionals); };
    const typeScriptSignatureHandler = (node: Rule.Node): void => { RuleHandlers.onTypeScriptSignature(node, context, minOptionals); };

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
