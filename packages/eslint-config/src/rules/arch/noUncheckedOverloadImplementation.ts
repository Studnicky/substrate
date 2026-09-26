import type { Rule } from 'eslint';

import ts from 'typescript';

import { AstHelpers } from '../shared/astHelpers.js';

// TypeScript relates an overload's implementation signature to each overload signature only
// loosely — it does not require the implementation's return type to be assignable to every
// overload's return type, nor every overload's parameter types to be assignable to the
// implementation's. An overload set can declare a type the implementation never proves, and
// the compiler stays silent. This rule performs the check the compiler skips.

/**
 * Two independently-declared type parameter objects at the same position of a signature and
 * its overload are the same conceptual variable under a different name — `isTypeAssignableTo`
 * treats them as unrelated free variables and cannot prove that. `holds` walks both types in
 * parallel, treating `sourceParameters[i]` as identical to `targetParameters[i]` and otherwise
 * demanding the same structural shape (same union arity, same generic target, same property
 * set) recursively. A shape mismatch — an overload's single type folded into an implementation
 * union, for instance — fails alpha-equivalence and falls through to a real assignability
 * check, which correctly rejects it: the implementation might resolve to the union member the
 * overload never promised.
 */
interface AlphaEquivalenceContextInterface {
  readonly 'checker': ts.TypeChecker;
  readonly 'positionMap': ReadonlyMap<ts.Type, ts.Type>;
  readonly 'reverseMap': ReadonlyMap<ts.Type, ts.Type>;
  readonly 'seen': Set<string>;
}

class GenericAlphaEquivalence {
  public static holds(source: ts.Type, target: ts.Type, context: AlphaEquivalenceContextInterface): boolean {
    if (source === target) {
      return true;
    }

    const mappedTarget = context.positionMap.get(source);

    if (mappedTarget !== undefined) {
      const result = mappedTarget === target;

      return result;
    }

    if (context.reverseMap.has(target)) {
      return false;
    }

    const cycleKey = `${context.checker.typeToString(source)}~~~${context.checker.typeToString(target)}`;

    if (context.seen.has(cycleKey)) {
      return true;
    }

    context.seen.add(cycleKey);

    const result = GenericAlphaEquivalence.unionsEquivalent(source, target, context)
      ?? GenericAlphaEquivalence.aliasArgumentsEquivalent(source, target, context)
      ?? GenericAlphaEquivalence.referenceArgumentsEquivalent(source, target, context)
      ?? GenericAlphaEquivalence.propertiesEquivalent(source, target, context)
      ?? false;

    return result;
  }

  /** Returns `undefined` (not applicable) rather than `false` when the two types aren't both this shape, so the caller can try the next shape instead of failing outright. */
  private static unionsEquivalent(source: ts.Type, target: ts.Type, context: AlphaEquivalenceContextInterface): boolean | undefined {
    if (!source.isUnionOrIntersection() && !target.isUnionOrIntersection()) {
      return undefined;
    }

    if (!source.isUnionOrIntersection() || !target.isUnionOrIntersection() || source.types.length !== target.types.length) {
      return false;
    }

    const sourceMembers = source.types;
    const targetMembers = target.types;
    const usedTargetIndexes = new Set<number>();
    const sourceMemberCount = sourceMembers.length;

    for (let sourceIndex = 0; sourceIndex < sourceMemberCount; sourceIndex += 1) {
      const sourceMember = sourceMembers[sourceIndex];

      if (sourceMember === undefined || !GenericAlphaEquivalence.matchesSomeMember(sourceMember, targetMembers, usedTargetIndexes, context)) {
        return false;
      }
    }

    return true;
  }

  private static matchesSomeMember(sourceMember: ts.Type, targetMembers: readonly ts.Type[], usedTargetIndexes: Set<number>, context: AlphaEquivalenceContextInterface): boolean {
    const targetCount = targetMembers.length;

    for (let targetIndex = 0; targetIndex < targetCount; targetIndex += 1) {
      if (usedTargetIndexes.has(targetIndex)) {
        continue;
      }

      const targetMember = targetMembers[targetIndex];

      if (targetMember !== undefined && GenericAlphaEquivalence.holds(sourceMember, targetMember, context)) {
        usedTargetIndexes.add(targetIndex);

        return true;
      }
    }

    return false;
  }

