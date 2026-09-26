import type { Rule } from 'eslint';

import ts from 'typescript';

import { AstHelpers } from '../shared/astHelpers.js';

// TypeScript relates an overload's implementation signature to each overload signature only
// loosely — it does not require the implementation's return type to be assignable to every
// overload's return type, nor every overload's parameter types to be assignable to the
// implementation's. An overload set can declare a type the implementation never proves, and
// the compiler stays silent. This rule performs the check the compiler skips.

class GenericTypeParameterUsage {
  /** True when `type` structurally contains one of `parameters`, walking alias/reference type arguments, unions/intersections, and object properties. */
  public static references(type: ts.Type, parameters: readonly ts.Type[], checker: ts.TypeChecker, seen: Set<ts.Type> = new Set()): boolean {
    if (parameters.length === 0 || seen.has(type)) {
      return false;
    }

    seen.add(type);

    if (parameters.includes(type)) {
      return true;
    }

    const result = GenericTypeParameterUsage.referencesAliasArguments(type, parameters, checker, seen)
      || GenericTypeParameterUsage.referencesUnionMembers(type, parameters, checker, seen)
      || GenericTypeParameterUsage.referencesTypeArguments(type, parameters, checker, seen)
      || GenericTypeParameterUsage.referencesProperties(type, parameters, checker, seen);

    return result;
  }

  private static referencesAliasArguments(type: ts.Type, parameters: readonly ts.Type[], checker: ts.TypeChecker, seen: Set<ts.Type>): boolean {
    const aliasArguments = type.aliasTypeArguments ?? [];
    const argumentCount = aliasArguments.length;

    for (let index = 0; index < argumentCount; index += 1) {
      const argument = aliasArguments[index];

      if (argument !== undefined && GenericTypeParameterUsage.references(argument, parameters, checker, seen)) {
        return true;
      }
    }

    return false;
  }

  private static referencesUnionMembers(type: ts.Type, parameters: readonly ts.Type[], checker: ts.TypeChecker, seen: Set<ts.Type>): boolean {
    if (!type.isUnionOrIntersection()) {
      return false;
    }

    const memberCount = type.types.length;

    for (let index = 0; index < memberCount; index += 1) {
      const member = type.types[index];

      if (member !== undefined && GenericTypeParameterUsage.references(member, parameters, checker, seen)) {
        return true;
      }
    }

    return false;
  }

  private static referencesTypeArguments(type: ts.Type, parameters: readonly ts.Type[], checker: ts.TypeChecker, seen: Set<ts.Type>): boolean {
    if ((type.flags & ts.TypeFlags.Object) === 0 || !AstHelpers.isTypeReference(type)) {
      return false;
    }

    const typeArguments = checker.getTypeArguments(type);
    const argumentCount = typeArguments.length;

    for (let index = 0; index < argumentCount; index += 1) {
      const argument = typeArguments[index];

      if (argument !== undefined && GenericTypeParameterUsage.references(argument, parameters, checker, seen)) {
        return true;
      }
    }

    return false;
  }

  private static referencesProperties(type: ts.Type, parameters: readonly ts.Type[], checker: ts.TypeChecker, seen: Set<ts.Type>): boolean {
    if ((type.flags & ts.TypeFlags.Object) === 0) {
      return false;
    }

    const properties = checker.getPropertiesOfType(type);
    const propertyCount = properties.length;

    for (let index = 0; index < propertyCount; index += 1) {
      const property = properties[index];

      if (property !== undefined && GenericTypeParameterUsage.references(checker.getTypeOfSymbol(property), parameters, checker, seen)) {
        return true;
      }
    }

    return false;
  }
}

interface SignatureProofRelationInterface {
  readonly 'source': ts.Type;
  readonly 'sourceParameters': readonly ts.Type[];
  readonly 'target': ts.Type;
  readonly 'targetParameters': readonly ts.Type[];
}

