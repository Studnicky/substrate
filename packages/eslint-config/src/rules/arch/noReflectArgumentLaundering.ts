import type { Rule } from 'eslint';

import ts from 'typescript';

import { AstHelpers } from '../shared/astHelpers.js';

// `Reflect.apply`/`Reflect.construct` accept `args: any[]`, so calling a typed function or
// constructor through them skips the argument check a direct call would get — a cast in other
// syntax. Their return type is also `any`; letting that `any` flow anywhere but an
// `unknown`-typed binding, parameter, or return smuggles it back into typed code unchecked.

interface ReflectCallInterface {
  readonly 'argumentsExpression': ts.Expression;
  readonly 'isConstruct': boolean;
  readonly 'target': ts.Expression;
}

class ReflectCallShape {
  public static classify(node: ts.CallExpression): ReflectCallInterface | undefined {
    const callee = node.expression;

    if (!ts.isPropertyAccessExpression(callee) || !ts.isIdentifier(callee.expression) || callee.expression.text !== 'Reflect') {
      return undefined;
    }

    const isConstruct = callee.name.text === 'construct';

    if (!isConstruct && callee.name.text !== 'apply') {
      return undefined;
    }

    const target = node.arguments[0];
    const argumentsExpression = node.arguments[isConstruct ? 1 : 2];

    if (target === undefined || argumentsExpression === undefined) {
      return undefined;
    }

    const result: ReflectCallInterface = { 'argumentsExpression': argumentsExpression, 'isConstruct': isConstruct, 'target': target };

    return result;
  }
}

class ArgumentListTypes {
  public static resolve(expression: ts.Expression, checker: ts.TypeChecker): readonly ts.Type[] | undefined {
    if (ts.isArrayLiteralExpression(expression)) {
      const result = ArgumentListTypes.fromArrayLiteral(expression, checker);

      return result;
    }

    const type = checker.getTypeAtLocation(expression);

    if (!checker.isTupleType(type) || !AstHelpers.isTypeReference(type)) {
      return undefined;
    }

    const result = checker.getTypeArguments(type);

    return result;
  }

  private static fromArrayLiteral(expression: ts.ArrayLiteralExpression, checker: ts.TypeChecker): readonly ts.Type[] | undefined {
    const result: ts.Type[] = [];
    const elementCount = expression.elements.length;

    for (let index = 0; index < elementCount; index += 1) {
      const element = expression.elements[index];

      if (element === undefined || ts.isSpreadElement(element)) {
        return undefined;
      }

      result.push(checker.getTypeAtLocation(element));
    }

    return result;
  }
}

interface ArityInterface {
  readonly 'fixedCount': number;
  readonly 'hasRest': boolean;
  readonly 'requiredCount': number;
}

class SignatureMatch {
  public static satisfiedByAny(signatures: readonly ts.Signature[], argumentTypes: readonly ts.Type[], checker: ts.TypeChecker): boolean {
    const signatureCount = signatures.length;

    for (let index = 0; index < signatureCount; index += 1) {
      const signature = signatures[index];

      if (signature !== undefined && SignatureMatch.satisfies(signature, argumentTypes, checker)) {
        return true;
      }
    }

    return false;
  }

  private static satisfies(signature: ts.Signature, argumentTypes: readonly ts.Type[], checker: ts.TypeChecker): boolean {
    const parameters = (signature.declaration?.parameters ?? []).filter(ts.isParameter);
    const arity = SignatureMatch.arityOf(parameters);

    if (argumentTypes.length < arity.requiredCount || (!arity.hasRest && argumentTypes.length > parameters.length)) {
      return false;
    }

    const signatureParameters = signature.getParameters();

    if (!SignatureMatch.fixedParametersAccept(signatureParameters, argumentTypes, arity.fixedCount, checker)) {
      return false;
    }

    const result = !arity.hasRest || SignatureMatch.restParameterAccepts(signatureParameters[arity.fixedCount], argumentTypes, arity.fixedCount, checker);

    return result;
  }

