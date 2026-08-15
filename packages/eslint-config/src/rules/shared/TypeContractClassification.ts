import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import {
  type ConditionalTypeNode,
  type ExpressionWithTypeArguments,
  getCombinedModifierFlags,
  type InterfaceDeclaration,
  type IntersectionTypeNode,
  isArrayTypeNode,
  isAsExpression,
  isCallExpression,
  isCallSignatureDeclaration,
  isComputedPropertyName,
  isConditionalTypeNode,
  isConstructorTypeNode,
  isConstructSignatureDeclaration,
  isConstTypeReference,
  isFunctionTypeNode,
  isIdentifier,
  isIndexedAccessTypeNode,
  isIndexSignatureDeclaration,
  isInferTypeNode,
  isInterfaceDeclaration,
  isIntersectionTypeNode,
  isLiteralTypeNode,
  isMappedTypeNode,
  isMethodSignature,
  isNamedTupleMember,
  isObjectLiteralExpression,
  isOptionalTypeNode,
  isParenthesizedTypeNode,
  isPropertySignature,
  isQualifiedName,
  isRestTypeNode,
  isSatisfiesExpression,
  isTupleTypeNode,
  isTypeAliasDeclaration,
  isTypeLiteralNode,
  isTypeOperatorNode,
  isTypeParameterDeclaration,
  isTypeQueryNode,
  isTypeReferenceNode,
  isUnionTypeNode,
  isVariableDeclaration,
  type MethodSignature,
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
  type TypeElement,
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
  readonly 'derivingNameNode': Node | undefined;
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

  /**
   * A brand member marks its declaration nominally and has no schema-derived equivalent, since
   * JSON expresses no symbol. Extraction to a named entity is unavailable to it.
   */
  public isBrandDeclarationMember(member: Node): boolean {
    if (!isPropertySignature(member) && !isIndexSignatureDeclaration(member) && !isMethodSignature(member)) {
      return false;
    }
    return this.isBrandMember(member);
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
      const declaration = declarations.at(index);
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

    // `any` accepts a callable value just as readily as a data value, but TypeScript's own
    // "any callable" idiom is `Function`, not `any` — a caller reaching for the loosest type
    // still means to admit callables. Treating `any` as neutral would let `any | { a: 1 }` slip
    // past the mix check the same way an untyped `Function` member would.
    if (kind === SyntaxKind.AnyKeyword) {
      return { 'hasCallable': true, 'hasData': false };
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
        const member = members.at(index);
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

      // `Function` is TypeScript's own "any callable" type — it resolves to the global
      // `lib.d.ts` interface, which itself declares no call signature (it is expressed as a
      // method-bearing interface: `apply`, `call`, `bind`), so it would otherwise fall into the
      // generic non-JSON-contract fallback below and silently exempt itself from the mix check.
      if (this.isIntrinsic(node, 'Function')) {
        return { 'hasCallable': true, 'hasData': false };
      }

      const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));
      const declarations = symbol?.getDeclarations() ?? [];
      const interfaceDeclarations = declarations.filter(isInterfaceDeclaration);
      if (interfaceDeclarations.length > 0) {
        // Declaration merging lets a call signature live in any one of several merged
        // `interface X { ... }` blocks for the same symbol — OR the check across every merged
        // part rather than only the first declaration TypeScript happens to report.
        const hasCallSignature = interfaceDeclarations.some((interfaceDeclaration) => {
          const result = this.interfaceHasCallSignature(interfaceDeclaration, new Set(), 0);
          return result;
        });
        if (hasCallSignature) {
          return { 'hasCallable': true, 'hasData': false };
        }
        const firstInterfaceDeclaration = interfaceDeclarations.at(0);
        if (
          firstInterfaceDeclaration !== undefined
          && this.analyzeInterface(firstInterfaceDeclaration).classification === 'pureData'
        ) {
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
          // A generic identity/passthrough alias (`type Wrap<T> = T;`) declares a bare
          // type-parameter body. Recursing into that unsubstituted body loses the concrete type
          // argument supplied at this reference site (`Wrap<() => void>` would recurse into bare
          // `T`, not `() => void`). Resolve the caller's actual type at this reference instead.
          if (this.isBareTypeParameterReference(alias.type)) {
            return this.classifyCallabilityFromResolvedType(this.checker.getTypeAtLocation(node), new Set());
          }

          const nextVisiting = new Set(visiting);
          nextVisiting.add(symbol);
          return this.classifyCallability(alias.type, nextVisiting, depth + 1);
        }
      }

      return { 'hasCallable': false, 'hasData': true };
    }

    return { 'hasCallable': false, 'hasData': true };
  }

  /**
   * Detects whether a generic alias's declared body is (or reduces to, through a parenthesized
   * wrapper) a bare reference to one of its own type parameters — the shape of an
   * identity/passthrough alias like `type Wrap<T> = T;`. Such a body carries no callable/data
   * information of its own; the caller's substituted type argument does.
   */
  private isBareTypeParameterReference(node: TypeNode): boolean {
    if (isParenthesizedTypeNode(node)) { return this.isBareTypeParameterReference(node.type); }
    if (!isTypeReferenceNode(node)) { return false; }
    const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));
    return symbol !== undefined && (symbol.flags & SymbolFlags.TypeParameter) !== 0;
  }

  /**
   * Classifies callable/data composition from an already-resolved `Type` rather than a syntactic
   * `TypeNode` — used when a generic alias's type parameter has been substituted with a concrete
   * type argument at the reference site and there is no longer a declared `TypeNode` to recurse
   * into syntactically.
   */
  private classifyCallabilityFromResolvedType(type: Type, seen: Set<Type>): CallabilityFlagsInterface {
    if (seen.has(type)) { return { 'hasCallable': false, 'hasData': false }; }
    seen.add(type);

    if (type.isUnion() || type.isIntersection()) {
      let hasCallable = false;
      let hasData = false;
      type.types.forEach((constituent) => {
        const classified = this.classifyCallabilityFromResolvedType(constituent, seen);
        hasCallable = hasCallable || classified.hasCallable;
        hasData = hasData || classified.hasData;
      });
      return { 'hasCallable': hasCallable, 'hasData': hasData };
    }

    const flags = type.flags;
    if ((flags & TypeFlags.Undefined) !== 0 || (flags & TypeFlags.Null) !== 0 || (flags & TypeFlags.Never) !== 0) {
      return { 'hasCallable': false, 'hasData': false };
    }

    if (type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0) {
      return { 'hasCallable': true, 'hasData': false };
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

    if (isConditionalTypeNode(node)) {
      // Mirrors `findAliasContract`'s distributive-identity unwrap: a conditional whose branches
      // are just re-exposing the checked type (`X extends infer R ? R : never`) classifies as
      // whatever `X` itself classifies as. A genuine conditional has already been caught by
      // `findAliasContract` as contract evidence before `classifyDataNode` is ever reached, so
      // any conditional surviving to this point is, by construction, the identity shape.
      const identityCheckType = this.distributiveIdentityConditionalCheckType(node);
      if (identityCheckType !== undefined) {
        return this.classifyDataNode(identityCheckType, root, visiting, depth + 1);
      }
      return { 'canonicalRoot': false, 'evidence': node, 'reason': 'primitiveForwarding', 'valid': false };
    }

    if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
      let canonicalRoot = false;
      const members = node.types;
      const length = members.length;
      for (let index = 0; index < length; index++) {
        const member = members.at(index);
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
        const element = elements.at(index);
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
        const typeArgument = typeArguments.at(0);
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
        const typeArgument = typeArguments.at(index);
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
        const member = members.at(index);
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
        const element = elements.at(index);
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
        const typeArgument = typeArguments.at(index);
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
      const typeArgument = typeArguments.at(index);
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

  /**
   * Recognizes the "distributive identity" conditional shape — `X extends infer R ? R : never`,
   * or the same shape with `never` replaced by another bare reference to the same inferred `R` —
   * and returns the checked type `X` when it matches. Both branches of this shape just re-expose
   * whatever was checked; no genuine branching occurs. Returns `undefined` for any conditional
   * whose branches actually diverge, since that IS real type-level logic and stays contract
   * evidence.
   */
  private distributiveIdentityConditionalCheckType(node: ConditionalTypeNode): TypeNode | undefined {
    if (!isInferTypeNode(node.extendsType)) { return undefined; }

    const inferredSymbol = this.checker.getSymbolAtLocation(node.extendsType.typeParameter.name);
    if (inferredSymbol === undefined) { return undefined; }
    if (!this.isBareReferenceToSymbol(node.trueType, inferredSymbol)) { return undefined; }

    if (node.falseType.kind === SyntaxKind.NeverKeyword) { return node.checkType; }
    if (this.isBareReferenceToSymbol(node.falseType, inferredSymbol)) { return node.checkType; }

    return undefined;
  }

  private isBareReferenceToSymbol(node: TypeNode, symbol: Symbol): boolean {
    if (!isTypeReferenceNode(node) || node.typeArguments !== undefined) { return false; }
    return this.checker.getSymbolAtLocation(node.typeName) === symbol;
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
    if (isConditionalTypeNode(node)) {
      // A distributive identity conditional (`X extends infer R ? R : never`, or the same shape
      // with `never` replaced by another bare reference to `R`) performs no actual type-level
      // computation — both branches just re-expose the checked type unchanged. Treating it as
      // automatic contract evidence would let a trivial identity wrapper around genuine
      // schema-derived data dodge pure-data classification. Only a conditional whose branches
      // diverge is genuine type-level logic and therefore real contract evidence.
      const identityCheckType = this.distributiveIdentityConditionalCheckType(node);
      if (identityCheckType !== undefined) {
        return this.findAliasContract(identityCheckType, visiting, depth + 1);
      }
      return { 'node': node, 'reason': 'conditional' };
    }
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
        const member = members.at(index);
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
        const element = elements.at(index);
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
        const member = members.at(index);
        if (member === undefined) { continue; }
        if (isMethodSignature(member) || isCallSignatureDeclaration(member)) {
          return { 'node': member, 'reason': 'callable' };
        }
        if (isConstructSignatureDeclaration(member)) {
          return { 'node': member, 'reason': 'constructor' };
        }
        if ((isPropertySignature(member) || isIndexSignatureDeclaration(member)) && member.type !== undefined) {
          if (this.isBrandMember(member)) { return { 'node': member, 'reason': 'brand' }; }
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
          const typeArgument = typeArguments.at(index);
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
        const typeArgument = typeArguments.at(index);
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
      const clause = heritageClauses.at(index);
      if (clause === undefined) { continue; }
      const types = clause.types;
      const typesLength = types.length;
      for (let typeIndex = 0; typeIndex < typesLength; typeIndex++) {
        const type = types.at(typeIndex);
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

    // Heuristic gate against a lone `readonly` decoy: a single readonly property bolted onto an
    // otherwise plain-mutable-data interface is a common way to game this rule into treating the
    // whole interface as a runtime contract. Genuine immutability contracts mark every property
    // readonly, not just one. This is a deliberate, documented compromise between false positives
    // (a legitimately single-readonly-field contract) and false negatives (the gamed decoy) — once
    // 3 or more sibling properties are plain mutable data, a single readonly property alone no
    // longer counts as sufficient contract evidence on its own; a genuine method, a real
    // call/construct signature, or making every property readonly still does.
    let mutableDataMemberCount = 0;
    for (let index = 0; index < length; index++) {
      const member = members.at(index);
      if (member === undefined) { continue; }
      const isMutableDataCandidate = (isPropertySignature(member) || isIndexSignatureDeclaration(member))
        && (getCombinedModifierFlags(member) & ModifierFlags.Readonly) === 0
        && member.type !== undefined
        && !this.isBrandMember(member)
        && this.findInterfaceTypeContract(member.type, nextVisiting, depth + 1) === undefined;
      if (isMutableDataCandidate) { mutableDataMemberCount++; }
    }
    const readonlyEvidenceGated = mutableDataMemberCount >= 3;

    for (let index = 0; index < length; index++) {
      const member = members.at(index);
      if (member === undefined) { continue; }

      if (isCallSignatureDeclaration(member)) {
        return { 'node': member, 'reason': 'callable' };
      }
      // A method named exactly `toString`/`valueOf` with no parameters mimics the builtin
      // `Object.prototype` shadow shape — a one-liner decoy commonly bolted onto an otherwise
      // pure-data interface to silence this rule. Excluding only this literal shape (not methods
      // generally) keeps genuinely callable interfaces flagged as contracts while closing the
      // specific gaming pattern; any other method name, or either of these two names with
      // parameters, remains ordinary — and sufficient — contract evidence.
      if (isMethodSignature(member)) {
        if (this.isBuiltinShadowMethodDecoy(member)) { continue; }
        return { 'node': member, 'reason': 'callable' };
      }
      if (isConstructSignatureDeclaration(member)) {
        return { 'node': member, 'reason': 'constructor' };
      }

      if (this.isBrandMember(member)) {
        return { 'node': member, 'reason': 'brand' };
      }

      const isReadonlyMember = (isPropertySignature(member) || isIndexSignatureDeclaration(member))
        && (getCombinedModifierFlags(member) & ModifierFlags.Readonly) !== 0;
      if (isReadonlyMember && !readonlyEvidenceGated) {
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
      const clause = heritageClauses.at(index);
      if (clause === undefined) { continue; }
      const types = clause.types;
      const typesLength = types.length;
      for (let typeIndex = 0; typeIndex < typesLength; typeIndex++) {
        const type = types.at(typeIndex);
        if (type === undefined) { continue; }
        const resolved = this.checker.getTypeAtLocation(type);
        const typeSymbol = this.resolveSymbol(resolved.aliasSymbol ?? resolved.getSymbol());
        const declarations = typeSymbol?.getDeclarations() ?? [];
        const inherited = declarations.find(isInterfaceDeclaration);
        if (inherited !== undefined) {
          const evidence = this.findInterfaceContract(inherited, nextVisiting, depth + 1);
          if (evidence !== undefined) { return { 'node': type, 'reason': evidence.reason }; }
          continue;
        }

        // A heritage clause naming a type alias (`interface X extends SomeAlias {}`) carries
        // contract evidence just as an interface heritage clause does — `SomeAlias` might itself
        // resolve to a callable, constructable, branded, or readonly object type. Only
        // `isInterfaceDeclaration` heritage was previously followed, silently dropping every
        // alias-typed heritage clause's contract evidence.
        const aliasDeclaration = declarations.find(isTypeAliasDeclaration);
        if (aliasDeclaration !== undefined) {
          const evidence = this.findInterfaceTypeContract(aliasDeclaration.type, nextVisiting, depth + 1);
          if (evidence !== undefined) { return { 'node': type, 'reason': evidence.reason }; }
        }
      }
    }

    return undefined;
  }

  /**
   * The specific `toString(): string` / `valueOf(): T` builtin-shadow shape used as a gaming
   * decoy — see {@link findInterfaceContract}'s readonly-gate comment for the fuller rationale.
   */
  private isBuiltinShadowMethodDecoy(member: MethodSignature): boolean {
    if (member.parameters.length !== 0) { return false; }
    const name = member.name;
    if (!isIdentifier(name)) { return false; }
    return name.text === 'toString' || name.text === 'valueOf';
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

      // A bare reference to the interface's own type parameter (`handler: Fn` where `Fn extends
      // () => void`) carries no contract evidence of its own — the evidence, if any, lives in the
      // parameter's declared constraint. Without this, a callable/readonly constraint laundered
      // through a type parameter escapes detection entirely, since a type parameter reference by
      // itself resolves to neither a callable nor a readonly TypeScript type.
      if (symbol !== undefined && (symbol.flags & SymbolFlags.TypeParameter) !== 0) {
        const constraint = this.typeParameterConstraintNode(symbol);
        return constraint === undefined ? undefined : this.findInterfaceTypeContract(constraint, visiting, depth + 1);
      }

      if (symbol !== undefined && (symbol.flags & SymbolFlags.Class) !== 0) {
        return { 'node': node, 'reason': 'classInstance' };
      }

      const declarations = symbol?.getDeclarations() ?? [];
      const declarationsLength = declarations.length;
      for (let index = 0; index < declarationsLength; index++) {
        const declaration = declarations.at(index);
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
        const typeArgument = typeArguments.at(index);
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
        const member = members.at(index);
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
        const element = elements.at(index);
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
        const member = members.at(index);
        if (member === undefined) { continue; }
        if (isCallSignatureDeclaration(member) || isMethodSignature(member)) {
          return { 'node': member, 'reason': 'callable' };
        }
        if (isConstructSignatureDeclaration(member)) {
          return { 'node': member, 'reason': 'constructor' };
        }
        if ((isPropertySignature(member) || isIndexSignatureDeclaration(member)) && member.type !== undefined) {
          if (this.isBrandMember(member)) { return { 'node': member, 'reason': 'brand' }; }
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
        const constituent = constituents.at(index);
        if (constituent === undefined) { continue; }
        const evidence = this.findResolvedTypeContract(constituent, evidenceNode, seen, depth + 1);
        if (evidence !== undefined) { return evidence; }
      }
      return undefined;
    }

    if ((flags & TypeFlags.Object) === 0) { return undefined; }

    // An indexed type carries its data in the element type. Its own members are
    // prototype methods supplied by the standard library — `push`, `map`, `filter`
    // and friends all own call signatures — so enumerating them classifies every
    // array as callable. The element type is the whole of the contract here.
    const elementType = type.getNumberIndexType();
    if (elementType !== undefined) {
      const result = this.findResolvedTypeContract(elementType, evidenceNode, seen, depth + 1);
      return result;
    }

    const properties = type.getProperties();
    const propertyLength = properties.length;
    for (let index = 0; index < propertyLength; index++) {
      const property = properties.at(index);
      if (property === undefined) { continue; }
      const declaration = property.valueDeclaration ?? (property.getDeclarations() ?? []).at(0);
      if (declaration === undefined) { continue; }
      const propertyType = this.checker.getTypeOfSymbolAtLocation(property, declaration);
      const evidence = this.findResolvedTypeContract(propertyType, declaration, seen, depth + 1);
      if (evidence !== undefined) { return evidence; }
    }

    return undefined;
  }

  private isFromSchemaNamedReference(node: TypeNode): boolean {
    if (!isTypeReferenceNode(node)) { return false; }
    const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));
    return symbol?.getName() === 'FromSchema';
  }

  private isIntrinsic(node: TypeNode, name: 'Array' | 'Function' | 'Readonly' | 'ReadonlyArray'): boolean {
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

  /**
   * A member keyed by a unique symbol brands its declaration nominally, whatever the member's own
   * type. `{ [Marker]: T }` and `{ readonly brand?: unique symbol }` mark the same thing from
   * opposite sides — one puts the symbol in the key, the other in the value — and neither is
   * expressible in JSON.
   */
  private hasUniqueSymbolKey(member: TypeElement): boolean {
    const name = member.name;
    if (name === undefined || !isComputedPropertyName(name)) { return false; }

    const keyType = this.checker.getTypeAtLocation(name.expression);
    return (keyType.flags & TypeFlags.UniqueESSymbol) !== 0;
  }

  private isBrandMember(member: TypeElement): boolean {
    if (this.hasUniqueSymbolKey(member)) { return true; }
    if (!isPropertySignature(member) || member.type === undefined) { return false; }
    return this.isUniqueSymbol(member.type);
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
    return shape === undefined ? false : this.isSchemaDerivedShape(shape);
  }

  /**
   * An interface's `extends FromSchema<typeof Schema>` heritage clause derives the same canonical
   * pure-data shape a `type X = FromSchema<typeof Schema>` alias does — the interface spelling of
   * the identical pattern. Heritage-clause types are `ExpressionWithTypeArguments`, not
   * `TypeNode`s, so they need their own shape resolution rather than {@link schemaDerivationShape}.
   */
  public isSchemaDerivedHeritageType(node: ExpressionWithTypeArguments): boolean {
    const typeArguments = node.typeArguments;
    if (typeArguments === undefined) { return false; }
    const valueQuery = typeArguments.find(isTypeQueryNode);
    if (valueQuery === undefined) { return false; }
    return this.isSchemaDerivedShape({ 'derivingNameNode': node.expression, 'valueQuery': valueQuery });
  }

  private isSchemaDerivedShape(shape: SchemaDerivationShapeInterface): boolean {
    const valueSymbol = this.resolveEntityNameSymbol(shape.valueQuery.exprName);
    if (valueSymbol === undefined) { return false; }

    const authoring = this.evaluateSchemaValueAuthoring(valueSymbol);
    if (!authoring.valid) { return false; }

    if (shape.derivingNameNode === undefined) { return true; }
    return this.isSchemaDerivingFunction(shape.derivingNameNode, authoring.builderCallee);
  }

  private schemaDerivationShape(node: TypeNode): SchemaDerivationShapeInterface | undefined {
    if (isTypeReferenceNode(node)) {
      const typeArguments = node.typeArguments;
      if (typeArguments === undefined) { return undefined; }
      const valueQuery = typeArguments.find(isTypeQueryNode);
      if (valueQuery === undefined) { return undefined; }
      return { 'derivingNameNode': node.typeName, 'valueQuery': valueQuery };
    }

    if (isTypeQueryNode(node) && isQualifiedName(node.exprName)) {
      return { 'derivingNameNode': undefined, 'valueQuery': node };
    }

    if (isIndexedAccessTypeNode(node) && isTypeQueryNode(node.objectType)) {
      return { 'derivingNameNode': undefined, 'valueQuery': node.objectType };
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

  private isSchemaDerivingFunction(derivingNameNode: Node, builderCallee: Symbol | undefined): boolean {
    const derivingSymbol = this.resolveSymbol(this.checker.getSymbolAtLocation(derivingNameNode));
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
    const declaration = declarations.at(0);
    if (declaration === undefined) { return undefined; }
    return this.packageRootForPath(declaration.getSourceFile().fileName.split('\\').join('/'));
  }

  private packageRootForPath(filename: string): string {
    const segments = filename.split('/node_modules/');
    if (segments.length > 1) {
      const afterNodeModules = segments.at(-1) ?? filename;
      const parts = afterNodeModules.split('/');
      const first = parts.at(0);
      const second = parts.at(1);
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

  /**
   * A type-parameter symbol's own declaration(s) carry its `extends` constraint, if any —
   * `<T extends () => void>` declares the constraint on `T`'s `TypeParameterDeclaration`, not on
   * any reference to `T`. Declaration merging aside, a type parameter has exactly one declaring
   * site, so the first constraint found wins.
   */
  private typeParameterConstraintNode(symbol: Symbol): TypeNode | undefined {
    const declarations = symbol.getDeclarations() ?? [];
    const length = declarations.length;
    for (let index = 0; index < length; index++) {
      const declaration = declarations.at(index);
      if (declaration !== undefined && isTypeParameterDeclaration(declaration) && declaration.constraint !== undefined) {
        return declaration.constraint;
      }
    }
    return undefined;
  }

  /**
   * Resolves a bare type-parameter reference (`T`, `Fn`, ...) to its declared `extends` constraint
   * type, if the node is such a reference and a constraint is present. Used by rules that need to
   * apply their own inline-data or contract classification to the constraint a type parameter
   * launders rather than skip the reference entirely — a generic constraint is as visible to
   * consumers as a directly-inlined shape, since TypeScript enforces it structurally.
   */
  public resolveTypeParameterConstraint(node: TypeNode): TypeNode | undefined {
    if (!isTypeReferenceNode(node)) { return undefined; }
    const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));
    if (symbol === undefined || (symbol.flags & SymbolFlags.TypeParameter) === 0) { return undefined; }
    return this.typeParameterConstraintNode(symbol);
  }
}
