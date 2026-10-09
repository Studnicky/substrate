import {
  type ExpressionWithTypeArguments,
  type InterfaceDeclaration,
  type IntersectionTypeNode,
  isIndexSignatureDeclaration,
  isIntersectionTypeNode,
  isMappedTypeNode,
  isMethodSignature,
  isOptionalTypeNode,
  isParenthesizedTypeNode,
  isPropertySignature,
  isRestTypeNode,
  isTypeAliasDeclaration,
  isTypeLiteralNode,
  isTypeOperatorNode,
  isTypeReferenceNode,
  isUnionTypeNode,
  type Node,
  type Program,
  SymbolFlags,
  SyntaxKind,
  type TypeAliasDeclaration,
  type TypeNode,
  type UnionTypeNode
} from 'typescript';

import { type AliasClassificationResultInterface } from './AliasClassificationResultInterface.js';
import { type InterfaceClassificationResultInterface } from './InterfaceClassificationResultInterface.js';
import { TypeContractAliasResolution } from './TypeContractAliasResolution.js';
import { TypeContractCallabilityClassification } from './TypeContractCallabilityClassification.js';
import { TypeContractContext } from './TypeContractContext.js';
import { TypeContractDataNodeClassification } from './TypeContractDataNodeClassification.js';
import { TypeContractInterfaceContractResolution } from './TypeContractInterfaceContractResolution.js';
import { TypeContractInterfaceTypeResolution } from './TypeContractInterfaceTypeResolution.js';

/**
 * Provides the shared semantic declaration classification consumed by the
 * entity/type rules. The service is cached per TypeScript Program and never
 * reports diagnostics or applies placement/configuration policy.
 */
export class TypeContractClassification {
  private static readonly programs = new WeakMap<Program, TypeContractClassification>();

  private readonly context: TypeContractContext;

  private constructor(program: Program) {
    this.context = new TypeContractContext(program);
    this.context.dataNode = new TypeContractDataNodeClassification(this.context);
    this.context.callability = new TypeContractCallabilityClassification(this.context);
    this.context.aliasResolution = new TypeContractAliasResolution(this.context);
    this.context.interfaceContract = new TypeContractInterfaceContractResolution(this.context);
    this.context.interfaceType = new TypeContractInterfaceTypeResolution(this.context);
  }

  public static forProgram(program: Program): TypeContractClassification {
    const cached = TypeContractClassification.programs.get(program);

    if (cached !== undefined) {
      return cached;
    }

    const classification = new TypeContractClassification(program);

    TypeContractClassification.programs.set(program, classification);

    return classification;
  }

  /**
   * Identifies the sole entity namespace alias that owns a schema-derived public data type.
   * The alias must resolve to the canonical `json-schema-to-ts` `FromSchema` export with
   * `typeof Schema`, and the queried value must be declared by the same entity namespace.
   */
  public isCanonicalEntityTypeAlias(declaration: TypeAliasDeclaration): boolean {
    const result = this.context.aliasResolution.isCanonicalEntityTypeAlias(declaration);

    return result;
  }

  public isSchemaDerivedHeritageType(node: ExpressionWithTypeArguments): boolean {
    const result = this.context.interfaceType.isSchemaDerivedHeritageType(node);

    return result;
  }

  public isCanonicalEntityInterface(declaration: InterfaceDeclaration): boolean {
    const result = this.context.interfaceType.isCanonicalEntityInterface(declaration);

    return result;
  }

  public isSchemaDerivationApplication(node: TypeNode): boolean {
    const result = this.context.isSchemaDerivationApplication(node);

    return result;
  }

  public analyzeAlias(declaration: TypeAliasDeclaration): AliasClassificationResultInterface {
    const result = this.context.analyzeAlias(declaration);

    return result;
  }

  public analyzeInterface(declaration: InterfaceDeclaration): InterfaceClassificationResultInterface {
    const result = this.context.analyzeInterface(declaration);

    return result;
  }

  public isInlinePureDataPortion(node: Node): boolean {
    if (isTypeLiteralNode(node)) {
      const result = this.context.interfaceType.findInterfaceTypeContract(node, new Set(), 0) === undefined;

      return result;
    }

    if (!isMappedTypeNode(node) || node.type === undefined) {
      return false;
    }
    if (
      node.readonlyToken?.kind === SyntaxKind.ReadonlyKeyword
      || node.readonlyToken?.kind === SyntaxKind.PlusToken
    ) {
      return false;
    }

    const result = this.context.interfaceType.findInterfaceTypeContract(node.type, new Set(), 0) === undefined;

    return result;
  }

