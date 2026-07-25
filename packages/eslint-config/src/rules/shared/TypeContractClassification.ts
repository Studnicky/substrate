import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import {
  getCombinedModifierFlags,
  type InterfaceDeclaration,
  type IntersectionTypeNode,
  isArrayTypeNode,
  isAsExpression,
  isCallExpression,
  isCallSignatureDeclaration,
  isConditionalTypeNode,
  isConstructorTypeNode,
  isConstructSignatureDeclaration,
  isConstTypeReference,
  isFunctionTypeNode,
  isImportDeclaration,
  isImportSpecifier,
  isIndexedAccessTypeNode,
  isIndexSignatureDeclaration,
  isInterfaceDeclaration,
  isIntersectionTypeNode,
  isLiteralTypeNode,
  isMappedTypeNode,
  isMethodSignature,
  isNamedTupleMember,
  isNamespaceImport,
  isObjectLiteralExpression,
  isOptionalTypeNode,
  isParenthesizedTypeNode,
  isPropertySignature,
  isQualifiedName,
  isRestTypeNode,
  isSatisfiesExpression,
  isStringLiteral,
  isTupleTypeNode,
  isTypeAliasDeclaration,
  isTypeLiteralNode,
  isTypeOperatorNode,
  isTypeQueryNode,
  isTypeReferenceNode,
  isUnionTypeNode,
  isVariableDeclaration,
  ModifierFlags,
  type Node,
  NodeFlags,
  type Program,
  SignatureKind,
  type Symbol,
  SymbolFlags,
  SyntaxKind,
  type Type,
  type TypeAliasDeclaration,
  type TypeChecker,
  TypeFlags,
  type TypeNode,
  type TypeParameterDeclaration,
  type TypeQueryNode,
  type TypeReferenceNode,
  type UnionTypeNode
} from 'typescript';

namespace TypeContractMetadataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'aliasClassification': { 'enum': ['interfaceContract', 'pureDataCanonical', 'pureDataInvalid', 'typeFunction'] },
      'aliasReason': {
        'enum': ['any', 'bigint', 'brand', 'callable', 'canonicalComposition', 'classInstance', 'conditional', 'constructor', 'cycle', 'depth', 'fromSchema', 'indexedAccess', 'inlineObject', 'interfaceReference', 'mapped', 'nakedRename', 'never', 'nonJson', 'primitiveForwarding', 'symbol', 'typeParameter', 'undefined', 'unknown', 'unresolvedReference']
      },
      'canonicalRoot': { 'type': 'boolean' },
      'contractReason': {
        'enum': ['any', 'bigint', 'brand', 'callable', 'classInstance', 'conditional', 'constructor', 'indexedAccess', 'interfaceReference', 'mapped', 'never', 'nonJson', 'symbol', 'undefined', 'unknown']
      },
      'fixable': { 'type': 'boolean' },
      'hasCallable': { 'type': 'boolean' },
      'hasData': { 'type': 'boolean' },
      'interfaceClassification': { 'enum': ['contract', 'pureData'] },
      'interfaceContractReason': { 'enum': ['brand', 'callable', 'classInstance', 'constructor', 'nonJson', 'readonly'] },
      'interfaceReason': { 'enum': ['brand', 'callable', 'classInstance', 'constructor', 'nonJson', 'pureData', 'readonly'] },
      'readonlyReason': { 'enum': ['exposedDefault', 'intrinsicReadonly', 'readonlyAlias', 'readonlyArray', 'readonlyIndex', 'readonlyMapped', 'readonlyProperty'] },
      'valid': { 'type': 'boolean' }
    },
    'required': ['aliasClassification', 'aliasReason', 'canonicalRoot', 'contractReason', 'fixable', 'hasCallable', 'hasData', 'interfaceClassification', 'interfaceContractReason', 'interfaceReason', 'readonlyReason', 'valid'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}

interface ReadonlyOutputEvidenceInterface {
  readonly 'fixable': TypeContractMetadataEntity.Type['fixable'];
  readonly 'node': Node;
  readonly 'reason': TypeContractMetadataEntity.Type['readonlyReason'];
}

interface AliasClassificationResultInterface {
  readonly 'classification': TypeContractMetadataEntity.Type['aliasClassification'];
  readonly 'evidence': Node;
  readonly 'readonlyOutput': readonly ReadonlyOutputEvidenceInterface[];
  readonly 'reason': TypeContractMetadataEntity.Type['aliasReason'];
}

interface InterfaceClassificationResultInterface {
  readonly 'classification': TypeContractMetadataEntity.Type['interfaceClassification'];
  readonly 'evidence': Node;
  readonly 'reason': TypeContractMetadataEntity.Type['interfaceReason'];
}

interface DataNodeResultInterface {
  readonly 'canonicalRoot': TypeContractMetadataEntity.Type['canonicalRoot'];
  readonly 'evidence': Node;
  readonly 'reason': TypeContractMetadataEntity.Type['aliasReason'];
  readonly 'valid': TypeContractMetadataEntity.Type['valid'];
}

interface ContractEvidenceInterface {
  readonly 'node': Node;
  readonly 'reason': TypeContractMetadataEntity.Type['contractReason'];
}

interface InterfaceContractEvidenceInterface {
  readonly 'node': Node;
  readonly 'reason': TypeContractMetadataEntity.Type['interfaceContractReason'];
}

interface CallabilityFlagsInterface {
  readonly 'hasCallable': TypeContractMetadataEntity.Type['hasCallable'];
  readonly 'hasData': TypeContractMetadataEntity.Type['hasData'];
}

namespace SchemaDerivationMetadataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'valid': { 'type': 'boolean' }
    },
    'required': ['valid'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}

interface SchemaDerivationShapeInterface {
  readonly 'derivingReference': TypeReferenceNode | undefined;
  readonly 'valueQuery': TypeQueryNode;
}

interface SchemaValueAuthoringInterface {
  readonly 'builderCallee': Symbol | undefined;
  readonly 'valid': SchemaDerivationMetadataEntity.Type['valid'];
}

const MAX_DEPTH = 100;
/**
 * Provides the shared semantic declaration classification consumed by the
 * entity/type rules. The service is cached per TypeScript Program and never
 * reports diagnostics or applies placement/configuration policy.
 */
export class TypeContractClassification {
  private static readonly programs = new WeakMap<Program, TypeContractClassification>();

  private readonly aliasCache: WeakMap<TypeAliasDeclaration, AliasClassificationResultInterface>;
  private readonly checker: TypeChecker;
  private readonly interfaceCache: WeakMap<InterfaceDeclaration, InterfaceClassificationResultInterface>;
  private readonly readonlyCache: WeakMap<TypeAliasDeclaration, readonly ReadonlyOutputEvidenceInterface[]>;

  private constructor(program: Program) {
    this.aliasCache = new WeakMap();
    this.checker = program.getTypeChecker();
    this.interfaceCache = new WeakMap();
    this.readonlyCache = new WeakMap();
  }

  public static forProgram(program: Program): TypeContractClassification {
    const cached = TypeContractClassification.programs.get(program);
    if (cached !== undefined) { return cached; }

    const classification = new TypeContractClassification(program);
    TypeContractClassification.programs.set(program, classification);
    return classification;
  }

  public analyzeAlias(declaration: TypeAliasDeclaration): AliasClassificationResultInterface {
    const cached = this.aliasCache.get(declaration);
    if (cached !== undefined) { return cached; }

    const result = this.classifyAlias(declaration, new Set(), 0);
    this.aliasCache.set(declaration, result);
    return result;
  }

  public analyzeInterface(declaration: InterfaceDeclaration): InterfaceClassificationResultInterface {
    const cached = this.interfaceCache.get(declaration);
    if (cached !== undefined) { return cached; }

    const result = this.classifyInterface(declaration, new Set(), 0);
    this.interfaceCache.set(declaration, result);
    return result;
  }

  public isInlinePureDataPortion(node: Node): boolean {
    if (isTypeLiteralNode(node)) {
      return this.findInterfaceTypeContract(node, new Set(), 0) === undefined;
    }

    if (!isMappedTypeNode(node) || node.type === undefined) { return false; }
    if (
      node.readonlyToken?.kind === SyntaxKind.ReadonlyKeyword
      || node.readonlyToken?.kind === SyntaxKind.PlusToken
    ) {
      return false;
    }

    return this.findInterfaceTypeContract(node.type, new Set(), 0) === undefined;
  }