  private static arityOf(parameters: readonly ts.ParameterDeclaration[]): ArityInterface {
    const lastParameter = parameters.at(-1);
    const hasRest = lastParameter?.dotDotDotToken !== undefined;
    const fixedCount = hasRest ? parameters.length - 1 : parameters.length;
    let requiredCount = 0;
    const parameterCount = parameters.length;

    for (let index = 0; index < parameterCount; index += 1) {
      const parameter = parameters[index];

      if (parameter?.questionToken === undefined && parameter?.initializer === undefined && parameter?.dotDotDotToken === undefined) {
        requiredCount += 1;
      }
    }

    return { 'fixedCount': fixedCount, 'hasRest': hasRest, 'requiredCount': requiredCount };
  }

  private static fixedParametersAccept(signatureParameters: readonly ts.Symbol[], argumentTypes: readonly ts.Type[], fixedCount: number, checker: ts.TypeChecker): boolean {
    const comparableCount = Math.min(fixedCount, argumentTypes.length);

    for (let index = 0; index < comparableCount; index += 1) {
      const parameterSymbol = signatureParameters[index];
      const argumentType = argumentTypes[index];

      if (parameterSymbol !== undefined && argumentType !== undefined && !SignatureMatch.parameterAccepts(parameterSymbol, argumentType, checker)) {
        return false;
      }
    }

    return true;
  }

  private static restParameterAccepts(restParameterSymbol: ts.Symbol | undefined, argumentTypes: readonly ts.Type[], fixedCount: number, checker: ts.TypeChecker): boolean {
    const restType = SignatureMatch.restElementType(restParameterSymbol, checker);

    if (restType === undefined) {
      return true;
    }

    const argumentCount = argumentTypes.length;

    for (let index = fixedCount; index < argumentCount; index += 1) {
      const argumentType = argumentTypes[index];

      if (argumentType !== undefined && !checker.isTypeAssignableTo(argumentType, restType)) {
        return false;
      }
    }

    return true;
  }

  private static parameterAccepts(parameterSymbol: ts.Symbol, argumentType: ts.Type, checker: ts.TypeChecker): boolean {
    if (parameterSymbol.valueDeclaration === undefined) {
      return true;
    }

    const parameterType = checker.getTypeOfSymbolAtLocation(parameterSymbol, parameterSymbol.valueDeclaration);
    const result = checker.isTypeAssignableTo(argumentType, parameterType);

    return result;
  }

  private static restElementType(parameterSymbol: ts.Symbol | undefined, checker: ts.TypeChecker): ts.Type | undefined {
    if (parameterSymbol?.valueDeclaration === undefined) {
      return undefined;
    }

    const restType = checker.getTypeOfSymbolAtLocation(parameterSymbol, parameterSymbol.valueDeclaration);

    if (!checker.isArrayType(restType) || !AstHelpers.isTypeReference(restType)) {
      return undefined;
    }

    const result = checker.getTypeArguments(restType).at(0);

    return result;
  }
}

class ResultFlowShape {
  public static isUnknown(type: ts.Type): boolean {
    const result = (type.flags & ts.TypeFlags.Unknown) !== 0;

    return result;
  }

  public static provenUnknownSink(call: ts.CallExpression, checker: ts.TypeChecker): boolean {
    let current: ts.Node = call;
    let parent = current.parent;

    while (ts.isParenthesizedExpression(parent)) {
      current = parent;
      parent = parent.parent;
    }

    if (ts.isVariableDeclaration(parent) && parent.type !== undefined) {
      const result = ResultFlowShape.isUnknown(checker.getTypeFromTypeNode(parent.type));

      return result;
    }

    if (ts.isReturnStatement(parent)) {
      const result = ResultFlowShape.provenReturnSink(parent, checker);

      return result;
    }

    if (ts.isCallExpression(parent) || ts.isNewExpression(parent)) {
      const result = ResultFlowShape.provenParameterSink(parent, current, checker);

      return result;
    }

    return false;
  }