  public isInlineContractPortion(node: Node): boolean {
    if (!isTypeLiteralNode(node) && !isMappedTypeNode(node)) {
      return false;
    }

    const result = this.context.interfaceType.findInterfaceTypeContract(node, new Set(), 0) !== undefined;

    return result;
  }

  /**
   * A brand member marks its declaration nominally and has no schema-derived equivalent, since
   * JSON expresses no symbol. Extraction to a named entity is unavailable to it.
   */
  public isBrandDeclarationMember(member: Node): boolean {
    if (!isPropertySignature(member) && !isIndexSignatureDeclaration(member) && !isMethodSignature(member)) {
      return false;
    }

    const result = this.context.isBrandMember(member);

    return result;
  }

  public containsTypeParameterReference(node: Node): boolean {
    const result = this.context.containsTypeParameterReference(node);

    return result;
  }

  public requiresNamedDataComposition(node: TypeNode): boolean {
    // D2 (see the eslint-config objectives): `interfaces-compose-named-types` composes pure-data
    // *portions* into named schema-derived entity types — its own `meta.docs.description` says so
    // ("compose pure-data portions from named schema-derived entity types"), and that only makes
    // sense for a shape actually worth naming: an object or array. A bare `string`/`number`/
    // `boolean` member has no shape to extract. `classifyDataNode`'s generic fallback for a bare
    // keyword type node returns `primitiveForwarding`/`canonicalRoot: false` unconditionally — a
    // correct answer for THAT method's other callers (`classifyAlias`, where `type IdType =
    // string;` must still be rejected as `primitiveTypeAlias`; see
    // `typeAliasInvariants.scenarios.json`), but wrong for a plain interface member, where
    // `canonicalRoot: false` was being read as "needs extraction." VERIFIED via `npx eslint`
    // probe (ZzP4 prefix): `interface XInterface { run(): void; count: number; }` — a contract
    // interface with a bare `number` member — was flagged, demanding `count` be extracted to a
    // named entity, which is not a fixable shape (there is nothing to name). This exemption is
    // scoped to THIS method only (not `classifyDataNode` itself, which stays untouched) so the
    // alias-root and union/tuple/array-member semantics `classifyAlias` relies on elsewhere are
    // unaffected — `requiresNamedDataComposition` is `classifyDataNode`'s only external caller
    // besides the class's own recursive alias classification.
    if (TypeContractClassification.isBareScalarKeyword(node)) {
      return false;
    }

    if (this.context.interfaceType.findInterfaceTypeContract(node, new Set(), 0) !== undefined) {
      return false;
    }
    if (this.containsTypeParameterReference(node)) {
      return false;
    }

    const data = this.context.dataNode.classifyDataNode(node, false, new Set(), 0);

    const result = !data.valid || !data.canonicalRoot;

    return result;
  }

  /**
   * True when `node` — after unwrapping the same transparent parenthesized/optional/rest/
   * `readonly`-operator wrappers {@link classifyDataNode} itself unwraps — is a bare `string`/
   * `number`/`boolean` keyword type node. Deliberately excludes `bigint`, `symbol`, `any`, and
   * `unknown`: none has a JSON-schema representation, so those remain flagged for the (different,
   * still valid) reason `classifyDataNode` already reports them under.
   */
  private static isBareScalarKeyword(node: TypeNode): boolean {
    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      const result = TypeContractClassification.isBareScalarKeyword(node.type);

      return result;
    }
    if (isTypeOperatorNode(node) && node.operator === SyntaxKind.ReadonlyKeyword) {
      const result = TypeContractClassification.isBareScalarKeyword(node.type);

      return result;
    }

    const kind = node.kind;

    const result = kind === SyntaxKind.StringKeyword || kind === SyntaxKind.NumberKeyword || kind === SyntaxKind.BooleanKeyword;

    return result;
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
    const flags = this.context.callability.classifyCallability(node, new Set(), 0);

    const result = flags.hasCallable && flags.hasData;

    return result;
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
    if (isParenthesizedTypeNode(node)) {
      const result = this.isTopLevelMixedCallableData(node.type);

      return result;
    }
    if (!isUnionTypeNode(node) && !isIntersectionTypeNode(node)) {
      return false;
    }

    const result = this.mixesCallableAndData(node);