  public isInlineContractPortion(node: Node): boolean {
    if (!isTypeLiteralNode(node) && !isMappedTypeNode(node)) { return false; }
    return this.findInterfaceTypeContract(node, new Set(), 0) !== undefined;
  }

  public containsTypeParameterReference(node: Node): boolean {
    if (isTypeReferenceNode(node)) {
      const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));
      if (symbol !== undefined && (symbol.flags & SymbolFlags.TypeParameter) !== 0) { return true; }
    }

    let containsTypeParameter = false;
    node.forEachChild((child) => {
      if (!containsTypeParameter && this.containsTypeParameterReference(child)) {
        containsTypeParameter = true;
      }
    });
    return containsTypeParameter;
  }

  public requiresNamedDataComposition(node: TypeNode): boolean {
    if (this.findInterfaceTypeContract(node, new Set(), 0) !== undefined) { return false; }
    if (this.containsTypeParameterReference(node)) { return false; }

    const data = this.classifyDataNode(node, false, new Set(), 0);
    return !data.valid || !data.canonicalRoot;
  }

  /**
   * A union or intersection mixes shapes when at least one constituent is callable or
   * constructable and at least one other constituent is data. A callable/constructable
   * constituent belongs in an interface; a data constituent belongs in a schema-derived type —
   * TypeScript has no syntax for an interface that is itself a union, so mixing the two in one
   * type position has no interface remedy. `undefined`, `null`, and `never` constituents are
   * neutral and never make a union mixed on their own (an optional callable stays one shape).
   */
  public mixesCallableAndData(node: IntersectionTypeNode | UnionTypeNode): boolean {
    const flags = this.classifyCallability(node, new Set(), 0);
    return flags.hasCallable && flags.hasData;
  }

  /**
   * An alias whose own declared type is directly a mixed union or intersection has no interface
   * remedy at all — TypeScript cannot express `interface X { (): void } | { a: 1 }`. Unwraps only
   * a parenthesized wrapper, since `type X = ((() => void) | { a: 1 });` is the same top-level
   * shape. A mixed union nested inside a property (`{ slot: (() => void) | { a: 1 } }`) is
   * excluded — wrapping that outer shape in an interface remains valid TypeScript, so the alias
   * remedy stays followable there even though the property itself still needs a split.
   */
  public isTopLevelMixedCallableData(node: TypeNode): boolean {
    if (isParenthesizedTypeNode(node)) { return this.isTopLevelMixedCallableData(node.type); }
    if (!isUnionTypeNode(node) && !isIntersectionTypeNode(node)) { return false; }
    return this.mixesCallableAndData(node);
  }

  private addReadonlyEvidence(
    result: ReadonlyOutputEvidenceInterface[],
    seen: Set<Node>,
    node: Node,
    reason: 'exposedDefault' | 'intrinsicReadonly' | 'readonlyAlias' | 'readonlyArray' | 'readonlyIndex' | 'readonlyMapped' | 'readonlyProperty',
    fixable: boolean
  ): void {
    if (seen.has(node)) { return; }
    seen.add(node);
    result.push({ 'fixable': fixable, 'node': node, 'reason': reason });
  }

  private aliasDeclarationForSymbol(symbol: Symbol | undefined): TypeAliasDeclaration | undefined {
    const resolved = this.resolveSymbol(symbol);
    if (resolved === undefined) { return undefined; }

    const declarations = resolved.getDeclarations() ?? [];
    const length = declarations.length;
    for (let index = 0; index < length; index++) {
      const declaration = declarations[index];
      if (declaration !== undefined && isTypeAliasDeclaration(declaration)) { return declaration; }
    }
    return undefined;
  }

  private classifyAlias(
    declaration: TypeAliasDeclaration,
    visiting: Set<Symbol>,
    depth: number
  ): AliasClassificationResultInterface {
    const readonlyOutput = this.readonlyOutputForAlias(declaration, new Set(), depth);

    if (depth > MAX_DEPTH) {
      return {
        'classification': 'pureDataInvalid',
        'evidence': declaration,
        'readonlyOutput': readonlyOutput,
        'reason': 'depth'
      };
    }

    const symbol = this.checker.getSymbolAtLocation(declaration.name);
    if (symbol !== undefined && visiting.has(symbol)) {
      return {
        'classification': 'pureDataInvalid',
        'evidence': declaration.name,
        'readonlyOutput': readonlyOutput,
        'reason': 'cycle'
      };
    }

    const nextVisiting = new Set(visiting);
    if (symbol !== undefined) { nextVisiting.add(symbol); }

    if (declaration.typeParameters !== undefined && declaration.typeParameters.length > 0) {
      const typeFunctionBody = this.containsTypeFunctionBody(declaration.type, 0);
      if (typeFunctionBody !== undefined) {
        return {
          'classification': 'typeFunction',
          'evidence': declaration.type,
          'readonlyOutput': readonlyOutput,
          'reason': this.typeFunctionReason(typeFunctionBody)
        };
      }
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

    const data = this.classifyDataNode(declaration.type, true, nextVisiting, depth + 1);
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
  private classifyCallability(
    node: TypeNode,
    visiting: Set<Symbol>,
    depth: number
  ): CallabilityFlagsInterface {
    if (depth > MAX_DEPTH) { return { 'hasCallable': false, 'hasData': true }; }

    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      return this.classifyCallability(node.type, visiting, depth + 1);
    }

    if (isTypeOperatorNode(node) && node.operator === SyntaxKind.ReadonlyKeyword) {
      return this.classifyCallability(node.type, visiting, depth + 1);
    }

    const kind = node.kind;
    if (kind === SyntaxKind.UndefinedKeyword || kind === SyntaxKind.NeverKeyword) {
      return { 'hasCallable': false, 'hasData': false };
    }

    // `null` as a type is a `LiteralTypeNode` wrapping a `NullKeyword` literal, not a bare
    // keyword type node — unlike `undefined`, which TypeScript represents directly.
    if (isLiteralTypeNode(node) && node.literal.kind === SyntaxKind.NullKeyword) {
      return { 'hasCallable': false, 'hasData': false };
    }

    if (isFunctionTypeNode(node) || isConstructorTypeNode(node)) {
      return { 'hasCallable': true, 'hasData': false };
    }

    if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
      let hasCallable = false;
      let hasData = false;
      const members = node.types;
      const length = members.length;
      for (let index = 0; index < length; index++) {
        const member = members[index];
        if (member === undefined) { continue; }
        const classified = this.classifyCallability(member, visiting, depth + 1);
        hasCallable = hasCallable || classified.hasCallable;
        hasData = hasData || classified.hasData;
      }
      return { 'hasCallable': hasCallable, 'hasData': hasData };
    }

    if (isTypeLiteralNode(node)) {
      const isCallableLiteral = node.members.some((member) => {return (
        isCallSignatureDeclaration(member) || isConstructSignatureDeclaration(member)
      );});
      return isCallableLiteral
        ? { 'hasCallable': true, 'hasData': false }
        : { 'hasCallable': false, 'hasData': true };
    }

    if (isTypeReferenceNode(node)) {
      if (this.isIntrinsic(node, 'Array') || this.isIntrinsic(node, 'Readonly') || this.isIntrinsic(node, 'ReadonlyArray')) {
        return { 'hasCallable': false, 'hasData': true };
      }

      const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));
      const declarations = symbol?.getDeclarations() ?? [];
      const interfaceDeclaration = declarations.find(isInterfaceDeclaration);
      if (interfaceDeclaration !== undefined) {
        if (this.interfaceHasCallSignature(interfaceDeclaration, new Set(), 0)) {
          return { 'hasCallable': true, 'hasData': false };
        }
        if (this.analyzeInterface(interfaceDeclaration).classification === 'pureData') {
          return { 'hasCallable': false, 'hasData': true };
        }
        // A method, brand, class-instance, readonly, or other non-JSON contract reason is a
        // runtime contract in this codebase's own ontology (see `interface-must-be-contract`),
        // not schema-derived data. `Promise`, `Map`, and similar lib interfaces land here too —
        // treating their methods as call evidence would flag the pervasive `Promise<T> | T`
        // return-type idiom as mixed. Neither flag; it never makes a union "mixed" on its own.
        return { 'hasCallable': false, 'hasData': false };
      }

      if (symbol !== undefined && !visiting.has(symbol)) {
        const alias = this.aliasDeclarationForSymbol(symbol);
        if (alias !== undefined) {
          const nextVisiting = new Set(visiting);
          nextVisiting.add(symbol);
          return this.classifyCallability(alias.type, nextVisiting, depth + 1);
        }
      }

      return { 'hasCallable': false, 'hasData': true };
    }

    return { 'hasCallable': false, 'hasData': true };
  }

  private classifyDataNode(
    node: TypeNode,
    root: boolean,
    visiting: Set<Symbol>,
    depth: number
  ): DataNodeResultInterface {
    if (depth > MAX_DEPTH) {
      return { 'canonicalRoot': false, 'evidence': node, 'reason': 'depth', 'valid': false };
    }

    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      return this.classifyDataNode(node.type, root, visiting, depth + 1);
    }

    if (isTypeOperatorNode(node) && node.operator === SyntaxKind.ReadonlyKeyword) {
      return this.classifyDataNode(node.type, root, visiting, depth + 1);
    }

    if (this.isSchemaDerivedApplication(node)) {
      return this.classifySchemaDerivedApplication(node);
    }

    if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
      let canonicalRoot = false;
      const members = node.types;
      const length = members.length;
      for (let index = 0; index < length; index++) {
        const member = members[index];
        if (member === undefined) { continue; }
        const classified = this.classifyDataNode(member, false, visiting, depth + 1);
        if (!classified.valid) { return classified; }
        canonicalRoot = canonicalRoot || classified.canonicalRoot;
      }
      return {
        'canonicalRoot': canonicalRoot,
        'evidence': node,
        'reason': canonicalRoot ? 'canonicalComposition' : 'primitiveForwarding',
        'valid': canonicalRoot
      };
    }

    if (isTupleTypeNode(node)) {
      let canonicalRoot = false;
      const elements = node.elements;
      const length = elements.length;
      for (let index = 0; index < length; index++) {
        const element = elements[index];
        if (element === undefined) { continue; }
        const elementType = isNamedTupleMember(element) ? element.type : element;
        const classified = this.classifyDataNode(elementType, false, visiting, depth + 1);
        if (!classified.valid) { return classified; }
        canonicalRoot = canonicalRoot || classified.canonicalRoot;
      }
      return {
        'canonicalRoot': canonicalRoot,
        'evidence': node,
        'reason': canonicalRoot ? 'canonicalComposition' : 'primitiveForwarding',
        'valid': canonicalRoot
      };
    }

    if (isArrayTypeNode(node)) {
      const element = this.classifyDataNode(node.elementType, false, visiting, depth + 1);
      return {
        'canonicalRoot': element.canonicalRoot,
        'evidence': element.valid ? node : element.evidence,
        'reason': element.valid && element.canonicalRoot ? 'canonicalComposition' : element.reason,
        'valid': element.valid && element.canonicalRoot
      };
    }

    if (isLiteralTypeNode(node)) {
      return {
        'canonicalRoot': false,
        'evidence': node,
        'reason': 'primitiveForwarding',
        'valid': !root
      };
    }

    if (isTypeLiteralNode(node)) {
      return { 'canonicalRoot': false, 'evidence': node, 'reason': 'inlineObject', 'valid': false };
    }

    if (isTypeReferenceNode(node)) {
      if (this.isFromSchemaNamedReference(node)) {
        return { 'canonicalRoot': false, 'evidence': node, 'reason': 'unresolvedReference', 'valid': false };
      }

      const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));
      if (symbol !== undefined && (symbol.flags & SymbolFlags.TypeParameter) !== 0) {
        return { 'canonicalRoot': false, 'evidence': node, 'reason': 'typeParameter', 'valid': false };
      }

      if (this.isIntrinsic(node, 'Array') || this.isIntrinsic(node, 'Readonly') || this.isIntrinsic(node, 'ReadonlyArray')) {
        const typeArguments = node.typeArguments ?? [];
        if (typeArguments.length !== 1) {
          return { 'canonicalRoot': false, 'evidence': node, 'reason': 'unresolvedReference', 'valid': false };
        }
        const typeArgument = typeArguments[0];
        if (typeArgument === undefined) {
          return { 'canonicalRoot': false, 'evidence': node, 'reason': 'unresolvedReference', 'valid': false };
        }
        const classified = this.classifyDataNode(typeArgument, false, visiting, depth + 1);
        return {
          'canonicalRoot': classified.canonicalRoot,
          'evidence': classified.valid ? node : classified.evidence,
          'reason': classified.valid && classified.canonicalRoot ? 'canonicalComposition' : classified.reason,
          'valid': classified.valid && classified.canonicalRoot
        };
      }

      const declarations = symbol?.getDeclarations() ?? [];
      if (declarations.find(isInterfaceDeclaration) !== undefined) {
        return { 'canonicalRoot': false, 'evidence': node, 'reason': 'interfaceReference', 'valid': false };
      }

      const alias = this.aliasDeclarationForSymbol(symbol);
      if (alias === undefined) {
        return { 'canonicalRoot': false, 'evidence': node, 'reason': 'unresolvedReference', 'valid': false };
      }

      const aliasResult = this.classifyAlias(alias, visiting, depth + 1);
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
        const typeArgument = typeArguments[index];
        if (typeArgument === undefined) { continue; }
        const classified = this.classifyDataNode(typeArgument, false, visiting, depth + 1);
        if (!classified.valid) { return classified; }
      }

      if (root && length === 0) {
        return { 'canonicalRoot': false, 'evidence': node, 'reason': 'nakedRename', 'valid': false };
      }

      return { 'canonicalRoot': true, 'evidence': node, 'reason': 'canonicalComposition', 'valid': true };
    }

    const kind = node.kind;
    if (kind === SyntaxKind.AnyKeyword) {
      return { 'canonicalRoot': false, 'evidence': node, 'reason': 'any', 'valid': false };
    }
    if (kind === SyntaxKind.UnknownKeyword) {
      return { 'canonicalRoot': false, 'evidence': node, 'reason': 'unknown', 'valid': false };
    }
    if (kind === SyntaxKind.BigIntKeyword) {
      return { 'canonicalRoot': false, 'evidence': node, 'reason': 'bigint', 'valid': false };
    }
    if (kind === SyntaxKind.SymbolKeyword) {
      return { 'canonicalRoot': false, 'evidence': node, 'reason': 'symbol', 'valid': false };
    }
    if (kind === SyntaxKind.NeverKeyword) {
      return { 'canonicalRoot': false, 'evidence': node, 'reason': 'never', 'valid': false };
    }
    if (kind === SyntaxKind.UndefinedKeyword || kind === SyntaxKind.VoidKeyword) {
      return { 'canonicalRoot': false, 'evidence': node, 'reason': 'undefined', 'valid': false };
    }

    return { 'canonicalRoot': false, 'evidence': node, 'reason': 'primitiveForwarding', 'valid': false };
  }

  private collectExposedTypeParameters(node: TypeNode, result: Set<Symbol>, depth: number): void {
    if (depth > MAX_DEPTH) { return; }

    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      this.collectExposedTypeParameters(node.type, result, depth + 1);
      return;
    }

    if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
      node.types.forEach((member) => {
        this.collectExposedTypeParameters(member, result, depth + 1);
      });
      return;
    }

    if (isTupleTypeNode(node)) {
      node.elements.forEach((element) => {
        this.collectExposedTypeParameters(isNamedTupleMember(element) ? element.type : element, result, depth + 1);
      });
      return;
    }

    if (isArrayTypeNode(node)) {
      this.collectExposedTypeParameters(node.elementType, result, depth + 1);
      return;
    }

    if (isConditionalTypeNode(node)) {
      this.collectExposedTypeParameters(node.trueType, result, depth + 1);
      this.collectExposedTypeParameters(node.falseType, result, depth + 1);
      return;
    }

    if (isFunctionTypeNode(node) || isConstructorTypeNode(node)) {
      this.collectExposedTypeParameters(node.type, result, depth + 1);
      return;
    }

    if (isMappedTypeNode(node)) {
      if (node.type !== undefined) { this.collectExposedTypeParameters(node.type, result, depth + 1); }
      return;
    }

    if (isTypeOperatorNode(node)) {
      if (node.operator !== SyntaxKind.KeyOfKeyword) {
        this.collectExposedTypeParameters(node.type, result, depth + 1);
      }
      return;
    }

    if (isIndexedAccessTypeNode(node)) { return; }

    if (isTypeLiteralNode(node)) {
      node.members.forEach((member) => {
        if (
          (isPropertySignature(member) || isMethodSignature(member) || isCallSignatureDeclaration(member) || isConstructSignatureDeclaration(member))
          && member.type !== undefined
        ) {
          this.collectExposedTypeParameters(member.type, result, depth + 1);
        }
      });
      return;
    }

    if (!isTypeReferenceNode(node)) { return; }
    const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));
    if (symbol !== undefined && (symbol.flags & SymbolFlags.TypeParameter) !== 0) {
      result.add(symbol);
      return;
    }

    if (
      this.isIntrinsic(node, 'Array')
      || this.isIntrinsic(node, 'Readonly')
      || this.isIntrinsic(node, 'ReadonlyArray')
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
    if (depth > MAX_DEPTH) { return; }

    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      this.collectReadonlyFromNode(node.type, result, seen, visitingAliases, depth + 1);
      return;
    }

    if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
      node.types.forEach((member) => {
        this.collectReadonlyFromNode(member, result, seen, visitingAliases, depth + 1);
      });
      return;
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
      return;
    }

    if (isArrayTypeNode(node)) {
      this.collectReadonlyFromNode(node.elementType, result, seen, visitingAliases, depth + 1);
      return;
    }

    if (isConditionalTypeNode(node)) {
      this.collectReadonlyFromNode(node.trueType, result, seen, visitingAliases, depth + 1);
      this.collectReadonlyFromNode(node.falseType, result, seen, visitingAliases, depth + 1);
      return;
    }

    if (isFunctionTypeNode(node) || isConstructorTypeNode(node)) {
      this.collectReadonlyFromNode(node.type, result, seen, visitingAliases, depth + 1);
      return;
    }

    if (isMappedTypeNode(node)) {
      if (node.readonlyToken?.kind === SyntaxKind.ReadonlyKeyword || node.readonlyToken?.kind === SyntaxKind.PlusToken) {
        this.addReadonlyEvidence(result, seen, node, 'readonlyMapped', true);
      }
      if (node.type !== undefined) {
        this.collectReadonlyFromNode(node.type, result, seen, visitingAliases, depth + 1);
      }
      return;
    }

    if (isTypeOperatorNode(node)) {
      if (node.operator === SyntaxKind.ReadonlyKeyword) {
        this.addReadonlyEvidence(result, seen, node, 'readonlyArray', true);
        this.collectReadonlyFromNode(node.type, result, seen, visitingAliases, depth + 1);
      }
      return;
    }

    if (isIndexedAccessTypeNode(node)) { return; }

    if (isTypeLiteralNode(node)) {
      node.members.forEach((member) => {
        if (isPropertySignature(member)) {
          if ((getCombinedModifierFlags(member) & ModifierFlags.Readonly) !== 0) {
            this.addReadonlyEvidence(result, seen, member, 'readonlyProperty', true);
          }
          if (member.type !== undefined) {
            this.collectReadonlyFromNode(member.type, result, seen, visitingAliases, depth + 1);
          }
          return;
        }

        if (isIndexSignatureDeclaration(member)) {
          if ((getCombinedModifierFlags(member) & ModifierFlags.Readonly) !== 0) {
            this.addReadonlyEvidence(result, seen, member, 'readonlyIndex', true);
          }
          if (member.type !== undefined) {
            this.collectReadonlyFromNode(member.type, result, seen, visitingAliases, depth + 1);
          }
          return;
        }

        if (
          (isMethodSignature(member) || isCallSignatureDeclaration(member) || isConstructSignatureDeclaration(member))
          && member.type !== undefined
        ) {
          this.collectReadonlyFromNode(member.type, result, seen, visitingAliases, depth + 1);
        }
      });
      return;
    }

    if (!isTypeReferenceNode(node)) { return; }

    if (this.isSchemaDerivedApplication(node)) { return; }

    if (this.isIntrinsic(node, 'Readonly') || this.isIntrinsic(node, 'ReadonlyArray')) {
      this.addReadonlyEvidence(result, seen, node, 'intrinsicReadonly', false);
      node.typeArguments?.forEach((typeArgument) => {
        this.collectReadonlyFromNode(typeArgument, result, seen, visitingAliases, depth + 1);
      });
      return;
    }

    const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));
    const alias = this.aliasDeclarationForSymbol(symbol);
    if (alias !== undefined && symbol !== undefined && !visitingAliases.has(symbol)) {
      const nested = this.readonlyOutputForAlias(alias, visitingAliases, depth + 1);
      if (nested.length > 0) {
        this.addReadonlyEvidence(result, seen, node, 'readonlyAlias', false);
      }
    }

    node.typeArguments?.forEach((typeArgument) => {
      this.collectReadonlyFromNode(typeArgument, result, seen, visitingAliases, depth + 1);
    });
  }

  /**
   * Walks parenthesized types, union/intersection members, array element types, tuple members, and
   * type-reference type arguments to find a conditional, mapped, or indexed-access type that
   * determines the alias's own shape. Returns the first qualifying node, or undefined when the body
   * composes no type-level function surface.
   */
  private containsTypeFunctionBody(node: TypeNode, depth: number): TypeNode | undefined {
    if (depth > MAX_DEPTH) { return undefined; }

    if (isConditionalTypeNode(node) || isMappedTypeNode(node) || isIndexedAccessTypeNode(node)) {
      return node;
    }

    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      return this.containsTypeFunctionBody(node.type, depth + 1);
    }

    if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
      const members = node.types;
      const length = members.length;
      for (let index = 0; index < length; index++) {
        const member = members[index];
        if (member === undefined) { continue; }
        const found = this.containsTypeFunctionBody(member, depth + 1);
        if (found !== undefined) { return found; }
      }
      return undefined;
    }

    if (isArrayTypeNode(node)) {
      return this.containsTypeFunctionBody(node.elementType, depth + 1);
    }

    if (isTupleTypeNode(node)) {
      const elements = node.elements;
      const length = elements.length;
      for (let index = 0; index < length; index++) {
        const element = elements[index];
        if (element === undefined) { continue; }
        const found = this.containsTypeFunctionBody(isNamedTupleMember(element) ? element.type : element, depth + 1);
        if (found !== undefined) { return found; }
      }
      return undefined;
    }

    if (isTypeReferenceNode(node)) {
      const typeArguments = node.typeArguments ?? [];
      const length = typeArguments.length;
      for (let index = 0; index < length; index++) {
        const typeArgument = typeArguments[index];
        if (typeArgument === undefined) { continue; }
        const found = this.containsTypeFunctionBody(typeArgument, depth + 1);
        if (found !== undefined) { return found; }
      }
      return this.delegatedTypeFunctionBody(node, depth + 1);
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
  private delegatedTypeFunctionBody(node: TypeReferenceNode, depth: number): TypeNode | undefined {
    if (depth > MAX_DEPTH) { return undefined; }

    const typeArguments = node.typeArguments ?? [];
    let forwardsTypeParameter = false;
    const argumentCount = typeArguments.length;
    for (let index = 0; index < argumentCount; index++) {
      const typeArgument = typeArguments[index];
      if (typeArgument !== undefined && this.containsTypeParameterReference(typeArgument)) {
        forwardsTypeParameter = true;
        break;
      }
    }
    if (!forwardsTypeParameter) { return undefined; }

    const alias = this.aliasDeclarationForSymbol(this.checker.getSymbolAtLocation(node.typeName));
    if (alias === undefined) { return undefined; }
    if ((alias.typeParameters?.length ?? 0) === 0) { return undefined; }

    return this.containsTypeFunctionBody(alias.type, depth + 1);
  }

  private findAliasContract(
    node: TypeNode,
    visiting: Set<Symbol>,
    depth: number
  ): ContractEvidenceInterface | undefined {
    if (depth > MAX_DEPTH) { return { 'node': node, 'reason': 'nonJson' }; }

    if (this.isSchemaDerivedApplication(node)) { return undefined; }

    if (isFunctionTypeNode(node)) { return { 'node': node, 'reason': 'callable' }; }
    if (isConstructorTypeNode(node)) { return { 'node': node, 'reason': 'constructor' }; }
    if (isConditionalTypeNode(node)) { return { 'node': node, 'reason': 'conditional' }; }
    if (isMappedTypeNode(node)) { return { 'node': node, 'reason': 'mapped' }; }
    if (isIndexedAccessTypeNode(node)) { return { 'node': node, 'reason': 'indexedAccess' }; }

    if (isTypeOperatorNode(node)) {
      if (node.operator === SyntaxKind.UniqueKeyword) { return { 'node': node, 'reason': 'brand' }; }
      if (node.operator === SyntaxKind.KeyOfKeyword) { return { 'node': node, 'reason': 'nonJson' }; }
      return this.findAliasContract(node.type, visiting, depth + 1);
    }

    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      return this.findAliasContract(node.type, visiting, depth + 1);
    }

    if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
      const members = node.types;
      const length = members.length;
      for (let index = 0; index < length; index++) {
        const member = members[index];
        if (member === undefined) { continue; }
        const evidence = this.findAliasContract(member, visiting, depth + 1);
        if (evidence !== undefined) { return evidence; }
      }
      return undefined;
    }

    if (isTupleTypeNode(node)) {
      const elements = node.elements;
      const length = elements.length;
      for (let index = 0; index < length; index++) {
        const element = elements[index];
        if (element === undefined) { continue; }
        const evidence = this.findAliasContract(
          isNamedTupleMember(element) ? element.type : element,
          visiting,
          depth + 1
        );
        if (evidence !== undefined) { return evidence; }
      }
      return undefined;
    }

    if (isArrayTypeNode(node)) {
      return this.findAliasContract(node.elementType, visiting, depth + 1);
    }

    if (isTypeLiteralNode(node)) {
      const members = node.members;
      const length = members.length;
      for (let index = 0; index < length; index++) {
        const member = members[index];
        if (member === undefined) { continue; }
        if (isMethodSignature(member) || isCallSignatureDeclaration(member)) {
          return { 'node': member, 'reason': 'callable' };
        }
        if (isConstructSignatureDeclaration(member)) {
          return { 'node': member, 'reason': 'constructor' };
        }
        if ((isPropertySignature(member) || isIndexSignatureDeclaration(member)) && member.type !== undefined) {
          if (this.isUniqueSymbol(member.type)) { return { 'node': member, 'reason': 'brand' }; }
          const evidence = this.findAliasContract(member.type, visiting, depth + 1);
          if (evidence !== undefined) { return evidence; }
        }
      }
      return undefined;
    }

    if (isTypeReferenceNode(node)) {
      if (this.isFromSchemaNamedReference(node)) { return undefined; }
      if (
        this.isIntrinsic(node, 'Array')
        || this.isIntrinsic(node, 'Readonly')
        || this.isIntrinsic(node, 'ReadonlyArray')
      ) {
        const typeArguments = node.typeArguments ?? [];
        const length = typeArguments.length;
        for (let index = 0; index < length; index++) {
          const typeArgument = typeArguments[index];
          if (typeArgument === undefined) { continue; }
          const evidence = this.findAliasContract(typeArgument, visiting, depth + 1);
          if (evidence !== undefined) { return evidence; }
        }
        return undefined;
      }
      if (this.isRuntimeType(node)) { return { 'node': node, 'reason': 'classInstance' }; }

      const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));
      if (symbol !== undefined && (symbol.flags & SymbolFlags.Class) !== 0) {
        return { 'node': node, 'reason': 'classInstance' };
      }

      const declarations = symbol?.getDeclarations() ?? [];
      const interfaceDeclaration = declarations.find(isInterfaceDeclaration);
      if (
        interfaceDeclaration !== undefined
        && this.classifyInterface(interfaceDeclaration, visiting, depth + 1).classification === 'contract'
      ) {
        return { 'node': node, 'reason': 'interfaceReference' };
      }

      const alias = this.aliasDeclarationForSymbol(symbol);
      if (alias !== undefined && symbol !== undefined && !visiting.has(symbol)) {
        const nested = this.classifyAlias(alias, visiting, depth + 1);
        // A type-level function carries its computation into every reference. The declaration is
        // exempt from the interface remedy; a reference to it composes the same contract portion
        // an inline conditional, mapped, or indexed body would.
        if (nested.classification === 'interfaceContract' || nested.classification === 'typeFunction') {
          const reason = nested.reason;
          if (
            reason === 'any'
            || reason === 'bigint'
            || reason === 'brand'
            || reason === 'callable'
            || reason === 'classInstance'
            || reason === 'conditional'
            || reason === 'constructor'
            || reason === 'indexedAccess'
            || reason === 'interfaceReference'
            || reason === 'mapped'
            || reason === 'never'
            || reason === 'nonJson'
            || reason === 'symbol'
            || reason === 'undefined'
            || reason === 'unknown'
          ) {
            return { 'node': node, 'reason': reason };
          }
        }
      }

      const typeArguments = node.typeArguments ?? [];
      const length = typeArguments.length;
      for (let index = 0; index < length; index++) {
        const typeArgument = typeArguments[index];
        if (typeArgument === undefined) { continue; }
        const evidence = this.findAliasContract(typeArgument, visiting, depth + 1);
        if (evidence !== undefined) { return evidence; }
      }
      return undefined;
    }

    if (node.kind === SyntaxKind.AnyKeyword) { return { 'node': node, 'reason': 'any' }; }
    if (node.kind === SyntaxKind.UnknownKeyword) { return { 'node': node, 'reason': 'unknown' }; }
    if (node.kind === SyntaxKind.BigIntKeyword) { return { 'node': node, 'reason': 'bigint' }; }
    if (node.kind === SyntaxKind.SymbolKeyword) { return { 'node': node, 'reason': 'symbol' }; }
    if (node.kind === SyntaxKind.NeverKeyword) { return { 'node': node, 'reason': 'never' }; }
    if (node.kind === SyntaxKind.UndefinedKeyword || node.kind === SyntaxKind.VoidKeyword) {
      return { 'node': node, 'reason': 'undefined' };
    }
    if (node.kind === SyntaxKind.TypeQuery || node.kind === SyntaxKind.ThisType) {
      return { 'node': node, 'reason': 'nonJson' };
    }

    return undefined;
  }

  /**
   * A call or construct signature — narrower than {@link findInterfaceContract}'s general
   * contract evidence — makes an interface directly invocable. Method signatures do not qualify:
   * `Promise`, `Map`, `Array`, and similar lib interfaces expose many methods without being
   * callable themselves, so treating a method as call evidence here would misclassify every
   * reference to a plain method-bearing interface as a callable constituent. Inherited through
   * heritage clauses, cycle-guarded by `visiting`.
   */
  private interfaceHasCallSignature(
    declaration: InterfaceDeclaration,
    visiting: Set<Symbol>,
    depth: number
  ): boolean {
    if (depth > MAX_DEPTH) { return false; }

    const hasOwnSignature = declaration.members.some((member) => {return (
      isCallSignatureDeclaration(member) || isConstructSignatureDeclaration(member)
    );});
    if (hasOwnSignature) { return true; }

    const symbol = this.checker.getSymbolAtLocation(declaration.name);
    if (symbol !== undefined && visiting.has(symbol)) { return false; }
    const nextVisiting = new Set(visiting);
    if (symbol !== undefined) { nextVisiting.add(symbol); }

    const heritageClauses = declaration.heritageClauses ?? [];
    const heritageLength = heritageClauses.length;
    for (let index = 0; index < heritageLength; index++) {
      const clause = heritageClauses[index];
      if (clause === undefined) { continue; }
      const types = clause.types;
      const typesLength = types.length;
      for (let typeIndex = 0; typeIndex < typesLength; typeIndex++) {
        const type = types[typeIndex];
        if (type === undefined) { continue; }
        const resolved = this.checker.getTypeAtLocation(type);
        const typeSymbol = this.resolveSymbol(resolved.aliasSymbol ?? resolved.getSymbol());
        const inheritedDeclarations = typeSymbol?.getDeclarations() ?? [];
        const inherited = inheritedDeclarations.find(isInterfaceDeclaration);
        if (inherited !== undefined && this.interfaceHasCallSignature(inherited, nextVisiting, depth + 1)) {
          return true;
        }
      }
    }
    return false;
  }

  private classifyInterface(
    declaration: InterfaceDeclaration,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceClassificationResultInterface {
    const evidence = this.findInterfaceContract(declaration, visiting, depth);
    return evidence === undefined
      ? {
        'classification': 'pureData',
        'evidence': declaration,
        'reason': 'pureData'
      }
      : {
        'classification': 'contract',
        'evidence': evidence.node,
        'reason': evidence.reason
      };
  }

  private findInterfaceContract(
    declaration: InterfaceDeclaration,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractEvidenceInterface | undefined {
    if (depth > MAX_DEPTH) { return { 'node': declaration, 'reason': 'nonJson' }; }

    const symbol = this.checker.getSymbolAtLocation(declaration.name);
    if (symbol !== undefined && visiting.has(symbol)) { return undefined; }
    const nextVisiting = new Set(visiting);
    if (symbol !== undefined) { nextVisiting.add(symbol); }

    const members = declaration.members;
    const length = members.length;
    for (let index = 0; index < length; index++) {
      const member = members[index];
      if (member === undefined) { continue; }

      if (isCallSignatureDeclaration(member) || isMethodSignature(member)) {
        return { 'node': member, 'reason': 'callable' };
      }
      if (isConstructSignatureDeclaration(member)) {
        return { 'node': member, 'reason': 'constructor' };
      }

      if (isPropertySignature(member) && member.type !== undefined && this.isUniqueSymbol(member.type)) {
        return { 'node': member, 'reason': 'brand' };
      }

      if (
        (isPropertySignature(member) || isIndexSignatureDeclaration(member))
        && (getCombinedModifierFlags(member) & ModifierFlags.Readonly) !== 0
      ) {
        return { 'node': member, 'reason': 'readonly' };
      }

      if (
        (isPropertySignature(member) || isIndexSignatureDeclaration(member))
        && member.type !== undefined
      ) {
        const evidence = this.findInterfaceTypeContract(member.type, nextVisiting, depth + 1);
        if (evidence !== undefined) { return evidence; }
      }
    }

    const heritageClauses = declaration.heritageClauses ?? [];
    const heritageLength = heritageClauses.length;
    for (let index = 0; index < heritageLength; index++) {
      const clause = heritageClauses[index];
      if (clause === undefined) { continue; }
      const types = clause.types;
      const typesLength = types.length;
      for (let typeIndex = 0; typeIndex < typesLength; typeIndex++) {
        const type = types[typeIndex];
        if (type === undefined) { continue; }
        const resolved = this.checker.getTypeAtLocation(type);
        const typeSymbol = this.resolveSymbol(resolved.aliasSymbol ?? resolved.getSymbol());
        const declarations = typeSymbol?.getDeclarations() ?? [];
        const inherited = declarations.find(isInterfaceDeclaration);
        if (inherited !== undefined) {
          const evidence = this.findInterfaceContract(inherited, nextVisiting, depth + 1);
          if (evidence !== undefined) { return { 'node': type, 'reason': evidence.reason }; }
        }
      }
    }

    return undefined;
  }

  private findInterfaceTypeContract(
    node: TypeNode,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractEvidenceInterface | undefined {
    if (depth > MAX_DEPTH) { return { 'node': node, 'reason': 'nonJson' }; }
    if (isFunctionTypeNode(node)) { return { 'node': node, 'reason': 'callable' }; }
    if (isConstructorTypeNode(node)) { return { 'node': node, 'reason': 'constructor' }; }
    if (isConditionalTypeNode(node) || isMappedTypeNode(node) || isIndexedAccessTypeNode(node)) {
      return { 'node': node, 'reason': 'nonJson' };
    }
    if (this.isUniqueSymbol(node)) { return { 'node': node, 'reason': 'brand' }; }

    if (isTypeOperatorNode(node)) {
      if (node.operator === SyntaxKind.ReadonlyKeyword) { return { 'node': node, 'reason': 'readonly' }; }
      if (node.operator === SyntaxKind.KeyOfKeyword) { return { 'node': node, 'reason': 'nonJson' }; }
      return this.findInterfaceTypeContract(node.type, visiting, depth + 1);
    }

    if (isTypeReferenceNode(node)) {
      if (this.isIntrinsic(node, 'Readonly') || this.isIntrinsic(node, 'ReadonlyArray')) {
        return { 'node': node, 'reason': 'readonly' };
      }
      if (this.isRuntimeType(node)) { return { 'node': node, 'reason': 'classInstance' }; }

      const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));
      if (symbol !== undefined && (symbol.flags & SymbolFlags.Class) !== 0) {
        return { 'node': node, 'reason': 'classInstance' };
      }

      const declarations = symbol?.getDeclarations() ?? [];
      const declarationsLength = declarations.length;
      for (let index = 0; index < declarationsLength; index++) {
        const declaration = declarations[index];
        if (declaration === undefined || !isInterfaceDeclaration(declaration)) { continue; }

        const evidence = this.findInterfaceContract(declaration, visiting, depth + 1);
        if (evidence !== undefined) { return { 'node': node, 'reason': evidence.reason }; }
      }

      const alias = this.aliasDeclarationForSymbol(symbol);
      if (alias !== undefined && symbol !== undefined && !visiting.has(symbol)) {
        const readonlyOutput = this.readonlyOutputForAlias(alias, new Set(), depth + 1);
        if (readonlyOutput.length > 0) { return { 'node': node, 'reason': 'readonly' }; }

        const nested = this.classifyAlias(alias, visiting, depth + 1);
        if (nested.classification === 'interfaceContract' || nested.classification === 'typeFunction') {
          if (nested.reason === 'callable') { return { 'node': node, 'reason': 'callable' }; }
          if (nested.reason === 'constructor') { return { 'node': node, 'reason': 'constructor' }; }
          if (nested.reason === 'brand') { return { 'node': node, 'reason': 'brand' }; }
          if (nested.reason === 'classInstance') { return { 'node': node, 'reason': 'classInstance' }; }
          return { 'node': node, 'reason': 'nonJson' };
        }
      }

      const typeArguments = node.typeArguments ?? [];
      const length = typeArguments.length;
      for (let index = 0; index < length; index++) {
        const typeArgument = typeArguments[index];
        if (typeArgument === undefined) { continue; }
        const evidence = this.findInterfaceTypeContract(typeArgument, visiting, depth + 1);
        if (evidence !== undefined) { return evidence; }
      }
      return undefined;
    }

    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      return this.findInterfaceTypeContract(node.type, visiting, depth + 1);
    }

    if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
      const members = node.types;
      const length = members.length;
      for (let index = 0; index < length; index++) {
        const member = members[index];
        if (member === undefined) { continue; }
        const evidence = this.findInterfaceTypeContract(member, visiting, depth + 1);
        if (evidence !== undefined) { return evidence; }
      }
      return undefined;
    }

    if (isTupleTypeNode(node)) {
      const elements = node.elements;
      const length = elements.length;
      for (let index = 0; index < length; index++) {
        const element = elements[index];
        if (element === undefined) { continue; }
        const evidence = this.findInterfaceTypeContract(
          isNamedTupleMember(element) ? element.type : element,
          visiting,
          depth + 1
        );
        if (evidence !== undefined) { return evidence; }
      }
      return undefined;
    }

    if (isArrayTypeNode(node)) {
      return this.findInterfaceTypeContract(node.elementType, visiting, depth + 1);
    }

    if (isTypeLiteralNode(node)) {
      const members = node.members;
      const length = members.length;
      for (let index = 0; index < length; index++) {
        const member = members[index];
        if (member === undefined) { continue; }
        if (isCallSignatureDeclaration(member) || isMethodSignature(member)) {
          return { 'node': member, 'reason': 'callable' };
        }
        if (isConstructSignatureDeclaration(member)) {
          return { 'node': member, 'reason': 'constructor' };
        }
        if ((isPropertySignature(member) || isIndexSignatureDeclaration(member)) && member.type !== undefined) {
          if (this.isUniqueSymbol(member.type)) { return { 'node': member, 'reason': 'brand' }; }
          if ((getCombinedModifierFlags(member) & ModifierFlags.Readonly) !== 0) {
            return { 'node': member, 'reason': 'readonly' };
          }
          const evidence = this.findInterfaceTypeContract(member.type, visiting, depth + 1);
          if (evidence !== undefined) { return evidence; }
        }
      }
    }

    const type = this.checker.getTypeFromTypeNode(node);
    const typeSymbol = this.resolveSymbol(type.aliasSymbol ?? type.getSymbol());
    if (typeSymbol !== undefined && (typeSymbol.flags & SymbolFlags.Class) !== 0) {
      return { 'node': node, 'reason': 'classInstance' };
    }

    const flags = type.flags;
    if (
      (flags & TypeFlags.Any) !== 0
      || (flags & TypeFlags.Unknown) !== 0
      || (flags & TypeFlags.ESSymbol) !== 0
      || (flags & TypeFlags.UniqueESSymbol) !== 0
      || (flags & TypeFlags.BigIntLike) !== 0
      || (flags & TypeFlags.Never) !== 0
      || (flags & TypeFlags.Void) !== 0
      || (flags & TypeFlags.Undefined) !== 0
    ) {
      return { 'node': node, 'reason': 'nonJson' };
    }

    return undefined;
  }

  private findResolvedTypeContract(
    type: Type,
    evidenceNode: Node,
    seen: Set<Type>,
    depth: number
  ): ContractEvidenceInterface | undefined {
    if (seen.has(type)) { return undefined; }
    seen.add(type);
    if (depth > MAX_DEPTH) { return { 'node': evidenceNode, 'reason': 'nonJson' }; }

    if (type.getCallSignatures().length > 0) { return { 'node': evidenceNode, 'reason': 'callable' }; }
    if (type.getConstructSignatures().length > 0) { return { 'node': evidenceNode, 'reason': 'constructor' }; }

    const typeSymbol = this.resolveSymbol(type.aliasSymbol ?? type.getSymbol());
    if (typeSymbol !== undefined && (typeSymbol.flags & SymbolFlags.Class) !== 0) {
      return { 'node': evidenceNode, 'reason': 'classInstance' };
    }

    const flags = type.flags;
    if ((flags & TypeFlags.Any) !== 0) { return { 'node': evidenceNode, 'reason': 'any' }; }
    if ((flags & TypeFlags.Unknown) !== 0) { return { 'node': evidenceNode, 'reason': 'unknown' }; }
    if ((flags & TypeFlags.ESSymbol) !== 0 || (flags & TypeFlags.UniqueESSymbol) !== 0) {
      return { 'node': evidenceNode, 'reason': 'symbol' };
    }
    if ((flags & TypeFlags.BigIntLike) !== 0) { return { 'node': evidenceNode, 'reason': 'bigint' }; }
    if ((flags & TypeFlags.Never) !== 0) { return { 'node': evidenceNode, 'reason': 'never' }; }
    if ((flags & TypeFlags.Void) !== 0 || (flags & TypeFlags.Undefined) !== 0) {
      return { 'node': evidenceNode, 'reason': 'undefined' };
    }

    if (type.isUnion() || type.isIntersection()) {
      const constituents = type.types;
      const length = constituents.length;
      for (let index = 0; index < length; index++) {
        const constituent = constituents[index];
        if (constituent === undefined) { continue; }
        const evidence = this.findResolvedTypeContract(constituent, evidenceNode, seen, depth + 1);
        if (evidence !== undefined) { return evidence; }
      }
      return undefined;
    }

    if ((flags & TypeFlags.Object) === 0) { return undefined; }

    const elementType = type.getNumberIndexType();
    if (elementType !== undefined) {
      const evidence = this.findResolvedTypeContract(elementType, evidenceNode, seen, depth + 1);
      if (evidence !== undefined) { return evidence; }
    }

    const properties = type.getProperties();
    const propertyLength = properties.length;
    for (let index = 0; index < propertyLength; index++) {
      const property = properties[index];
      if (property === undefined) { continue; }
      const declaration = property.valueDeclaration ?? (property.getDeclarations() ?? [])[0];
      if (declaration === undefined) { continue; }
      const propertyType = this.checker.getTypeOfSymbolAtLocation(property, declaration);
      const evidence = this.findResolvedTypeContract(propertyType, declaration, seen, depth + 1);
      if (evidence !== undefined) { return evidence; }
    }

    return undefined;
  }

  private isFromSchemaReference(node: TypeNode): boolean {
    if (!this.isOwnerDirectTypeReference(node, 'FromSchema')) { return false; }

    const typeArguments = node.typeArguments ?? [];
    if (typeArguments.length !== 1) { return false; }
    const schemaType = typeArguments[0];
    if (schemaType === undefined || !isTypeQueryNode(schemaType)) { return false; }

    const schemaSymbol = this.resolveSymbol(this.checker.getSymbolAtLocation(schemaType.exprName));
    const declarations = schemaSymbol?.getDeclarations() ?? [];
    return declarations.some((declaration) => {
      const initializer = isVariableDeclaration(declaration) ? declaration.initializer : undefined;
      return initializer !== undefined
        && isSatisfiesExpression(initializer)
        && isAsExpression(initializer.expression)
        && isConstTypeReference(initializer.expression.type)
        && this.isOwnerDirectTypeReference(initializer.type, 'JSONSchema');
    });
  }

  private isOwnerDirectTypeReference(
    node: TypeNode,
    ownerName: 'FromSchema' | 'JSONSchema'
  ): node is TypeReferenceNode {
    if (!isTypeReferenceNode(node) || !this.isOwnerSymbolReference(node, ownerName)) { return false; }
    const useSiteSymbol = this.checker.getSymbolAtLocation(node.typeName);
    const declarations = useSiteSymbol?.getDeclarations() ?? [];

    const hasDirectNamedImport = declarations.some((declaration) => {
      if (!isImportSpecifier(declaration)) { return false; }
      const importedName = declaration.propertyName?.text ?? declaration.name.text;
      if (importedName !== ownerName) { return false; }

      const importDeclaration = declaration.parent.parent.parent;
      return isImportDeclaration(importDeclaration)
        && isStringLiteral(importDeclaration.moduleSpecifier)
        && importDeclaration.moduleSpecifier.text === 'json-schema-to-ts';
    });
    if (hasDirectNamedImport) { return true; }
    if (!isQualifiedName(node.typeName) || node.typeName.right.text !== ownerName) { return false; }

    const namespaceSymbol = this.checker.getSymbolAtLocation(node.typeName.left);
    const namespaceDeclarations = namespaceSymbol?.getDeclarations() ?? [];
    return namespaceDeclarations.some((declaration) => {
      if (!isNamespaceImport(declaration)) { return false; }

      const importDeclaration = declaration.parent.parent;
      return isImportDeclaration(importDeclaration)
        && isStringLiteral(importDeclaration.moduleSpecifier)
        && importDeclaration.moduleSpecifier.text === 'json-schema-to-ts';
    });
  }

  private isFromSchemaNamedReference(node: TypeNode): boolean {
    if (!isTypeReferenceNode(node)) { return false; }
    const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));
    return symbol?.getName() === 'FromSchema';
  }

  private isOwnerSymbolReference(node: TypeNode, ownerName: 'FromSchema' | 'JSONSchema'): boolean {
    if (!isTypeReferenceNode(node)) { return false; }
    const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));
    if (symbol?.getName() !== ownerName) { return false; }

    const declarations = symbol.getDeclarations() ?? [];
    return declarations.some((declaration) => {
      const filename = declaration.getSourceFile().fileName.split('\\').join('/');
      return filename.includes('/json-schema-to-ts/');
    });
  }

  private isIntrinsic(node: TypeNode, name: 'Array' | 'Readonly' | 'ReadonlyArray'): boolean {
    if (!isTypeReferenceNode(node)) { return false; }
    const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));
    if (symbol?.getName() !== name) { return false; }

    const declarations = symbol.getDeclarations() ?? [];
    return declarations.some((declaration) => {
      const sourceFile = declaration.getSourceFile();
      const filename = sourceFile.fileName.split('\\').join('/');
      return sourceFile.isDeclarationFile && filename.includes('/lib.') && filename.endsWith('.d.ts');
    });
  }

  private isRuntimeType(node: TypeNode): boolean {
    if (!isTypeReferenceNode(node)) { return false; }
    const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));
    if (symbol?.valueDeclaration === undefined || this.isIntrinsic(node, 'Array')) {
      return false;
    }

    const declarations = symbol.getDeclarations() ?? [];
    if (!declarations.some(isInterfaceDeclaration)) { return false; }

    const valueType = this.checker.getTypeOfSymbolAtLocation(symbol, node);
    return this.checker.getSignaturesOfType(valueType, SignatureKind.Construct).length > 0;
  }

  private isUniqueSymbol(node: TypeNode): boolean {
    return isTypeOperatorNode(node)
      && node.operator === SyntaxKind.UniqueKeyword
      && node.type.kind === SyntaxKind.SymbolKeyword;
  }

  private classifySchemaDerivedApplication(node: TypeNode): DataNodeResultInterface {
    const resolved = this.checker.getTypeFromTypeNode(node);
    const contract = this.findResolvedTypeContract(resolved, node, new Set(), 0);
    if (contract !== undefined) {
      return { 'canonicalRoot': false, 'evidence': node, 'reason': contract.reason, 'valid': false };
    }
    return { 'canonicalRoot': true, 'evidence': node, 'reason': 'fromSchema', 'valid': true };
  }

  private isSchemaDerivedApplication(node: TypeNode): boolean {
    const shape = this.schemaDerivationShape(node);
    if (shape === undefined) { return false; }

    const valueSymbol = this.resolveEntityNameSymbol(shape.valueQuery.exprName);
    if (valueSymbol === undefined) { return false; }

    // Value-first authoring binds the type to the value on every path. A schema constrained by a
    // dependency-owned `JSONSchema` is stronger evidence of a schema, never a waiver of that binding.
    const authoring = this.evaluateSchemaValueAuthoring(valueSymbol);
    if (!authoring.valid) { return false; }

    if (this.isFromSchemaReference(node)) { return true; }
    if (shape.derivingReference === undefined) { return true; }
    return this.isSchemaDerivingFunction(shape.derivingReference, authoring.builderCallee);
  }

  private schemaDerivationShape(node: TypeNode): SchemaDerivationShapeInterface | undefined {
    if (isTypeReferenceNode(node)) {
      const typeArguments = node.typeArguments;
      if (typeArguments === undefined) { return undefined; }
      const valueQuery = typeArguments.find(isTypeQueryNode);
      if (valueQuery === undefined) { return undefined; }
      return { 'derivingReference': node, 'valueQuery': valueQuery };
    }

    if (isTypeQueryNode(node) && isQualifiedName(node.exprName)) {
      return { 'derivingReference': undefined, 'valueQuery': node };
    }

    if (isIndexedAccessTypeNode(node) && isTypeQueryNode(node.objectType)) {
      return { 'derivingReference': undefined, 'valueQuery': node.objectType };
    }

    return undefined;
  }

  /**
   * A qualified value query names the schema either at its right (`typeof Namespace.Schema`) or at
   * its left (`typeof Schema.inferred`, where the tail is a property of the schema value). The whole
   * name wins when it denotes a variable; otherwise the search walks left to the owning binding.
   */
  private resolveEntityNameSymbol(name: Node): Symbol | undefined {
    const resolved = this.resolveSymbol(this.checker.getSymbolAtLocation(name));
    const declarations = resolved?.getDeclarations() ?? [];
    if (declarations.some(isVariableDeclaration)) { return resolved; }
    if (isQualifiedName(name)) { return this.resolveEntityNameSymbol(name.left); }
    return resolved;
  }

  private evaluateSchemaValueAuthoring(valueSymbol: Symbol): SchemaValueAuthoringInterface {
    const declarations = valueSymbol.getDeclarations() ?? [];
    const declaration = declarations.find(isVariableDeclaration);
    if (declaration === undefined) { return { 'builderCallee': undefined, 'valid': false }; }
    if ((declaration.parent.flags & NodeFlags.Const) === 0) { return { 'builderCallee': undefined, 'valid': false }; }
    if (declaration.type !== undefined) { return { 'builderCallee': undefined, 'valid': false }; }

    const initializer = declaration.initializer;
    if (initializer === undefined) { return { 'builderCallee': undefined, 'valid': false }; }

    if (this.isConstAssertedObjectLiteral(initializer)) {
      return { 'builderCallee': undefined, 'valid': true };
    }

    if (isCallExpression(initializer)) {
      const calleeSymbol = this.resolveSymbol(this.checker.getSymbolAtLocation(initializer.expression));
      return { 'builderCallee': calleeSymbol, 'valid': true };
    }

    return { 'builderCallee': undefined, 'valid': false };
  }

  private isConstAssertedObjectLiteral(node: Node): boolean {
    const target = isSatisfiesExpression(node) ? node.expression : node;
    return isAsExpression(target) && isConstTypeReference(target.type) && isObjectLiteralExpression(target.expression);
  }

  private isSchemaDerivingFunction(reference: TypeReferenceNode, builderCallee: Symbol | undefined): boolean {
    const derivingSymbol = this.resolveSymbol(this.checker.getSymbolAtLocation(reference.typeName));
    if (derivingSymbol === undefined) { return false; }

    if (this.hasSchemaDerivationTag(derivingSymbol)) { return true; }
    if (builderCallee !== undefined && this.sharePackageRoot(derivingSymbol, builderCallee)) { return true; }

    const declarations = derivingSymbol.getDeclarations() ?? [];
    return declarations.some((declaration) => {return (
      (isTypeAliasDeclaration(declaration) && (declaration.typeParameters?.length ?? 0) > 0)
      || declaration.getSourceFile().isDeclarationFile
    );});
  }

  private hasSchemaDerivationTag(symbol: Symbol): boolean {
    const result = symbol.getJsDocTags().some((tag) => {return tag.name === 'schemaDerivation';});
    return result;
  }

  private sharePackageRoot(first: Symbol, second: Symbol): boolean {
    const firstRoot = this.packageRootForSymbol(first);
    const secondRoot = this.packageRootForSymbol(second);
    return firstRoot !== undefined && firstRoot === secondRoot;
  }

  private packageRootForSymbol(symbol: Symbol): string | undefined {
    const declarations = symbol.getDeclarations() ?? [];
    const declaration = declarations[0];
    if (declaration === undefined) { return undefined; }
    return this.packageRootForPath(declaration.getSourceFile().fileName.split('\\').join('/'));
  }

  private packageRootForPath(filename: string): string {
    const segments = filename.split('/node_modules/');
    if (segments.length > 1) {
      const afterNodeModules = segments[segments.length - 1] ?? filename;
      const parts = afterNodeModules.split('/');
      const first = parts[0];
      const second = parts[1];
      if (first !== undefined && first.startsWith('@') && second !== undefined) { return `${first}/${second}`; }
      return first ?? afterNodeModules;
    }

    const lastSlash = filename.lastIndexOf('/');
    return lastSlash === -1 ? filename : filename.slice(0, lastSlash);
  }

  private typeFunctionReason(node: TypeNode): TypeContractMetadataEntity.Type['aliasReason'] {
    if (isConditionalTypeNode(node)) { return 'conditional'; }
    if (isMappedTypeNode(node)) { return 'mapped'; }
    return 'indexedAccess';
  }

  private readonlyOutputForAlias(
    declaration: TypeAliasDeclaration,
    visitingAliases: Set<Symbol>,
    depth: number
  ): readonly ReadonlyOutputEvidenceInterface[] {
    const cached = this.readonlyCache.get(declaration);
    if (cached !== undefined) { return cached; }
    if (depth > MAX_DEPTH) { return []; }

    const symbol = this.checker.getSymbolAtLocation(declaration.name);
    if (symbol !== undefined && visitingAliases.has(symbol)) { return []; }

    const nextVisiting = new Set(visitingAliases);
    if (symbol !== undefined) { nextVisiting.add(symbol); }

    const result: ReadonlyOutputEvidenceInterface[] = [];
    const seen = new Set<Node>();
    this.collectReadonlyFromNode(declaration.type, result, seen, nextVisiting, depth + 1);

    const exposedParameters = new Set<Symbol>();
    this.collectExposedTypeParameters(declaration.type, exposedParameters, depth + 1);
    const typeParameters = declaration.typeParameters ?? [];
    typeParameters.forEach((parameter: TypeParameterDeclaration) => {
      if (parameter.default === undefined) { return; }
      const parameterSymbol = this.checker.getSymbolAtLocation(parameter.name);
      if (parameterSymbol === undefined || !exposedParameters.has(parameterSymbol)) { return; }

      const defaultEvidence: ReadonlyOutputEvidenceInterface[] = [];
      this.collectReadonlyFromNode(parameter.default, defaultEvidence, new Set(), nextVisiting, depth + 1);
      if (defaultEvidence.length > 0) {
        this.addReadonlyEvidence(result, seen, parameter.default, 'exposedDefault', false);
      }
    });

    this.readonlyCache.set(declaration, result);
    return result;
  }

  private resolveSymbol(symbol: Symbol | undefined): Symbol | undefined {
    if (symbol === undefined) { return undefined; }
    if ((symbol.flags & SymbolFlags.Alias) === 0) { return symbol; }
    return this.checker.getAliasedSymbol(symbol);
  }
}
