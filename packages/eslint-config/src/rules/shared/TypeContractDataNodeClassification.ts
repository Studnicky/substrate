import {
  type ArrayTypeNode,
  type ConditionalTypeNode,
  getCombinedModifierFlags,
  type IndexSignatureDeclaration,
  type InterfaceDeclaration,
  isArrayTypeNode,
  isCallSignatureDeclaration,
  isConditionalTypeNode,
  isConstructorTypeNode,
  isConstructSignatureDeclaration,
  isFunctionTypeNode,
  isIndexedAccessTypeNode,
  isIndexSignatureDeclaration,
  isIntersectionTypeNode,
  isLiteralTypeNode,
  isMappedTypeNode,
  isMethodSignature,
  isNamedTupleMember,
  isOptionalTypeNode,
  isParenthesizedTypeNode,
  isPropertySignature,
  isRestTypeNode,
  isTupleTypeNode,
  isTypeLiteralNode,
  isTypeOperatorNode,
  isTypeReferenceNode,
  isUnionTypeNode,
  type MappedTypeNode,
  ModifierFlags,
  type Node,
  type PropertySignature,
  type Symbol,
  SymbolFlags,
  SyntaxKind,
  type TupleTypeNode,
  type TypeAliasDeclaration,
  type TypeElement,
  type TypeNode,
  type TypeParameterDeclaration,
  type TypeReferenceNode
} from 'typescript';

import type { TypeContractContext } from './TypeContractContext.js';
import type { TypeContractMetadataEntity } from './TypeContractMetadataEntity.js';

import { type DataNodeResultInterface } from './DataNodeResultInterface.js';
import { MAXIMUM_RECURSION_DEPTH } from './MaximumRecursionDepth.js';
import { type ReadonlyOutputEvidenceInterface } from './ReadonlyOutputEvidenceInterface.js';

export class TypeContractDataNodeClassification {
  public constructor(private readonly context: TypeContractContext) {}

  private readonly readonlyCache = new WeakMap<TypeAliasDeclaration, readonly ReadonlyOutputEvidenceInterface[]>();

  private addReadonlyEvidence(
    result: ReadonlyOutputEvidenceInterface[],
    seen: Set<Node>,
    node: Node,
    reason: 'exposedDefault' | 'intrinsicReadonly' | 'readonlyAlias' | 'readonlyArray' | 'readonlyIndex' | 'readonlyMapped' | 'readonlyProperty',
    fixable: boolean
  ): void {
    if (seen.has(node)) {
      return;
    }
    seen.add(node);
    result.push({
      'fixable': fixable, 'node': node, 'reason': reason
    });
  }

  private static readonly PRIMITIVE_KEYWORD_REASONS = new Map<SyntaxKind, TypeContractMetadataEntity.Type['aliasReason']>([
    [SyntaxKind.AnyKeyword, 'any'],
    [SyntaxKind.BigIntKeyword, 'bigint'],
    [SyntaxKind.NeverKeyword, 'never'],
    [SyntaxKind.SymbolKeyword, 'symbol'],
    [SyntaxKind.UndefinedKeyword, 'undefined'],
    [SyntaxKind.UnknownKeyword, 'unknown'],
    [SyntaxKind.VoidKeyword, 'undefined']
  ]);

  // Stage 1: nodes that peel one layer and recurse, or resolve directly to a schema application.
  private classifyUnwrappedDataNode(
    node: TypeNode,
    root: boolean,
    visiting: Set<Symbol>,
    depth: number
  ): DataNodeResultInterface | undefined {
    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      const result = this.classifyDataNode(node.type, root, visiting, depth + 1);

      return result;
    }

    if (isTypeOperatorNode(node) && node.operator === SyntaxKind.ReadonlyKeyword) {
      const result = this.classifyDataNode(node.type, root, visiting, depth + 1);

      return result;
    }

    if (this.context.isSchemaDerivedApplication(node)) {
      const result = this.context.classifySchemaDerivedApplication(node);

      return result;
    }

