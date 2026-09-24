import {
  type ConditionalTypeNode,
  getCombinedModifierFlags,
  isArrayTypeNode,
  isCallSignatureDeclaration,
  isConditionalTypeNode,
  isConstructorTypeNode,
  isConstructSignatureDeclaration,
  isFunctionTypeNode,
  isIdentifier,
  isIndexedAccessTypeNode,
  isIndexSignatureDeclaration,
  isInferTypeNode,
  isIntersectionTypeNode,
  isMappedTypeNode,
  isMethodSignature,
  isModuleBlock,
  isModuleDeclaration,
  isNamedTupleMember,
  isOptionalTypeNode,
  isParenthesizedTypeNode,
  isPropertySignature,
  isRestTypeNode,
  isTupleTypeNode,
  isTypeLiteralNode,
  isTypeOperatorNode,
  isTypeQueryNode,
  isTypeReferenceNode,
  isUnionTypeNode,
  isVariableStatement,
  ModifierFlags,
  type ModuleBlock,
  type Symbol,
  SymbolFlags,
  SyntaxKind,
  type TypeAliasDeclaration,
  type TypeElement,
  type TypeLiteralNode,
  type TypeNode,
  type TypeOperatorNode,
  type TypeQueryNode,
  type TypeReferenceNode,
  type VariableStatement
} from 'typescript';

import type { TypeContractContext } from './TypeContractContext.js';
import type { TypeContractMetadataEntity } from './TypeContractMetadataEntity.js';

import { type AliasClassificationResultInterface } from './AliasClassificationResultInterface.js';
import { type ContractEvidenceInterface } from './ContractEvidenceInterface.js';
import { MAXIMUM_RECURSION_DEPTH } from './MaximumRecursionDepth.js';
import { type ReadonlyOutputEvidenceInterface } from './ReadonlyOutputEvidenceInterface.js';

interface TypeFunctionBodyProbeInterface {
  readonly 'matched': boolean;
  readonly 'value': TypeNode | undefined;
}

interface AliasContractProbeInterface {
  readonly 'matched': boolean;
  readonly 'value': ContractEvidenceInterface | undefined;
}

export class TypeContractAliasResolution {
  public constructor(private readonly context: TypeContractContext) {}

  private entityTypeAliasSchemaArgument(declaration: TypeAliasDeclaration): TypeQueryNode | undefined {
    if (
      declaration.name.text !== 'Type'
      || (getCombinedModifierFlags(declaration) & ModifierFlags.Export) === 0
      || !isTypeReferenceNode(declaration.type)
    ) {
      return undefined;
    }

    if (!this.context.isCanonicalFromSchemaReference(declaration.type.typeName)) {
      return undefined;
    }

    const schemaArgument = declaration.type.typeArguments?.at(0);

    if (schemaArgument === undefined || !isTypeQueryNode(schemaArgument) || !isIdentifier(schemaArgument.exprName)) {
      return undefined;
    }

    return schemaArgument;
  }

  public isCanonicalEntityTypeAlias(declaration: TypeAliasDeclaration): boolean {
    const schemaArgument = this.entityTypeAliasSchemaArgument(declaration);

    if (schemaArgument === undefined) {
      return false;
    }

    const schemaSymbol = this.context.checker.getSymbolAtLocation(schemaArgument.exprName);
    const namespaceBlock = declaration.parent;

    if (schemaSymbol === undefined || !isModuleBlock(namespaceBlock)) {
      return false;
    }

    const ownsSchema = this.moduleBlockDeclaresSymbol(namespaceBlock, schemaSymbol);
    const namespaceDeclaration = namespaceBlock.parent;
    const result = ownsSchema
      && isModuleDeclaration(namespaceDeclaration)
      && isIdentifier(namespaceDeclaration.name)
      && namespaceDeclaration.name.text.endsWith('Entity');

    return result;
  }

  private moduleBlockDeclaresSymbol(namespaceBlock: ModuleBlock, target: Symbol): boolean {
    const statements = namespaceBlock.statements;
    const statementCount = statements.length;

    for (let statementIndex = 0; statementIndex < statementCount; statementIndex += 1) {
      const statement = statements.at(statementIndex);

      if (statement === undefined || !isVariableStatement(statement)) {
        continue;
      }

      if (this.variableStatementDeclaresSymbol(statement, target)) {
        return true;
      }
    }

    return false;
  }