class SignatureProof {
  /**
   * True when the checker can prove `source` relates to `target`, treating a signature pair
   * that each derive their compared type from their own type parameters as proven without a
   * naked assignability check — two independently-declared type parameters of the same name
   * are otherwise unrelated symbols, so a truly generic overload matched by an equally generic
   * implementation would otherwise read as unproven.
   */
  public static holds(relation: SignatureProofRelationInterface, checker: ts.TypeChecker): boolean {
    const sourceIsGeneric = GenericTypeParameterUsage.references(relation.source, relation.sourceParameters, checker);
    const targetIsGeneric = GenericTypeParameterUsage.references(relation.target, relation.targetParameters, checker);

    if (sourceIsGeneric && targetIsGeneric) {
      return true;
    }

    const result = checker.isTypeAssignableTo(relation.source, relation.target);

    return result;
  }
}

interface ParameterPairInterface {
  readonly 'implementationParameter': ts.ParameterDeclaration;
  readonly 'overloadParameter': ts.ParameterDeclaration;
}

class OverloadImplementationPair {
  public static overloadDeclarationsFor(implementation: ts.FunctionDeclaration | ts.MethodDeclaration, checker: ts.TypeChecker): readonly (ts.FunctionDeclaration | ts.MethodDeclaration)[] {
    const name = implementation.name;

    if (name === undefined) {
      return [];
    }

    const symbol = checker.getSymbolAtLocation(name);
    const declarations = symbol?.declarations ?? [];
    const result: (ts.FunctionDeclaration | ts.MethodDeclaration)[] = [];
    const declarationCount = declarations.length;

    for (let index = 0; index < declarationCount; index += 1) {
      const declaration = declarations[index];

      if (declaration !== undefined && OverloadImplementationPair.isSiblingOverload(declaration, implementation)) {
        result.push(declaration);
      }
    }

    return result;
  }

  private static isSiblingOverload(declaration: ts.Declaration, implementation: ts.FunctionDeclaration | ts.MethodDeclaration): declaration is ts.FunctionDeclaration | ts.MethodDeclaration {
    if (declaration === implementation || !(ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration))) {
      return false;
    }

    const result = declaration.body === undefined;

    return result;
  }

  public static returnProven(implementationSignature: ts.Signature, overloadSignature: ts.Signature, checker: ts.TypeChecker): boolean {
    const result = SignatureProof.holds({
      'source': implementationSignature.getReturnType(),
      'sourceParameters': implementationSignature.getTypeParameters() ?? [],
      'target': overloadSignature.getReturnType(),
      'targetParameters': overloadSignature.getTypeParameters() ?? []
    }, checker);

    return result;
  }

  public static parametersProven(implementationSignature: ts.Signature, overloadSignature: ts.Signature, checker: ts.TypeChecker): boolean {
    const implementationTypeParameters = implementationSignature.getTypeParameters() ?? [];
    const overloadTypeParameters = overloadSignature.getTypeParameters() ?? [];
    const pairs = OverloadImplementationPair.comparableParameterPairs(implementationSignature, overloadSignature);
    const pairCount = pairs.length;

    for (let index = 0; index < pairCount; index += 1) {
      const pair = pairs[index];

      if (pair !== undefined && !OverloadImplementationPair.parameterProven(pair.overloadParameter, overloadTypeParameters, pair.implementationParameter, implementationTypeParameters, checker)) {
        return false;
      }
    }

    return true;
  }

  private static comparableParameterPairs(implementationSignature: ts.Signature, overloadSignature: ts.Signature): readonly ParameterPairInterface[] {
    const implementationParameters = (implementationSignature.declaration?.parameters ?? []).filter(ts.isParameter);
    const overloadParameters = (overloadSignature.declaration?.parameters ?? []).filter(ts.isParameter);
    const comparableCount = Math.min(implementationParameters.length, overloadParameters.length);
    const result: ParameterPairInterface[] = [];

    for (let index = 0; index < comparableCount; index += 1) {
      const implementationParameter = implementationParameters[index];
      const overloadParameter = overloadParameters[index];

      if (implementationParameter === undefined || overloadParameter === undefined) {
        continue;
      }

      if (implementationParameter.dotDotDotToken !== undefined || overloadParameter.dotDotDotToken !== undefined) {
        break;
      }

      result.push({ 'implementationParameter': implementationParameter, 'overloadParameter': overloadParameter });
    }

    return result;
  }

  private static parameterProven(
    overloadParameter: ts.ParameterDeclaration, overloadTypeParameters: readonly ts.Type[],
    implementationParameter: ts.ParameterDeclaration, implementationTypeParameters: readonly ts.Type[],
    checker: ts.TypeChecker
  ): boolean {
    const result = SignatureProof.holds({
      'source': checker.getTypeAtLocation(overloadParameter),
      'sourceParameters': overloadTypeParameters,
      'target': checker.getTypeAtLocation(implementationParameter),
      'targetParameters': implementationTypeParameters
    }, checker);

    return result;
  }
}

