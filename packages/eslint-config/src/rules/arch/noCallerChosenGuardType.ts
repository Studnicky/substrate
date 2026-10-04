import type { Rule } from 'eslint';

import ts from 'typescript';

import { AstHelpers } from '../shared/astHelpers.js';

// A type predicate (`x is P`) is a promise the RUNTIME check proves. When `P` mentions a type
// parameter of the guard, the promise is only as honest as what the runtime check can actually
// distinguish — `instanceof Set` proves membership in `Set<unknown>` at best, never which
// element type a caller names. Two doors let a caller pick `P` themselves rather than have the
// guard prove it: an explicit type argument at the call, or an inferred type argument that
// resolves through a library's own `any` (e.g. `SetConstructor['prototype']: Set<any>`) and
// therefore bridges to whatever the caller's binding expects. Both are a cast in other syntax.
// A guard DECLARATION has the same defect at its source when its predicate is a bare type
// parameter no parameter type ever constrains — nothing stops a caller picking it freely.

interface TypeWalkContextInterface {
  readonly 'checker': ts.TypeChecker;
  readonly 'matches': (candidate: ts.Type) => boolean;
  readonly 'seen': Set<ts.Type>;
}

// Real generic signatures (a fluent builder's `this`-returning overloads, a recursive
// conditional-type alias) can make the checker mint a structurally-identical but
// object-distinct `ts.Type` on every instantiation, defeating a `seen`-by-identity cycle
// guard. `WALK_DEPTH_LIMIT` bounds descent independently of that, trading a false negative on a
// pathologically deep real type for guaranteed termination.
const WALK_DEPTH_LIMIT = 12;

class TypeStructureWalk {
  /** Depth-first search over `type` and everything it structurally references (union/intersection members, generic type arguments, property types, call/construct signatures), short-circuiting on the first match. */
  public static some(type: ts.Type, context: TypeWalkContextInterface, depth = 0): boolean {
    if (context.matches(type)) {
      return true;
    }

    if (depth >= WALK_DEPTH_LIMIT || context.seen.has(type)) {
      return false;
    }

    context.seen.add(type);

    const result = TypeStructureWalk.descend(type, context, depth);

    return result;
  }

  private static descend(type: ts.Type, context: TypeWalkContextInterface, depth: number): boolean {
    if (type.isUnionOrIntersection()) {
      const result = TypeStructureWalk.someOf(type.types, context, depth + 1);

      return result;
    }

    if (AstHelpers.isTypeReference(type) && TypeStructureWalk.someOf(context.checker.getTypeArguments(type), context, depth + 1)) {
      return true;
    }

    if ((type.flags & ts.TypeFlags.Object) === 0) {
      return false;
    }

    const result = TypeStructureWalk.descendObject(type, context, depth);

    return result;
  }

  private static descendObject(type: ts.Type, context: TypeWalkContextInterface, depth: number): boolean {
    if (TypeStructureWalk.someSignature(type.getCallSignatures(), context, depth + 1)
      || TypeStructureWalk.someSignature(type.getConstructSignatures(), context, depth + 1)) {
      return true;
    }

    const result = TypeStructureWalk.someProperty(type, context, depth);

    return result;
  }

  private static someProperty(type: ts.Type, context: TypeWalkContextInterface, depth: number): boolean {
    const properties = context.checker.getPropertiesOfType(type);
    const propertyCount = properties.length;

    for (let index = 0; index < propertyCount; index += 1) {
      const property = properties[index];

      if (property !== undefined && !TypeStructureWalk.isStandardLibraryMember(property) && TypeStructureWalk.some(context.checker.getTypeOfSymbol(property), context, depth + 1)) {
        return true;
      }
    }

    return false;
  }

  /**
   * True for a property declared in a TypeScript lib file (`lib.es5.d.ts`, …) — `Function`'s own
   * `bind`/`call`/`apply` members, reached through an intersection with `Function`. Their deeply
   * overloaded, self-instantiating signatures carry no user-declared type-parameter linkage this
   * rule cares about, and walking into them is what makes an intersection-with-`Function`
   * parameter type expensive to traverse.
   */
  private static isStandardLibraryMember(property: ts.Symbol): boolean {
    const declaration = property.valueDeclaration ?? property.declarations?.at(0);

    if (declaration === undefined) {
      return false;
    }

    const fileName = declaration.getSourceFile().fileName;
    const basename = fileName.slice(fileName.lastIndexOf('/') + 1);
    const result = basename.startsWith('lib.') && basename.endsWith('.d.ts');

    return result;
  }