  private variableStatementDeclaresSymbol(statement: VariableStatement, target: Symbol): boolean {
    const declarations = statement.declarationList.declarations;
    const declarationCount = declarations.length;

    for (let declarationIndex = 0; declarationIndex < declarationCount; declarationIndex += 1) {
      const candidate = declarations.at(declarationIndex);

      if (candidate === undefined || !isIdentifier(candidate.name)) {
        continue;
      }

      if (this.context.checker.getSymbolAtLocation(candidate.name) === target) {
        return true;
      }
    }

    return false;
  }

  public classifyAlias(
    declaration: TypeAliasDeclaration,
    visiting: Set<Symbol>,
    depth: number
  ): AliasClassificationResultInterface {
    const readonlyOutput = this.context.dataNode.readonlyOutputForAlias(declaration, new Set(), depth);

    if (depth > MAXIMUM_RECURSION_DEPTH) {
      return {
        'classification': 'pureDataInvalid',
        'evidence': declaration,
        'readonlyOutput': readonlyOutput,
        'reason': 'depth'
      };
    }

    const symbol = this.context.checker.getSymbolAtLocation(declaration.name);

    if (symbol !== undefined && visiting.has(symbol)) {
      return {
        'classification': 'pureDataInvalid',
        'evidence': declaration.name,
        'readonlyOutput': readonlyOutput,
        'reason': 'cycle'
      };
    }

    const nextVisiting = new Set(visiting);

    if (this.isCanonicalEntityTypeAlias(declaration)) {
      return {
        'classification': 'pureDataCanonical',
        'evidence': declaration.type,
        'readonlyOutput': readonlyOutput,
        'reason': 'fromSchema'
      };
    }

    if (symbol !== undefined) {
      nextVisiting.add(symbol);
    }

    const typeFunctionResult = this.classifyAliasTypeFunction(declaration, readonlyOutput);

    if (typeFunctionResult !== undefined) {
      return typeFunctionResult;
    }

    const contract = this.findAliasContract(declaration.type, nextVisiting, depth + 1);

    if (contract !== undefined) {
      return {
        'classification': 'interfaceContract',
        'evidence': contract.node,
        'readonlyOutput': readonlyOutput,
        'reason': contract.reason
      };
    }

    const result = this.classifyAliasDataResult(declaration, nextVisiting, depth, readonlyOutput);

    return result;
  }

  private classifyAliasTypeFunction(
    declaration: TypeAliasDeclaration,
    readonlyOutput: readonly ReadonlyOutputEvidenceInterface[]
  ): AliasClassificationResultInterface | undefined {
    if (declaration.typeParameters === undefined || declaration.typeParameters.length === 0) {
      return undefined;
    }

    const typeFunctionBody = this.containsTypeFunctionBody(declaration.type, 0);

    if (typeFunctionBody === undefined) {
      return undefined;
    }

    return {
      'classification': 'typeFunction',
      'evidence': declaration.type,
      'readonlyOutput': readonlyOutput,
      'reason': this.typeFunctionReason(typeFunctionBody)
    };
  }

  private classifyAliasDataResult(
    declaration: TypeAliasDeclaration,
    visiting: Set<Symbol>,
    depth: number,
    readonlyOutput: readonly ReadonlyOutputEvidenceInterface[]
  ): AliasClassificationResultInterface {
    const data = this.context.dataNode.classifyDataNode(declaration.type, true, visiting, depth + 1);

    if (!data.valid || !data.canonicalRoot) {
      return {
        'classification': 'pureDataInvalid',
        'evidence': data.evidence,
        'readonlyOutput': readonlyOutput,
        'reason': data.reason
      };
    }

    return {
      'classification': 'pureDataCanonical',
      'evidence': data.evidence,
      'readonlyOutput': readonlyOutput,
      'reason': data.reason
    };
  }