    return undefined;
  }

  // Stage 2: composite/structural nodes whose members are classified recursively.
  private classifyStructuralDataNode(
    node: TypeNode,
    visiting: Set<Symbol>,
    depth: number
  ): DataNodeResultInterface | undefined {
    if (isConditionalTypeNode(node)) {
      const result = this.classifyConditionalDataNode(node, visiting, depth);

      return result;
    }

    if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
      const result = this.classifyMemberComposition(node.types, node, visiting, depth);

      return result;
    }

    if (isTupleTypeNode(node)) {
      const result = this.classifyTupleDataNode(node, visiting, depth);

      return result;
    }

    if (isArrayTypeNode(node)) {
      const result = this.classifyArrayDataNode(node, visiting, depth);

      return result;
    }

    return undefined;
  }

  // Stage 3: leaf nodes — literals, type references, and bare primitive keywords.
  private classifyLeafDataNode(
    node: TypeNode,
    root: boolean,
    visiting: Set<Symbol>,
    depth: number
  ): DataNodeResultInterface {
    if (isLiteralTypeNode(node)) {
      return {
        'canonicalRoot': false,
        'evidence': node,
        'reason': 'primitiveForwarding',
        'valid': !root
      };
    }

    if (isTypeLiteralNode(node)) {
      return {
        'canonicalRoot': false, 'evidence': node, 'reason': 'inlineObject', 'valid': false
      };
    }

    if (isTypeReferenceNode(node)) {
      const result = this.classifyTypeReferenceDataNode(node, root, visiting, depth);

      return result;
    }

    const reason = TypeContractDataNodeClassification.PRIMITIVE_KEYWORD_REASONS.get(node.kind);

    if (reason !== undefined) {
      return {
        'canonicalRoot': false, 'evidence': node, 'reason': reason, 'valid': false
      };
    }

    return {
      'canonicalRoot': false, 'evidence': node, 'reason': 'primitiveForwarding', 'valid': false
    };
  }

  public classifyDataNode(
    node: TypeNode,
    root: boolean,
    visiting: Set<Symbol>,
    depth: number
  ): DataNodeResultInterface {
    if (depth > MAXIMUM_RECURSION_DEPTH) {
      return {
        'canonicalRoot': false, 'evidence': node, 'reason': 'depth', 'valid': false
      };
    }

    const unwrapped = this.classifyUnwrappedDataNode(node, root, visiting, depth);

    if (unwrapped !== undefined) {
      return unwrapped;
    }

    const structural = this.classifyStructuralDataNode(node, visiting, depth);

    if (structural !== undefined) {
      return structural;
    }

    const result = this.classifyLeafDataNode(node, root, visiting, depth);

    return result;
  }

  // Mirrors `findAliasContract`'s distributive-identity unwrap: a conditional whose branches
  // are just re-exposing the checked type (`X extends infer R ? R : never`) classifies as
  // whatever `X` itself classifies as. A genuine conditional has already been caught by
  // `findAliasContract` as contract evidence before `classifyDataNode` is ever reached, so
  // any conditional surviving to this point is, by construction, the identity shape.
  private classifyConditionalDataNode(
    node: ConditionalTypeNode,
    visiting: Set<Symbol>,
    depth: number
  ): DataNodeResultInterface {
    const identityCheckType = this.context.aliasResolution.distributiveIdentityConditionalCheckType(node);

    if (identityCheckType !== undefined) {
      const result = this.classifyDataNode(identityCheckType, false, visiting, depth + 1);

      return result;
    }

    return {
      'canonicalRoot': false, 'evidence': node, 'reason': 'primitiveForwarding', 'valid': false
    };
  }

  private classifyMemberComposition(
    members: readonly TypeNode[],
    node: TypeNode,
    visiting: Set<Symbol>,
    depth: number
  ): DataNodeResultInterface {
    let canonicalRoot = false;
    const length = members.length;

    for (let index = 0; index < length; index++) {
      const member = members.at(index);

      if (member === undefined) {
        continue;
      }
      const classified = this.classifyDataNode(member, false, visiting, depth + 1);

      if (!classified.valid) {
        return classified;
      }
      canonicalRoot = canonicalRoot || classified.canonicalRoot;
    }

    return {
      'canonicalRoot': canonicalRoot,
      'evidence': node,
      'reason': canonicalRoot ? 'canonicalComposition' : 'primitiveForwarding',
      'valid': canonicalRoot
    };
  }

  private classifyTupleDataNode(
    node: TupleTypeNode,
    visiting: Set<Symbol>,
    depth: number
  ): DataNodeResultInterface {
    const elementTypes = node.elements.map((element) => {
      const elementType = isNamedTupleMember(element) ? element.type : element;

      return elementType;
    });

    const result = this.classifyMemberComposition(elementTypes, node, visiting, depth);

    return result;
  }

  private classifyArrayDataNode(
    node: ArrayTypeNode,
    visiting: Set<Symbol>,
    depth: number
  ): DataNodeResultInterface {
    const element = this.classifyDataNode(node.elementType, false, visiting, depth + 1);

    return {
      'canonicalRoot': element.canonicalRoot,
      'evidence': element.valid ? node : element.evidence,
      'reason': element.valid && element.canonicalRoot ? 'canonicalComposition' : element.reason,
      'valid': element.valid && element.canonicalRoot
    };
  }

  private classifyTypeReferenceDataNode(
    node: TypeReferenceNode,
    root: boolean,
    visiting: Set<Symbol>,
    depth: number
  ): DataNodeResultInterface {
    if (this.context.isFromSchemaNamedReference(node)) {
      return {
        'canonicalRoot': false, 'evidence': node, 'reason': 'unresolvedReference', 'valid': false
      };
    }

    const symbol = this.context.resolveSymbol(this.context.checker.getSymbolAtLocation(node.typeName));

    if (symbol !== undefined && (symbol.flags & SymbolFlags.TypeParameter) !== 0) {
      return {
        'canonicalRoot': false, 'evidence': node, 'reason': 'typeParameter', 'valid': false
      };
    }

    if (this.context.aliasResolution.isArrayLikeIntrinsicReference(node)) {
      const result = this.classifyIntrinsicContainerReference(node, visiting, depth);

      return result;
    }

    const interfaceDeclaration = this.context.interfaceDeclarationForSymbol(symbol);

    if (interfaceDeclaration !== undefined) {
      const result = this.classifyInterfaceTypeReference(node, interfaceDeclaration);

      return result;
    }

    const alias = this.context.aliasDeclarationForSymbol(symbol);

    if (alias === undefined) {
      return {
        'canonicalRoot': false, 'evidence': node, 'reason': 'unresolvedReference', 'valid': false
      };
    }

    const result = this.classifyAliasTypeReference(node, root, alias, visiting, depth);

    return result;
  }

  private classifyIntrinsicContainerReference(
    node: TypeReferenceNode,
    visiting: Set<Symbol>,
    depth: number
  ): DataNodeResultInterface {
    const typeArguments = node.typeArguments ?? [];

    if (typeArguments.length !== 1) {
      return {
        'canonicalRoot': false, 'evidence': node, 'reason': 'unresolvedReference', 'valid': false
      };
    }
    const typeArgument = typeArguments.at(0);

    if (typeArgument === undefined) {
      return {
        'canonicalRoot': false, 'evidence': node, 'reason': 'unresolvedReference', 'valid': false
      };
    }
    const classified = this.classifyDataNode(typeArgument, false, visiting, depth + 1);

    return {
      'canonicalRoot': classified.canonicalRoot,
      'evidence': classified.valid ? node : classified.evidence,
      'reason': classified.valid && classified.canonicalRoot ? 'canonicalComposition' : classified.reason,
      'valid': classified.valid && classified.canonicalRoot
    };
  }

  // `interface Type extends FromSchema<typeof Schema>` is the self-referential entity
  // form (see `isCanonicalEntityInterface`'s doc comment) — genuine schema-derived data,
  // not a behavioral contract, so it composes the same way a `FromSchema`-derived alias would.
  private classifyInterfaceTypeReference(
    node: TypeReferenceNode,
    interfaceDeclaration: InterfaceDeclaration
  ): DataNodeResultInterface {
    if (this.context.interfaceType.isCanonicalEntityInterface(interfaceDeclaration)) {
      return {
        'canonicalRoot': true, 'evidence': node, 'reason': 'canonicalComposition', 'valid': true
      };
    }

    return {
      'canonicalRoot': false, 'evidence': node, 'reason': 'interfaceReference', 'valid': false
    };
  }

  private classifyAliasTypeReference(
    node: TypeReferenceNode,
    root: boolean,
    alias: TypeAliasDeclaration,
    visiting: Set<Symbol>,
    depth: number
  ): DataNodeResultInterface {
    const aliasResult = this.context.aliasResolution.classifyAlias(alias, visiting, depth + 1);

    if (aliasResult.classification !== 'pureDataCanonical') {
      return {
        'canonicalRoot': false,
        'evidence': node,
        'reason': aliasResult.reason,
        'valid': false
      };
    }

    const typeArguments = node.typeArguments ?? [];
    const length = typeArguments.length;

    for (let index = 0; index < length; index++) {
      const typeArgument = typeArguments.at(index);

      if (typeArgument === undefined) {
        continue;
      }
      const classified = this.classifyDataNode(typeArgument, false, visiting, depth + 1);

      if (!classified.valid) {
        return classified;
      }
    }

    if (root && length === 0) {
      return {
        'canonicalRoot': false, 'evidence': node, 'reason': 'nakedRename', 'valid': false
      };
    }

    return {
      'canonicalRoot': true, 'evidence': node, 'reason': 'canonicalComposition', 'valid': true
    };
  }

  private collectExposedTypeParameters(node: TypeNode, result: Set<Symbol>, depth: number): void {
    if (depth > MAXIMUM_RECURSION_DEPTH) {
      return;
    }

    if (this.collectExposedTypeParametersUnwrap(node, result, depth)) {
      return;
    }

    if (this.collectExposedTypeParametersComposite(node, result, depth)) {
      return;
    }

    if (this.collectExposedTypeParametersWrapper(node, result, depth)) {
      return;
    }

    this.collectExposedTypeParametersReference(node, result, depth);
  }

  private collectExposedTypeParametersUnwrap(node: TypeNode, result: Set<Symbol>, depth: number): boolean {
    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      this.collectExposedTypeParameters(node.type, result, depth + 1);

      return true;
    }

    if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
      node.types.forEach((member) => {
        this.collectExposedTypeParameters(member, result, depth + 1);
      });

      return true;
    }

    if (isTupleTypeNode(node)) {
      node.elements.forEach((element) => {
        this.collectExposedTypeParameters(isNamedTupleMember(element) ? element.type : element, result, depth + 1);
      });

      return true;
    }

    return false;
  }

  private collectExposedTypeParametersComposite(node: TypeNode, result: Set<Symbol>, depth: number): boolean {
    if (isArrayTypeNode(node)) {
      this.collectExposedTypeParameters(node.elementType, result, depth + 1);

      return true;
    }

    if (isConditionalTypeNode(node)) {
      this.collectExposedTypeParameters(node.trueType, result, depth + 1);
      this.collectExposedTypeParameters(node.falseType, result, depth + 1);

      return true;
    }

    if (isFunctionTypeNode(node) || isConstructorTypeNode(node)) {
      this.collectExposedTypeParameters(node.type, result, depth + 1);

      return true;
    }

    return false;
  }

  private collectExposedTypeParametersWrapper(node: TypeNode, result: Set<Symbol>, depth: number): boolean {
    if (isMappedTypeNode(node)) {
      if (node.type !== undefined) {
        this.collectExposedTypeParameters(node.type, result, depth + 1);
      }

      return true;
    }

    if (isTypeOperatorNode(node)) {
      if (node.operator !== SyntaxKind.KeyOfKeyword) {
        this.collectExposedTypeParameters(node.type, result, depth + 1);
      }

      return true;
    }

    if (isIndexedAccessTypeNode(node)) {
      return true;
    }

    if (isTypeLiteralNode(node)) {
      node.members.forEach((member) => {
        if (
          (isPropertySignature(member) || isMethodSignature(member) || isCallSignatureDeclaration(member) || isConstructSignatureDeclaration(member))
          && member.type !== undefined
        ) {
          this.collectExposedTypeParameters(member.type, result, depth + 1);
        }
      });

      return true;
    }

    return false;
  }

  private collectExposedTypeParametersReference(node: TypeNode, result: Set<Symbol>, depth: number): void {
    if (!isTypeReferenceNode(node)) {
      return;
    }
    const symbol = this.context.resolveSymbol(this.context.checker.getSymbolAtLocation(node.typeName));

    if (symbol !== undefined && (symbol.flags & SymbolFlags.TypeParameter) !== 0) {
      result.add(symbol);

      return;
    }

    if (
      this.context.isIntrinsic(node, 'Array')
      || this.context.isIntrinsic(node, 'Readonly')
      || this.context.isIntrinsic(node, 'ReadonlyArray')
    ) {
      node.typeArguments?.forEach((typeArgument) => {
        this.collectExposedTypeParameters(typeArgument, result, depth + 1);
      });
    }
  }

  private collectReadonlyFromNode(
    node: TypeNode,
    result: ReadonlyOutputEvidenceInterface[],
    seen: Set<Node>,
    visitingAliases: Set<Symbol>,
    depth: number
  ): void {
    if (depth > MAXIMUM_RECURSION_DEPTH) {
      return;
    }

    if (this.collectReadonlyUnwrap(node, result, seen, visitingAliases, depth)) {
      return;
    }

    if (this.collectReadonlyComposite(node, result, seen, visitingAliases, depth)) {
      return;
    }

    if (this.collectReadonlyEvidenceWrapper(node, result, seen, visitingAliases, depth)) {
      return;
    }

    this.collectReadonlyReference(node, result, seen, visitingAliases, depth);
  }

  private collectReadonlyUnwrap(
    node: TypeNode,
    result: ReadonlyOutputEvidenceInterface[],
    seen: Set<Node>,
    visitingAliases: Set<Symbol>,
    depth: number
  ): boolean {
    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      this.collectReadonlyFromNode(node.type, result, seen, visitingAliases, depth + 1);

      return true;
    }

    if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
      node.types.forEach((member) => {
        this.collectReadonlyFromNode(member, result, seen, visitingAliases, depth + 1);
      });

      return true;
    }

    if (isTupleTypeNode(node)) {
      node.elements.forEach((element) => {
        this.collectReadonlyFromNode(
          isNamedTupleMember(element) ? element.type : element,
          result,
          seen,
          visitingAliases,
          depth + 1
        );
      });

      return true;
    }

    return false;
  }

  private collectReadonlyComposite(
    node: TypeNode,
    result: ReadonlyOutputEvidenceInterface[],
    seen: Set<Node>,
    visitingAliases: Set<Symbol>,
    depth: number
  ): boolean {
    if (isArrayTypeNode(node)) {
      this.collectReadonlyFromNode(node.elementType, result, seen, visitingAliases, depth + 1);

      return true;
    }

    if (isConditionalTypeNode(node)) {
      this.collectReadonlyFromNode(node.trueType, result, seen, visitingAliases, depth + 1);
      this.collectReadonlyFromNode(node.falseType, result, seen, visitingAliases, depth + 1);

      return true;
    }

    if (isFunctionTypeNode(node) || isConstructorTypeNode(node)) {
      this.collectReadonlyFromNode(node.type, result, seen, visitingAliases, depth + 1);

      return true;
    }

    return false;
  }

  private collectReadonlyEvidenceWrapper(
    node: TypeNode,
    result: ReadonlyOutputEvidenceInterface[],
    seen: Set<Node>,
    visitingAliases: Set<Symbol>,
    depth: number
  ): boolean {
    if (isMappedTypeNode(node)) {
      this.collectReadonlyFromMappedType(node, result, seen, visitingAliases, depth);

      return true;
    }

    if (isTypeOperatorNode(node)) {
      if (node.operator === SyntaxKind.ReadonlyKeyword) {
        this.addReadonlyEvidence(result, seen, node, 'readonlyArray', true);
        this.collectReadonlyFromNode(node.type, result, seen, visitingAliases, depth + 1);
      }

      return true;
    }

    if (isIndexedAccessTypeNode(node)) {
      return true;
    }

    if (isTypeLiteralNode(node)) {
      node.members.forEach((member) => {
        this.collectReadonlyFromTypeLiteralMember(member, result, seen, visitingAliases, depth);
      });

      return true;
    }

    return false;
  }

  private collectReadonlyFromMappedType(
    node: MappedTypeNode,
    result: ReadonlyOutputEvidenceInterface[],
    seen: Set<Node>,
    visitingAliases: Set<Symbol>,
    depth: number
  ): void {
    if (node.readonlyToken?.kind === SyntaxKind.ReadonlyKeyword || node.readonlyToken?.kind === SyntaxKind.PlusToken) {
      this.addReadonlyEvidence(result, seen, node, 'readonlyMapped', true);
    }
    if (node.type !== undefined) {
      this.collectReadonlyFromNode(node.type, result, seen, visitingAliases, depth + 1);
    }
  }

  private collectReadonlyFromTypeLiteralMember(
    member: TypeElement,
    result: ReadonlyOutputEvidenceInterface[],
    seen: Set<Node>,
    visitingAliases: Set<Symbol>,
    depth: number
  ): void {
    if (isPropertySignature(member)) {
      this.collectReadonlyFromPropertySignature(member, result, seen, visitingAliases, depth);

      return;
    }

    if (isIndexSignatureDeclaration(member)) {
      this.collectReadonlyFromIndexSignature(member, result, seen, visitingAliases, depth);

      return;
    }

    if (
      (isMethodSignature(member) || isCallSignatureDeclaration(member) || isConstructSignatureDeclaration(member))
      && member.type !== undefined
    ) {
      this.collectReadonlyFromNode(member.type, result, seen, visitingAliases, depth + 1);
    }
  }

  private collectReadonlyFromPropertySignature(
    member: PropertySignature,
    result: ReadonlyOutputEvidenceInterface[],
    seen: Set<Node>,
    visitingAliases: Set<Symbol>,
    depth: number
  ): void {
    if ((getCombinedModifierFlags(member) & ModifierFlags.Readonly) !== 0) {
      this.addReadonlyEvidence(result, seen, member, 'readonlyProperty', true);
    }
    if (member.type !== undefined) {
      this.collectReadonlyFromNode(member.type, result, seen, visitingAliases, depth + 1);
    }
  }

  private collectReadonlyFromIndexSignature(
    member: IndexSignatureDeclaration,
    result: ReadonlyOutputEvidenceInterface[],
    seen: Set<Node>,
    visitingAliases: Set<Symbol>,
    depth: number
  ): void {
    if ((getCombinedModifierFlags(member) & ModifierFlags.Readonly) !== 0) {
      this.addReadonlyEvidence(result, seen, member, 'readonlyIndex', true);
    }
    if (member.type !== undefined) {
      this.collectReadonlyFromNode(member.type, result, seen, visitingAliases, depth + 1);
    }
  }

  private collectReadonlyReference(
    node: TypeNode,
    result: ReadonlyOutputEvidenceInterface[],
    seen: Set<Node>,
    visitingAliases: Set<Symbol>,
    depth: number
  ): void {
    if (!isTypeReferenceNode(node)) {
      return;
    }

    if (this.context.isSchemaDerivedApplication(node)) {
      return;
    }

    if (this.context.isIntrinsic(node, 'Readonly') || this.context.isIntrinsic(node, 'ReadonlyArray')) {
      this.addReadonlyEvidence(result, seen, node, 'intrinsicReadonly', false);
      node.typeArguments?.forEach((typeArgument) => {
        this.collectReadonlyFromNode(typeArgument, result, seen, visitingAliases, depth + 1);
      });

      return;
    }

    this.addReadonlyAliasEvidence(node, result, seen, visitingAliases, depth);

    node.typeArguments?.forEach((typeArgument) => {
      this.collectReadonlyFromNode(typeArgument, result, seen, visitingAliases, depth + 1);
    });
  }

  private addReadonlyAliasEvidence(
    node: TypeReferenceNode,
    result: ReadonlyOutputEvidenceInterface[],
    seen: Set<Node>,
    visitingAliases: Set<Symbol>,
    depth: number
  ): void {
    const symbol = this.context.resolveSymbol(this.context.checker.getSymbolAtLocation(node.typeName));
    const alias = this.context.aliasDeclarationForSymbol(symbol);

    if (alias === undefined || symbol === undefined || visitingAliases.has(symbol)) {
      return;
    }

    const nested = this.readonlyOutputForAlias(alias, visitingAliases, depth + 1);

    if (nested.length > 0) {
      this.addReadonlyEvidence(result, seen, node, 'readonlyAlias', false);
    }
  }

  /**
   * Walks parenthesized types, union/intersection members, array element types, tuple members, and
   * type-reference type arguments to find a conditional, mapped, or indexed-access type that
   * determines the alias's own shape. Returns the first qualifying node, or undefined when the body
   * composes no type-level function surface.
   */
  public readonlyOutputForAlias(
    declaration: TypeAliasDeclaration,
    visitingAliases: Set<Symbol>,
    depth: number
  ): readonly ReadonlyOutputEvidenceInterface[] {
    const cached = this.readonlyCache.get(declaration);

    if (cached !== undefined) {
      return cached;
    }
    if (depth > MAXIMUM_RECURSION_DEPTH) {
      return [];
    }

    const symbol = this.context.checker.getSymbolAtLocation(declaration.name);

    if (symbol !== undefined && visitingAliases.has(symbol)) {
      return [];
    }

    const nextVisiting = new Set(visitingAliases);

    if (symbol !== undefined) {
      nextVisiting.add(symbol);
    }

    const result: ReadonlyOutputEvidenceInterface[] = [];
    const seen = new Set<Node>();

    this.collectReadonlyFromNode(declaration.type, result, seen, nextVisiting, depth + 1);

    const exposedParameters = new Set<Symbol>();

    this.collectExposedTypeParameters(declaration.type, exposedParameters, depth + 1);
    const typeParameters = declaration.typeParameters ?? [];

    typeParameters.forEach((parameter: TypeParameterDeclaration) => {
      if (parameter.default === undefined) {
        return;
      }
      const parameterSymbol = this.context.checker.getSymbolAtLocation(parameter.name);

      if (parameterSymbol === undefined || !exposedParameters.has(parameterSymbol)) {
        return;
      }

      const defaultEvidence: ReadonlyOutputEvidenceInterface[] = [];

      this.collectReadonlyFromNode(parameter.default, defaultEvidence, new Set(), nextVisiting, depth + 1);
      if (defaultEvidence.length > 0) {
        this.addReadonlyEvidence(result, seen, parameter.default, 'exposedDefault', false);
      }
    });

    this.readonlyCache.set(declaration, result);

    return result;
  }

}