  private static aliasArgumentsEquivalent(source: ts.Type, target: ts.Type, context: AlphaEquivalenceContextInterface): boolean | undefined {
    if (source.aliasSymbol === undefined && target.aliasSymbol === undefined) {
      return undefined;
    }

    if (source.aliasSymbol !== target.aliasSymbol) {
      return false;
    }

    const result = GenericAlphaEquivalence.typeArgumentListsEquivalent(source.aliasTypeArguments ?? [], target.aliasTypeArguments ?? [], context);

    return result;
  }

  private static referenceArgumentsEquivalent(source: ts.Type, target: ts.Type, context: AlphaEquivalenceContextInterface): boolean | undefined {
    const sourceIsReference = AstHelpers.isTypeReference(source);
    const targetIsReference = AstHelpers.isTypeReference(target);

    if (!sourceIsReference && !targetIsReference) {
      return undefined;
    }

    if (!sourceIsReference || !targetIsReference || source.target !== target.target) {
      return false;
    }

    const result = GenericAlphaEquivalence.typeArgumentListsEquivalent(context.checker.getTypeArguments(source), context.checker.getTypeArguments(target), context);

    return result;
  }

  private static typeArgumentListsEquivalent(sourceArguments: readonly ts.Type[], targetArguments: readonly ts.Type[], context: AlphaEquivalenceContextInterface): boolean {
    if (sourceArguments.length !== targetArguments.length) {
      return false;
    }

    const argumentCount = sourceArguments.length;

    for (let index = 0; index < argumentCount; index += 1) {
      const sourceArgument = sourceArguments[index];
      const targetArgument = targetArguments[index];

      if (sourceArgument === undefined || targetArgument === undefined || !GenericAlphaEquivalence.holds(sourceArgument, targetArgument, context)) {
        return false;
      }
    }

    return true;
  }

  private static propertiesEquivalent(source: ts.Type, target: ts.Type, context: AlphaEquivalenceContextInterface): boolean | undefined {
    if ((source.flags & ts.TypeFlags.Object) === 0 || (target.flags & ts.TypeFlags.Object) === 0) {
      return undefined;
    }

    const sourceProperties = context.checker.getPropertiesOfType(source);
    const targetProperties = context.checker.getPropertiesOfType(target);

    if (sourceProperties.length !== targetProperties.length) {
      return false;
    }

    const targetPropertiesByName = new Map(targetProperties.map((property) => { return [property.name, property] as const; }));
    const sourcePropertyCount = sourceProperties.length;

    for (let index = 0; index < sourcePropertyCount; index += 1) {
      const sourceProperty = sourceProperties[index];
      const targetProperty = sourceProperty === undefined ? undefined : targetPropertiesByName.get(sourceProperty.name);

      if (sourceProperty === undefined || targetProperty === undefined || !GenericAlphaEquivalence.holds(context.checker.getTypeOfSymbol(sourceProperty), context.checker.getTypeOfSymbol(targetProperty), context)) {
        return false;
      }
    }

    return true;
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
   * True when the checker can prove `source` relates to `target`. When both signatures declare
   * the same number of type parameters, tries alpha-equivalence first — the two signatures may
   * be the same generic shape under independently-declared type parameter objects. Otherwise,
   * and whenever alpha-equivalence fails, falls back to a real `isTypeAssignableTo` check.
   */
  public static holds(relation: SignatureProofRelationInterface, checker: ts.TypeChecker): boolean {
    if (SignatureProof.alphaEquivalent(relation, checker)) {
      return true;
    }

    const result = checker.isTypeAssignableTo(relation.source, relation.target);

    return result;
  }

  private static alphaEquivalent(relation: SignatureProofRelationInterface, checker: ts.TypeChecker): boolean {
    const parameterCount = relation.sourceParameters.length;

    if (parameterCount === 0 || parameterCount !== relation.targetParameters.length) {
      return false;
    }

    const positionMap = new Map<ts.Type, ts.Type>();
    const reverseMap = new Map<ts.Type, ts.Type>();

    for (let index = 0; index < parameterCount; index += 1) {
      const sourceParameter = relation.sourceParameters[index];
      const targetParameter = relation.targetParameters[index];

      if (sourceParameter !== undefined && targetParameter !== undefined) {
        positionMap.set(sourceParameter, targetParameter);
        reverseMap.set(targetParameter, sourceParameter);
      }
    }

    const result = GenericAlphaEquivalence.holds(relation.source, relation.target, { 'checker': checker, 'positionMap': positionMap, 'reverseMap': reverseMap, 'seen': new Set() });

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