  private static someOf(types: readonly ts.Type[], context: TypeWalkContextInterface, depth: number): boolean {
    const count = types.length;

    for (let index = 0; index < count; index += 1) {
      const candidate = types[index];

      if (candidate !== undefined && TypeStructureWalk.some(candidate, context, depth)) {
        return true;
      }
    }

    return false;
  }

  /** Follows a function-shaped type's own call/construct signatures — a type parameter used only in a parameter's or return's signature (`new (...args) => T`) is otherwise invisible to `getPropertiesOfType`. */
  private static someSignature(signatures: readonly ts.Signature[], context: TypeWalkContextInterface, depth: number): boolean {
    const signatureCount = signatures.length;

    for (let index = 0; index < signatureCount; index += 1) {
      const signature = signatures[index];

      if (signature === undefined) {
        continue;
      }

      if (TypeStructureWalk.some(signature.getReturnType(), context, depth)) {
        return true;
      }

      const parameters = signature.getParameters();
      const parameterCount = parameters.length;

      for (let parameterIndex = 0; parameterIndex < parameterCount; parameterIndex += 1) {
        const parameterSymbol = parameters[parameterIndex];

        if (parameterSymbol !== undefined && TypeStructureWalk.some(context.checker.getTypeOfSymbol(parameterSymbol), context, depth)) {
          return true;
        }
      }
    }

    return false;
  }
}

class AnyContainment {
  private static matchesAny(candidate: ts.Type): boolean {
    const result = (candidate.flags & ts.TypeFlags.Any) !== 0;

    return result;
  }
  public static in(type: ts.Type, checker: ts.TypeChecker): boolean {
    const context: TypeWalkContextInterface = { 'checker': checker, 'matches': AnyContainment.matchesAny, 'seen': new Set() };
    const result = TypeStructureWalk.some(type, context);

    return result;
  }
}

class TypeParameterMembership {
  public static of(type: ts.Type, typeParameters: ReadonlySet<ts.Type>, checker: ts.TypeChecker): boolean {
    const matchesTypeParameter = (candidate: ts.Type): boolean => { const result = typeParameters.has(candidate); return result; };
    const context: TypeWalkContextInterface = { 'checker': checker, 'matches': matchesTypeParameter, 'seen': new Set() };
    const result = TypeStructureWalk.some(type, context);

    return result;
  }
}

interface GenericPredicateInterface {
  readonly 'predicateType': ts.Type;
  readonly 'typeParameters': ReadonlySet<ts.Type>;
}

class GuardCallCheck {
  public static inspect(node: Rule.Node, context: Rule.RuleContext): void {
    const servicesUnknown: unknown = context.sourceCode.parserServices;

    if (!AstHelpers.hasTypeServices(servicesUnknown)) {
      return;
    }

    const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(node);

    if (tsNode === undefined || !ts.isCallExpression(tsNode)) {
      return;
    }

    const checker = servicesUnknown.program.getTypeChecker();
    const resolvedSignature = checker.getResolvedSignature(tsNode);

    if (resolvedSignature !== undefined) {
      GuardCallCheck.inspectResolved(node, tsNode, resolvedSignature, checker, context);
    }
  }

  private static inspectResolved(node: Rule.Node, tsNode: ts.CallExpression, resolvedSignature: ts.Signature, checker: ts.TypeChecker, context: Rule.RuleContext): void {
    const generic = GuardCallCheck.genericPredicateOf(resolvedSignature, checker);

    if (generic === undefined || !TypeParameterMembership.of(generic.predicateType, generic.typeParameters, checker)) {
      return;
    }

    if ((tsNode.typeArguments?.length ?? 0) > 0) {
      context.report({ 'messageId': 'explicitTypeArgument', 'node': node });

      return;
    }

    const resolvedPredicate = checker.getTypePredicateOfSignature(resolvedSignature);

    if (resolvedPredicate?.type !== undefined && AnyContainment.in(resolvedPredicate.type, checker)) {
      context.report({ 'messageId': 'inferredAnyTypeArgument', 'node': node });
    }
  }