  /**
   * Classifies a type node's callable/data composition for mixed-shape detection. Resolves
   * through parenthesized, optional, rest, and top-level `readonly` operator wrappers; flattens
   * nested unions and intersections so a constituent that is itself mixed propagates both flags
   * to the caller; and resolves named references through interfaces and type aliases
   * (cycle-guarded by `visiting`). An interface reference is callable only when
   * {@link interfaceHasCallSignature} finds an actual call or construct signature; a `pureData`
   * interface (per {@link analyzeInterface}) is data; any other contract reason — a method,
   * brand, class-instance, readonly, or non-JSON computation — is neither: that interface is
   * already a runtime contract in this codebase's ontology, not schema-derived data, so pairing
   * it with an actual function does not make the union "mixed" on its own. `undefined`, `null`,
   * and `never` likewise report neither flag. `Array`, `Readonly`, and `ReadonlyArray` intrinsics
   * report data without inspecting their element type — an array of functions is still a data
   * container, not a callable shape.
   */
  private typeFunctionBodyTerminalOrUnwrap(node: TypeNode, depth: number): TypeFunctionBodyProbeInterface {
    if (isConditionalTypeNode(node) || isMappedTypeNode(node) || isIndexedAccessTypeNode(node)) {
      return {
        'matched': true, 'value': node
      };
    }

    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      const value = this.containsTypeFunctionBody(node.type, depth + 1);

      return {
        'matched': true, 'value': value
      };
    }