  private static provenReturnSink(statement: ts.ReturnStatement, checker: ts.TypeChecker): boolean {
    let owner: ts.Node | undefined = statement.parent;

    while (owner !== undefined && !ts.isFunctionLike(owner)) {
      owner = owner.parent;
    }

    if (owner?.type === undefined) {
      return false;
    }

    const result = ResultFlowShape.isUnknown(checker.getTypeFromTypeNode(owner.type));

    return result;
  }

  private static provenParameterSink(call: ts.CallExpression | ts.NewExpression, argument: ts.Node, checker: ts.TypeChecker): boolean {
    const argumentList = call.arguments;
    const argumentIndex = ResultFlowShape.indexOf(argumentList, argument);

    if (argumentIndex < 0) {
      return false;
    }

    const calleeType = checker.getTypeAtLocation(call.expression);
    const signatures = ts.isNewExpression(call) ? calleeType.getConstructSignatures() : calleeType.getCallSignatures();
    const signatureCount = signatures.length;

    for (let index = 0; index < signatureCount; index += 1) {
      const signature = signatures[index];
      const parameterSymbol = signature?.getParameters()[argumentIndex];

      if (parameterSymbol?.valueDeclaration === undefined) {
        continue;
      }

      const parameterType = checker.getTypeOfSymbolAtLocation(parameterSymbol, parameterSymbol.valueDeclaration);

      if (ResultFlowShape.isUnknown(parameterType)) {
        return true;
      }
    }

    return false;
  }

  private static indexOf(argumentList: ts.NodeArray<ts.Expression> | undefined, argument: ts.Node): number {
    const notFound = -1;

    if (argumentList === undefined) {
      return notFound;
    }

    const argumentCount = argumentList.length;

    for (let index = 0; index < argumentCount; index += 1) {
      if (argumentList[index] === argument) {
        return index;
      }
    }

    return notFound;
  }
}

class ReflectLaunderingCheck {
  public static inspect(node: Rule.Node, context: Rule.RuleContext): void {
    const servicesUnknown: unknown = context.sourceCode.parserServices;

    if (!AstHelpers.hasTypeServices(servicesUnknown)) {
      return;
    }

    const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(node);

    if (tsNode === undefined || !ts.isCallExpression(tsNode)) {
      return;
    }

    const call = ReflectCallShape.classify(tsNode);

    if (call === undefined) {
      return;
    }

    const checker = servicesUnknown.program.getTypeChecker();

    if (!ReflectLaunderingCheck.argumentsProven(call, checker)) {
      context.report({ 'messageId': 'unassignableArguments', 'node': node });
    }

    if (!ResultFlowShape.provenUnknownSink(tsNode, checker)) {
      context.report({ 'messageId': 'unguardedResult', 'node': node });
    }
  }

  private static argumentsProven(call: ReflectCallInterface, checker: ts.TypeChecker): boolean {
    const targetType = checker.getTypeAtLocation(call.target);
    const signatures = call.isConstruct ? targetType.getConstructSignatures() : targetType.getCallSignatures();
    const argumentTypes = ArgumentListTypes.resolve(call.argumentsExpression, checker);

    if (signatures.length === 0 || argumentTypes === undefined) {
      return true;
    }

    const result = SignatureMatch.satisfiedByAny(signatures, argumentTypes, checker);

    return result;
  }
}

export const noReflectArgumentLaundering: Rule.RuleModule = {
  'create': (context) => {
    return {
      'CallExpression': (node: Rule.Node): void => { ReflectLaunderingCheck.inspect(node, context); }
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow calling a typed function or constructor through Reflect.apply/Reflect.construct with arguments its signature does not accept, and disallow its any-typed result flowing anywhere but an unknown-typed sink.',
      'recommended': false
    },
    'messages': {
      'unassignableArguments': 'This argument list is not assignable to the target\'s parameters. Reflect.apply/Reflect.construct take `any[]`, so this call skips the check a direct call would get — call it directly, or fix the arguments so they genuinely match the signature.',
      'unguardedResult': 'Reflect.apply/Reflect.construct return `any`. Bind this result to an unknown-typed variable, parameter, or return type and narrow it with a real guard before using it — do not let the `any` flow further unchecked.'
    },
    'schema': [],
    'type': 'problem'
  }
};