class OverloadImplementationCheck {
  public static inspect(node: Rule.Node, context: Rule.RuleContext): void {
    const servicesUnknown: unknown = context.sourceCode.parserServices;

    if (!AstHelpers.hasTypeServices(servicesUnknown)) {
      return;
    }

    const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(node);

    if (tsNode === undefined || !(ts.isFunctionDeclaration(tsNode) || ts.isMethodDeclaration(tsNode)) || tsNode.body === undefined) {
      return;
    }

    const checker = servicesUnknown.program.getTypeChecker();
    const overloadDeclarations = OverloadImplementationPair.overloadDeclarationsFor(tsNode, checker);

    if (overloadDeclarations.length === 0) {
      return;
    }

    const implementationSignature = checker.getSignatureFromDeclaration(tsNode);

    if (implementationSignature === undefined) {
      return;
    }

    OverloadImplementationCheck.reportFirstUnproven(node, context, implementationSignature, overloadDeclarations, checker);
  }

  private static reportFirstUnproven(node: Rule.Node, context: Rule.RuleContext, implementationSignature: ts.Signature, overloadDeclarations: readonly (ts.FunctionDeclaration | ts.MethodDeclaration)[], checker: ts.TypeChecker): void {
    const overloadCount = overloadDeclarations.length;

    for (let index = 0; index < overloadCount; index += 1) {
      const overloadDeclaration = overloadDeclarations[index];
      const overloadSignature = overloadDeclaration === undefined ? undefined : checker.getSignatureFromDeclaration(overloadDeclaration);

      if (overloadSignature === undefined) {
        continue;
      }

      if (!OverloadImplementationPair.returnProven(implementationSignature, overloadSignature, checker)) {
        context.report({ 'messageId': 'unprovenReturn', 'node': node });

        return;
      }

      if (!OverloadImplementationPair.parametersProven(implementationSignature, overloadSignature, checker)) {
        context.report({ 'messageId': 'unprovenParameters', 'node': node });

        return;
      }
    }
  }
}

export const noUncheckedOverloadImplementation: Rule.RuleModule = {
  'create': (context) => {
    const inspect = (node: Rule.Node): void => { OverloadImplementationCheck.inspect(node, context); };

    return { 'FunctionDeclaration': inspect, 'MethodDefinition': inspect };
  },
  'meta': {
    'docs': {
      'description': 'Disallow an overloaded function or method whose implementation signature the checker cannot prove satisfies every declared overload.',
      'recommended': false
    },
    'messages': {
      'unprovenParameters': 'This overload declares a parameter type the implementation signature does not accept. TypeScript relates overloads to their implementation loosely; make the implementation genuinely accept every overload\'s parameter types instead of relying on that loose check.',
      'unprovenReturn': 'This overload declares a return type the implementation signature does not prove. TypeScript relates overloads to their implementation loosely; make the implementation genuinely return every overload\'s declared type instead of relying on that loose check.'
    },
    'schema': [],
    'type': 'problem'
  }
};
