import type { JSSyntaxElement, Rule } from 'eslint';

type OptionsType = {
  readonly 'minOptionals': number;
};

const DEFAULT_MIN_OPTIONALS = 2;

type AssignmentPatternNode = {
  readonly 'left': { readonly 'type': string };
  readonly 'type': 'AssignmentPattern';
};

type IdentifierNode = {
  readonly 'optional'?: boolean;
  readonly 'type': 'Identifier';
  readonly 'typeAnnotation'?: { readonly 'typeAnnotation': { readonly 'type': string } } | null;
};

type ObjectPatternNode = { readonly 'type': 'ObjectPattern' };
type RestElementNode = { readonly 'type': 'RestElement' };

type ParamType = AssignmentPatternNode | IdentifierNode | ObjectPatternNode | RestElementNode | { readonly 'type': string };

type FunctionLikeNode = {
  readonly 'id'?: { readonly 'name': string } | null;
  readonly 'params': readonly ParamType[];
};

type ParentNode = JSSyntaxElement & {
  readonly 'id'?: { readonly 'name': string; readonly 'type': string };
  readonly 'key'?: { readonly 'name': string; readonly 'type': string };
};

class ParamInspector {
  public static isOptional(param: ParamType): boolean {
    if (param.type === 'RestElement') { return false; }
    if (param.type === 'ObjectPattern') { return false; }
    if (param.type === 'AssignmentPattern') { return true; }
    if (param.type === 'Identifier') {
      const p = param as IdentifierNode;
      return p.optional === true;
    }
    return false;
  }

  public static isOptionsObject(param: ParamType): boolean {
    if (param.type === 'AssignmentPattern') {
      const p = param as AssignmentPatternNode;
      return p.left.type === 'ObjectPattern';
    }
    if (param.type === 'Identifier') {
      const p = param as IdentifierNode;
      const ann = p.typeAnnotation;
      if (ann === undefined || ann === null) { return false; }
      return ann.typeAnnotation.type === 'TSTypeLiteral';
    }
    return false;
  }

  public static check(
    params: readonly ParamType[],
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
    const parent = node.parent as unknown as ParentNode;
    if (parent.type === 'VariableDeclarator' && parent.id?.type === 'Identifier') {
      return parent.id.name;
    }
    if ((parent.type === 'MethodDefinition' || parent.type === 'Property') && parent.key?.type === 'Identifier') {
      return parent.key.name;
    }
    return '(anonymous)';
  }
}

const onArrowFunctionExpression = (node: Rule.Node, context: Rule.RuleContext, minOptionals: number): void => {
  const n = node as unknown as FunctionLikeNode;
  const name = FunctionName.fromParent(node);
  ParamInspector.check(n.params, context, node, name, minOptionals);
};

const onFunctionDeclaration = (node: Rule.Node, context: Rule.RuleContext, minOptionals: number): void => {
  const n = node as unknown as FunctionLikeNode;
  const name = n.id?.name ?? '(anonymous)';
  ParamInspector.check(n.params, context, node, name, minOptionals);
};

const onFunctionExpression = (node: Rule.Node, context: Rule.RuleContext, minOptionals: number): void => {
  const n = node as unknown as FunctionLikeNode;
  const name = FunctionName.fromParent(node);
  ParamInspector.check(n.params, context, node, name, minOptionals);
};

type TSNodeWithParams = {
  readonly 'key'?: { readonly 'name'?: string; readonly 'type': string };
  readonly 'params': readonly ParamType[];
};

class MinOptionals {
  static get(rawOptions: Partial<OptionsType> | undefined): number {
    return rawOptions?.minOptionals ?? DEFAULT_MIN_OPTIONALS;
  }
}

export const requireOptionsObject: Rule.RuleModule = {
  'create': (context) => {
    const [firstOption] = (context.options as readonly unknown[]);
    const rawOptions = firstOption as Partial<OptionsType> | undefined;
    const minOptionals = MinOptionals.get(rawOptions);

    const arrowFunctionHandler = (node: Rule.Node): void => { onArrowFunctionExpression(node, context, minOptionals); };
    const functionDeclarationHandler = (node: Rule.Node): void => { onFunctionDeclaration(node, context, minOptionals); };
    const functionExpressionHandler = (node: Rule.Node): void => { onFunctionExpression(node, context, minOptionals); };

    const listener: Rule.RuleListener = {
      'ArrowFunctionExpression': arrowFunctionHandler,
      'FunctionDeclaration': functionDeclarationHandler,
      'FunctionExpression': functionExpressionHandler
    };

    const tsListener = listener as Record<string, (node: Rule.Node) => void>;

    tsListener.TSCallSignatureDeclaration = (node) => {
      const n = node as unknown as TSNodeWithParams;
      ParamInspector.check(n.params, context, node, '(anonymous)', minOptionals);
    };
    tsListener.TSConstructSignatureDeclaration = (node) => {
      const n = node as unknown as TSNodeWithParams;
      ParamInspector.check(n.params, context, node, '(anonymous)', minOptionals);
    };
    tsListener.TSMethodSignature = (node) => {
      const n = node as unknown as TSNodeWithParams;
      const name = n.key?.type === 'Identifier' ? (n.key.name ?? '(anonymous)') : '(anonymous)';
      ParamInspector.check(n.params, context, node, name, minOptionals);
    };

    return listener;
  },
  'meta': {
    'docs': {
      'description': 'Require 2+ optional parameters to be collected into a single trailing options object.',
      'recommended': false
    },
    'messages': {
      'requireOptionsObject': "Callable '{{name}}' has {{count}} optional parameters. Collect them into a single trailing options object: '{{name}}(required, opts?: { optA?, optB? })'."
    },
    'schema': [
      {
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
      }
    ],
    'type': 'suggestion'
  }
};