  /** The uninstantiated generic signature's own predicate — carries the guard's declared type parameters, not the call-specific instantiation. */
  private static genericPredicateOf(resolvedSignature: ts.Signature, checker: ts.TypeChecker): GenericPredicateInterface | undefined {
    if (resolvedSignature.declaration === undefined || !ts.isFunctionLike(resolvedSignature.declaration)) {
      return undefined;
    }

    const genericSignature = checker.getSignatureFromDeclaration(resolvedSignature.declaration);
    const genericPredicate = genericSignature === undefined ? undefined : checker.getTypePredicateOfSignature(genericSignature);

    if (genericSignature === undefined || genericPredicate?.type === undefined) {
      return undefined;
    }

    const typeParameters = new Set<ts.Type>(genericSignature.getTypeParameters() ?? []);

    if (typeParameters.size === 0) {
      return undefined;
    }

    return { 'predicateType': genericPredicate.type, 'typeParameters': typeParameters };
  }
}

class FreePickDeclarationCheck {
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

    FreePickDeclarationCheck.inspectSignature(node, tsNode, checker, context);
  }

  private static inspectSignature(node: Rule.Node, tsNode: ts.FunctionDeclaration | ts.MethodDeclaration, checker: ts.TypeChecker, context: Rule.RuleContext): void {
    const signature = checker.getSignatureFromDeclaration(tsNode);
    const predicate = signature === undefined ? undefined : checker.getTypePredicateOfSignature(signature);

    if (signature === undefined || predicate?.type === undefined || (predicate.type.flags & ts.TypeFlags.TypeParameter) === 0) {
      return;
    }

    const typeParameters = signature.getTypeParameters() ?? [];

    if (!typeParameters.includes(predicate.type) || FreePickDeclarationCheck.aParameterDerives(tsNode, predicate.type, checker)) {
      return;
    }

    context.report({ 'messageId': 'freePickDeclaration', 'node': node });
  }

  private static aParameterDerives(tsNode: ts.FunctionDeclaration | ts.MethodDeclaration, typeParameter: ts.Type, checker: ts.TypeChecker): boolean {
    const typeParameterSet = new Set<ts.Type>([typeParameter]);
    const parameters = tsNode.parameters;
    const parameterCount = parameters.length;

    for (let index = 0; index < parameterCount; index += 1) {
      const parameter = parameters[index];

      if (parameter !== undefined && TypeParameterMembership.of(checker.getTypeAtLocation(parameter), typeParameterSet, checker)) {
        return true;
      }
    }

    return false;
  }
}

export const noCallerChosenGuardType: Rule.RuleModule = {
  'create': (context) => {
    const inspectCall = (node: Rule.Node): void => { GuardCallCheck.inspect(node, context); };
    const inspectDeclaration = (node: Rule.Node): void => { FreePickDeclarationCheck.inspect(node, context); };

    return { 'CallExpression': inspectCall, 'FunctionDeclaration': inspectDeclaration, 'MethodDefinition': inspectDeclaration };
  },
  'meta': {
    'docs': {
      'description': 'Disallow a type-guard call whose narrowed type a caller chooses rather than the runtime check proving it, and disallow declaring a type-predicate guard whose predicate a caller can pick freely.',
      'recommended': false
    },
    'messages': {
      'explicitTypeArgument': 'This call supplies an explicit type argument for a type parameter the guard\'s predicate narrows to. The runtime check proves at most what its own logic can distinguish; an explicit type argument lets the caller assert a narrower or unrelated type instead — a cast in other syntax.',
      'freePickDeclaration': 'This guard\'s predicate is a bare type parameter no parameter type ever constrains, so nothing stops a caller instantiating it with whatever type they want. Derive the predicate from a parameter\'s own type, or narrow to a concrete type the runtime check actually proves.',
      'inferredAnyTypeArgument': 'This call\'s inferred type argument resolves through `any`, so the guard\'s predicate narrows to a type the runtime check never actually proves. Add a dedicated, honestly-typed guard for this case instead of relying on this one\'s `any`-bridged inference.'
    },
    'schema': [],
    'type': 'problem'
  }
};