    return result;
  }

  // `any` as a direct constituent is reported here unconditionally rather than deferred to
  // `no-mixed-callable-shapes` — see type-alias-invariants.md Related rules for why.
  public topLevelMixIncludesAny(node: TypeNode): boolean {
    if (isParenthesizedTypeNode(node)) {
      const result = this.topLevelMixIncludesAny(node.type);

      return result;
    }
    if (!isUnionTypeNode(node) && !isIntersectionTypeNode(node)) {
      return false;
    }

    const result = node.types.some(TypeContractClassification.isAnyConstituent);

    return result;
  }

  /**
   * A top-level union where every constituent is a NAMED reference — to a pure-data contract
   * interface, or to a schema-derived canonical `Type` alias — has no interface remedy: TypeScript
   * cannot express a union as itself one interface, the same limitation
   * {@link isTopLevelMixedCallableData} documents for a callable+data mix. Each constituent is
   * already a legitimate, independently-declared shape — the union exists only to name "one of
   * these shapes" for a discriminated-union call site. An inline object-literal constituent is a
   * different case and is never exempted here: a codebase-owned shape hiding inside the union
   * still belongs in a named type, so at least one non-reference member fails this check.
   */
  public isTopLevelUnionOfNamedSchemaDerivedConstituents(node: TypeNode): boolean {
    if (isParenthesizedTypeNode(node)) {
      const result = this.isTopLevelUnionOfNamedSchemaDerivedConstituents(node.type);

      return result;
    }
    if (!isUnionTypeNode(node)) {
      return false;
    }

    const members = node.types;

    if (members.length === 0) {
      return false;
    }

    for (let index = 0; index < members.length; index++) {
      const member = members.at(index);

      if (member === undefined || !this.isNamedSchemaDerivedConstituent(member)) {
        return false;
      }
    }

    return true;
  }

  private isNamedSchemaDerivedConstituent(member: TypeNode): boolean {
    const result = this.context.interfaceContract.isDataContractInterfaceReference(member, new Set(), 0)
      || this.isCanonicalTypeAliasReference(member);

    return result;
  }

  // The type-alias counterpart to `isDataContractInterfaceReference` — a bare named reference,
  // e.g. `SomeEntity.Type`, resolving to a type alias whose own body is schema-derived. Unlike
  // that method, this never unwraps an inline object literal: only a reference counts.
  private isCanonicalTypeAliasReference(node: TypeNode): boolean {
    if (!isTypeReferenceNode(node)) {
      return false;
    }

    const symbol = this.context.resolveSymbol(this.context.checker.getSymbolAtLocation(node.typeName));
    const declarations = symbol?.getDeclarations() ?? [];
    const declarationCount = declarations.length;

    for (let index = 0; index < declarationCount; index++) {
      const declaration = declarations.at(index);

      if (declaration !== undefined && isTypeAliasDeclaration(declaration) && this.context.isSchemaDerivedApplication(declaration.type)) {
        return true;
      }
    }

    return false;
  }

  /**
   * A `readonly`-evidenced contract interface is not on its own proof the shape is schema-derived
   * data — a hand-authored interface with plain unconstrained primitive properties (`{ readonly
   * value: string }`) classifies as `'contract'`/`'readonly'` too, and no other rule in this
   * codebase's family catches that case when it appears as a union member: `interfaces-compose-
   * named-types` only bans an INLINE object-literal member, not a bare primitive; `type-alias-
   * invariants` only inspects named type-alias declarations, not interface property types. This
   * requires at least one anchor — a heritage clause or a property whose type traces (directly, or
   * through one level of named-type indirection, e.g. `SomeEntity.Type`) back to a real
   * `FromSchema<typeof Schema>` derivation — before `isTopLevelUnionOfDataContractInterfaces` may
   * treat the interface as a legitimate schema-derived union member. A member may still carry
   * additional free-typed leaf properties alongside that anchor (`StringGroupValueInterface.match:
   * string` next to its schema-derived `type` discriminant) — only total absence of any anchor is
   * rejected.
   */
  private static isAnyConstituent(node: TypeNode): boolean {
    if (isParenthesizedTypeNode(node) || isOptionalTypeNode(node) || isRestTypeNode(node)) {
      const result = TypeContractClassification.isAnyConstituent(node.type);

      return result;
    }
    if (isTypeOperatorNode(node) && node.operator === SyntaxKind.ReadonlyKeyword) {
      const result = TypeContractClassification.isAnyConstituent(node.type);

      return result;
    }

    const result = node.kind === SyntaxKind.AnyKeyword;

    return result;
  }

  public resolveTypeParameterConstraint(node: TypeNode): TypeNode | undefined {
    if (!isTypeReferenceNode(node)) {
      return undefined;
    }
    const symbol = this.context.resolveSymbol(this.context.checker.getSymbolAtLocation(node.typeName));

    if (symbol === undefined || (symbol.flags & SymbolFlags.TypeParameter) === 0) {
      return undefined;
    }

    const result = this.context.typeParameterConstraintNode(symbol);

    return result;
  }
}