    return {
      'matched': false, 'value': undefined
    };
  }

  private typeFunctionBodyInMembers(members: readonly TypeNode[], depth: number): TypeNode | undefined {
    const length = members.length;

    for (let index = 0; index < length; index++) {
      const member = members.at(index);

      if (member === undefined) {
        continue;
      }
      const found = this.containsTypeFunctionBody(member, depth + 1);

      if (found !== undefined) {
        return found;
      }
    }

    return undefined;
  }

  private typeFunctionBodyInReference(node: TypeReferenceNode, depth: number): TypeNode | undefined {
    const typeArguments = node.typeArguments ?? [];
    const inArguments = this.typeFunctionBodyInMembers(typeArguments, depth);

    if (inArguments !== undefined) {
      return inArguments;
    }

    const result = this.delegatedTypeFunctionBody(node, depth + 1);

    return result;
  }

  private containsTypeFunctionBody(node: TypeNode, depth: number): TypeNode | undefined {
    if (depth > MAXIMUM_RECURSION_DEPTH) {
      return undefined;
    }

    const simple = this.typeFunctionBodyTerminalOrUnwrap(node, depth);

    if (simple.matched) {
      return simple.value;
    }

    if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
      const result = this.typeFunctionBodyInMembers(node.types, depth);

      return result;
    }

    if (isArrayTypeNode(node)) {
      const result = this.containsTypeFunctionBody(node.elementType, depth + 1);

      return result;
    }

    if (isTupleTypeNode(node)) {
      const elementTypes = node.elements.map((element) => {
        const elementType = isNamedTupleMember(element) ? element.type : element;

        return elementType;
      });
      const result = this.typeFunctionBodyInMembers(elementTypes, depth);

      return result;
    }

    if (isTypeReferenceNode(node)) {
      const result = this.typeFunctionBodyInReference(node, depth);

      return result;
    }

    return undefined;
  }

  /**
   * A reference that forwards a type parameter to another generic alias delegates that alias's
   * computation. `Delegating<S> = Resolve<S>` performs whatever `Resolve` performs, so the
   * delegating alias is a type-level function too. A reference supplying only concrete arguments
   * composes a value instead — `Record<string, string>` names a shape rather than deferring one —
   * and keeps its contract-portion classification.
   */
  private typeArgumentsForwardTypeParameter(typeArguments: readonly TypeNode[]): boolean {
    const argumentCount = typeArguments.length;

    for (let index = 0; index < argumentCount; index++) {
      const typeArgument = typeArguments.at(index);

      if (typeArgument !== undefined && this.context.containsTypeParameterReference(typeArgument)) {
        return true;
      }
    }

    return false;
  }

  private delegatedTypeFunctionBody(node: TypeReferenceNode, depth: number): TypeNode | undefined {
    if (depth > MAXIMUM_RECURSION_DEPTH) {
      return undefined;
    }

    const typeArguments = node.typeArguments ?? [];

    if (!this.typeArgumentsForwardTypeParameter(typeArguments)) {
      return undefined;
    }

    const alias = this.context.aliasDeclarationForSymbol(this.context.checker.getSymbolAtLocation(node.typeName));

    if (alias === undefined) {
      return undefined;
    }
    if ((alias.typeParameters?.length ?? 0) === 0) {
      return undefined;
    }

    const result = this.containsTypeFunctionBody(alias.type, depth + 1);

    return result;
  }

  /**
   * Recognizes the "distributive identity" conditional shape — `X extends infer R ? R : never`,
   * or the same shape with `never` replaced by another bare reference to the same inferred `R` —
   * and returns the checked type `X` when it matches. Both branches of this shape just re-expose
   * whatever was checked; no genuine branching occurs. Returns `undefined` for any conditional
   * whose branches actually diverge, since that IS real type-level logic and stays contract
   * evidence.
   */
  public distributiveIdentityConditionalCheckType(node: ConditionalTypeNode): TypeNode | undefined {
    if (!isInferTypeNode(node.extendsType)) {
      return undefined;
    }

    const inferredSymbol = this.context.checker.getSymbolAtLocation(node.extendsType.typeParameter.name);

    if (inferredSymbol === undefined) {
      return undefined;
    }
    if (!this.isBareReferenceToSymbol(node.trueType, inferredSymbol)) {
      return undefined;
    }

    if (node.falseType.kind === SyntaxKind.NeverKeyword) {
      return node.checkType;
    }
    if (this.isBareReferenceToSymbol(node.falseType, inferredSymbol)) {
      return node.checkType;
    }

    return undefined;
  }

  private isBareReferenceToSymbol(node: TypeNode, symbol: Symbol): boolean {
    if (!isTypeReferenceNode(node) || node.typeArguments !== undefined) {
      return false;
    }

    const result = this.context.checker.getSymbolAtLocation(node.typeName) === symbol;

    return result;
  }

  private static readonly ALIAS_CONTRACT_PRIMITIVE_REASONS = new Map<SyntaxKind, TypeContractMetadataEntity.Type['contractReason']>([
    [SyntaxKind.AnyKeyword, 'any'],
    [SyntaxKind.BigIntKeyword, 'bigint'],
    [SyntaxKind.NeverKeyword, 'never'],
    [SyntaxKind.SymbolKeyword, 'symbol'],
    [SyntaxKind.ThisType, 'nonJson'],
    [SyntaxKind.TypeQuery, 'nonJson'],
    [SyntaxKind.UndefinedKeyword, 'undefined'],
    [SyntaxKind.UnknownKeyword, 'unknown'],
    [SyntaxKind.VoidKeyword, 'undefined']
  ]);

  private static readonly NON_SCHEMA_CONTRACT_REASONS = new Set<TypeContractMetadataEntity.Type['aliasReason']>([
    'any', 'bigint', 'brand', 'callable', 'classInstance', 'conditional', 'constructor',
    'indexedAccess', 'interfaceReference', 'mapped', 'never', 'nonJson', 'symbol', 'undefined', 'unknown'
  ]);

  private static isNonSchemaContractReason(
    reason: TypeContractMetadataEntity.Type['aliasReason']
  ): reason is TypeContractMetadataEntity.Type['contractReason'] {
    const result = TypeContractAliasResolution.NON_SCHEMA_CONTRACT_REASONS.has(reason);

    return result;
  }

  private findAliasContract(
    node: TypeNode,
    visiting: Set<Symbol>,
    depth: number
  ): ContractEvidenceInterface | undefined {
    if (depth > MAXIMUM_RECURSION_DEPTH) {
      return {
        'node': node, 'reason': 'nonJson'
      };
    }

    if (this.context.isSchemaDerivedApplication(node)) {
      return undefined;
    }

    const terminalA = this.aliasContractTerminalA(node, visiting, depth);

    if (terminalA.matched) {
      return terminalA.value;
    }

    const terminalB = this.aliasContractTerminalB(node, visiting, depth);

    if (terminalB.matched) {
      return terminalB.value;
    }

    const composite = this.aliasContractComposite(node, visiting, depth);

    if (composite.matched) {
      return composite.value;
    }

    if (isTypeReferenceNode(node)) {
      const result = this.aliasContractTypeReference(node, visiting, depth);

      return result;
    }

    const reason = TypeContractAliasResolution.ALIAS_CONTRACT_PRIMITIVE_REASONS.get(node.kind);

    if (reason !== undefined) {
      return {
        'node': node, 'reason': reason
      };
    }

    return undefined;
  }

  private aliasContractTerminalA(node: TypeNode, visiting: Set<Symbol>, depth: number): AliasContractProbeInterface {
    if (isFunctionTypeNode(node)) {
      return {
        'matched': true, 'value': { 'node': node, 'reason': 'callable' }
      };
    }
    if (isConstructorTypeNode(node)) {
      return {
        'matched': true, 'value': { 'node': node, 'reason': 'constructor' }
      };
    }
    if (isMappedTypeNode(node)) {
      return {
        'matched': true, 'value': { 'node': node, 'reason': 'mapped' }
      };
    }
    if (isIndexedAccessTypeNode(node)) {
      return {
        'matched': true, 'value': { 'node': node, 'reason': 'indexedAccess' }
      };
    }
    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      const value = this.findAliasContract(node.type, visiting, depth + 1);

      return {
        'matched': true, 'value': value
      };
    }

    return {
      'matched': false, 'value': undefined
    };
  }

  private aliasContractTerminalB(node: TypeNode, visiting: Set<Symbol>, depth: number): AliasContractProbeInterface {
    if (isConditionalTypeNode(node)) {
      const value = this.aliasContractForConditional(node, visiting, depth);

      return {
        'matched': true, 'value': value
      };
    }

    if (isTypeOperatorNode(node)) {
      const value = this.aliasContractForTypeOperator(node, visiting, depth);

      return {
        'matched': true, 'value': value
      };
    }

    return {
      'matched': false, 'value': undefined
    };
  }

  // A distributive identity conditional (`X extends infer R ? R : never`, or the same shape
  // with `never` replaced by another bare reference to `R`) performs no actual type-level
  // computation — both branches just re-expose the checked type unchanged. Only a conditional
  // whose branches diverge is genuine type-level logic and therefore real contract evidence.
  private aliasContractForConditional(
    node: ConditionalTypeNode,
    visiting: Set<Symbol>,
    depth: number
  ): ContractEvidenceInterface | undefined {
    const identityCheckType = this.distributiveIdentityConditionalCheckType(node);

    if (identityCheckType !== undefined) {
      const result = this.findAliasContract(identityCheckType, visiting, depth + 1);

      return result;
    }

    return {
      'node': node, 'reason': 'conditional'
    };
  }

  private aliasContractForTypeOperator(
    node: TypeOperatorNode,
    visiting: Set<Symbol>,
    depth: number
  ): ContractEvidenceInterface | undefined {
    if (node.operator === SyntaxKind.UniqueKeyword) {
      return {
        'node': node, 'reason': 'brand'
      };
    }
    if (node.operator === SyntaxKind.KeyOfKeyword) {
      return {
        'node': node, 'reason': 'nonJson'
      };
    }

    const result = this.findAliasContract(node.type, visiting, depth + 1);

    return result;
  }

  private aliasContractComposite(node: TypeNode, visiting: Set<Symbol>, depth: number): AliasContractProbeInterface {
    if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
      const value = this.aliasContractInMembers(node.types, visiting, depth);

      return {
        'matched': true, 'value': value
      };
    }

    if (isTupleTypeNode(node)) {
      const elementTypes = node.elements.map((element) => {
        const elementType = isNamedTupleMember(element) ? element.type : element;

        return elementType;
      });
      const value = this.aliasContractInMembers(elementTypes, visiting, depth);

      return {
        'matched': true, 'value': value
      };
    }

    if (isArrayTypeNode(node)) {
      const value = this.findAliasContract(node.elementType, visiting, depth + 1);

      return {
        'matched': true, 'value': value
      };
    }

    if (isTypeLiteralNode(node)) {
      const value = this.aliasContractInTypeLiteral(node, visiting, depth);

      return {
        'matched': true, 'value': value
      };
    }

    return {
      'matched': false, 'value': undefined
    };
  }

  private aliasContractInMembers(
    members: readonly TypeNode[],
    visiting: Set<Symbol>,
    depth: number
  ): ContractEvidenceInterface | undefined {
    const length = members.length;

    for (let index = 0; index < length; index++) {
      const member = members.at(index);

      if (member === undefined) {
        continue;
      }
      const evidence = this.findAliasContract(member, visiting, depth + 1);

      if (evidence !== undefined) {
        return evidence;
      }
    }

    return undefined;
  }

  private aliasContractInTypeLiteral(
    node: TypeLiteralNode,
    visiting: Set<Symbol>,
    depth: number
  ): ContractEvidenceInterface | undefined {
    const members = node.members;
    const length = members.length;

    for (let index = 0; index < length; index++) {
      const member = members.at(index);

      if (member === undefined) {
        continue;
      }
      const evidence = this.aliasContractForTypeLiteralMember(member, visiting, depth);

      if (evidence !== undefined) {
        return evidence;
      }
    }

    return undefined;
  }

  private aliasContractForTypeLiteralMember(
    member: TypeElement,
    visiting: Set<Symbol>,
    depth: number
  ): ContractEvidenceInterface | undefined {
    if (isMethodSignature(member) || isCallSignatureDeclaration(member)) {
      return {
        'node': member, 'reason': 'callable'
      };
    }
    if (isConstructSignatureDeclaration(member)) {
      return {
        'node': member, 'reason': 'constructor'
      };
    }
    if ((isPropertySignature(member) || isIndexSignatureDeclaration(member)) && member.type !== undefined) {
      if (this.context.isBrandMember(member)) {
        return {
          'node': member, 'reason': 'brand'
        };
      }
      const result = this.findAliasContract(member.type, visiting, depth + 1);

      return result;
    }

    return undefined;
  }

  public isArrayLikeIntrinsicReference(node: TypeReferenceNode): boolean {
    const result = this.context.isIntrinsic(node, 'Array') || this.context.isIntrinsic(node, 'Readonly') || this.context.isIntrinsic(node, 'ReadonlyArray');

    return result;
  }

  private isClassInstanceReference(node: TypeReferenceNode, symbol: Symbol | undefined): boolean {
    if (this.context.isRuntimeType(node)) {
      return true;
    }

    const result = symbol !== undefined && (symbol.flags & SymbolFlags.Class) !== 0;

    return result;
  }

  private aliasContractTypeReference(
    node: TypeReferenceNode,
    visiting: Set<Symbol>,
    depth: number
  ): ContractEvidenceInterface | undefined {
    if (this.context.isFromSchemaNamedReference(node)) {
      return undefined;
    }
    if (this.isArrayLikeIntrinsicReference(node)) {
      const typeArguments = node.typeArguments ?? [];
      const result = this.aliasContractInMembers(typeArguments, visiting, depth);

      return result;
    }

    const symbol = this.context.resolveSymbol(this.context.checker.getSymbolAtLocation(node.typeName));

    if (this.isClassInstanceReference(node, symbol)) {
      return {
        'node': node, 'reason': 'classInstance'
      };
    }

    const interfaceDeclaration = this.context.interfaceDeclarationForSymbol(symbol);

    if (
      interfaceDeclaration !== undefined
      && this.context.interfaceContract.classifyInterface(interfaceDeclaration, visiting, depth + 1).classification === 'contract'
    ) {
      return {
        'node': node, 'reason': 'interfaceReference'
      };
    }

    const aliasEvidence = this.aliasContractFromAliasDeclaration(node, symbol, visiting, depth);

    if (aliasEvidence !== undefined) {
      return aliasEvidence;
    }

    const typeArguments = node.typeArguments ?? [];
    const result = this.aliasContractInMembers(typeArguments, visiting, depth);

    return result;
  }

  // A type-level function carries its computation into every reference. The declaration is
  // exempt from the interface remedy; a reference to it composes the same contract portion
  // an inline conditional, mapped, or indexed body would.
  private aliasContractFromAliasDeclaration(
    node: TypeReferenceNode,
    symbol: Symbol | undefined,
    visiting: Set<Symbol>,
    depth: number
  ): ContractEvidenceInterface | undefined {
    const alias = this.context.aliasDeclarationForSymbol(symbol);

    if (alias === undefined || symbol === undefined || visiting.has(symbol)) {
      return undefined;
    }

    const nested = this.classifyAlias(alias, visiting, depth + 1);

    if (nested.classification !== 'interfaceContract' && nested.classification !== 'typeFunction') {
      return undefined;
    }

    if (!TypeContractAliasResolution.isNonSchemaContractReason(nested.reason)) {
      return undefined;
    }

    return {
      'node': node, 'reason': nested.reason
    };
  }

  /**
   * A call or construct signature — narrower than {@link findInterfaceContract}'s general
   * contract evidence — makes an interface directly invocable. Method signatures do not qualify:
   * `Promise`, `Map`, `Array`, and similar lib interfaces expose many methods without being
   * callable themselves, so treating a method as call evidence here would misclassify every
   * reference to a plain method-bearing interface as a callable constituent. Inherited through
   * heritage clauses, cycle-guarded by `visiting`.
   */
  private typeFunctionReason(node: TypeNode): TypeContractMetadataEntity.Type['aliasReason'] {
    if (isConditionalTypeNode(node)) {
      return 'conditional';
    }
    if (isMappedTypeNode(node)) {
      return 'mapped';
    }

    return 'indexedAccess';
  }

}
