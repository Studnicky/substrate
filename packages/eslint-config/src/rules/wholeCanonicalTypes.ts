import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types';
import {
  isIndexedAccessTypeNode,
  isLiteralTypeNode,
  isMappedTypeNode,
  isPropertySignature,
  isStringLiteral,
  isTypeAliasDeclaration,
  isTypeLiteralNode,
  isTypeReferenceNode,
  isUnionTypeNode,
  type MappedTypeNode,
  type Program,
  type Symbol,
  SymbolFlags,
  SyntaxKind,
  type Type,
  type TypeChecker,
  type TypeNode,
  type TypeReferenceNode
} from 'typescript';

import { AstHelpers } from './shared/astHelpers.js';

/**
 * whole-canonical-types — canonical data shapes (named `type`/`interface` declarations
 * this codebase owns, most often entity `.Type`s) must be consumed whole. `Partial<X>`,
 * `Pick<X, K>`, and `Omit<X, K>` silently narrow a canonical shape into an ad-hoc subset,
 * so downstream consumers stop being forced to reckon with every property the canonical
 * shape actually carries. If a genuinely different shape is needed, define an explicit
 * type/entity for it instead of deriving one positionally from the canonical type.
 *
 * `Partial`/`Pick`/`Omit` applied to a local generic type parameter, an inline object-literal
 * type, or a type declared outside this codebase (node_modules) are not flagged — those are
 * not "our" canonical domain shapes being silently subsetted.
 */

const SUBSETTING_UTILITY_NAMES = new Set(['Omit', 'Partial', 'Pick']);

interface NodeMapInterface {
  readonly 'get': (node: unknown) => TypeNode | undefined;
}

interface ParserServicesInterface {
  readonly 'esTreeNodeToTSNodeMap': NodeMapInterface;
  readonly 'getTypeAtLocation': (node: unknown) => Type;
  readonly 'program': Program;
}

interface SourceCodeServicesAccessorInterface {
  readonly 'parserServices'?: ParserServicesInterface;
}

class ParserServicesGuard {
  public static hasTypeInformation(value: unknown): value is ParserServicesInterface {
    if (!Predicates.isRecord(value) || typeof value.getTypeAtLocation !== 'function') { return false; }
    if (!Predicates.isRecord(value.esTreeNodeToTSNodeMap) || typeof value.esTreeNodeToTSNodeMap.get !== 'function') {
      return false;
    }
    const result = Predicates.isRecord(value.program) && typeof value.program.getTypeChecker === 'function';
    return result;
  }
}

class ContextHelpers {
  public static getServices(context: Rule.RuleContext): ParserServicesInterface | undefined {
    const sourceCode: SourceCodeServicesAccessorInterface = context.sourceCode;
    const services: unknown = sourceCode.parserServices;
    const result = ParserServicesGuard.hasTypeInformation(services) ? services : undefined;
    return result;
  }
}

class SubsettingUtilityMatch {
  public static getUtilityName(node: Record<string, unknown>): string | undefined {
    if (AstHelpers.getNodeType(node) !== 'TSTypeReference') { return undefined; }
    const name = AstHelpers.getIdentifierName(node.typeName);
    if (name === undefined || !SUBSETTING_UTILITY_NAMES.has(name)) { return undefined; }
    return name;
  }

  public static getFirstTypeArgument(node: Record<string, unknown>): unknown {
    const wrapper = node.typeArguments ?? node.typeParameters;
    if (!Predicates.isRecord(wrapper)) { return undefined; }
    const parameters: unknown = wrapper.params;
    if (!Array.isArray(parameters)) { return undefined; }
    const result: unknown = parameters.at(0);
    return result;
  }
}

class CanonicalTypeResolution {
  public static isCanonicalOwnedType(typeArgNode: unknown, services: ParserServicesInterface): boolean {
    if (!Predicates.isRecord(typeArgNode)) { return false; }
    if (AstHelpers.getNodeType(typeArgNode) !== 'TSTypeReference') { return false; }

    const type = services.getTypeAtLocation(typeArgNode);
    const symbol: Symbol | undefined = type.aliasSymbol ?? type.getSymbol();
    if (symbol === undefined) { return false; }

    const declarations = symbol.getDeclarations() ?? [];
    if (declarations.length === 0) { return false; }

    const isGenericParameter = declarations.some((declaration) => { const result = declaration.kind === SyntaxKind.TypeParameter;
      return result; });
    if (isGenericParameter) { return false; }

    const isNamedTypeDeclaration = declarations.some((declaration) => {
      const result = declaration.kind === SyntaxKind.TypeAliasDeclaration || declaration.kind === SyntaxKind.InterfaceDeclaration;
      return result;
    });
    if (!isNamedTypeDeclaration) { return false; }

    const isExternallyOwned = declarations.every((declaration) => {
      const fileName = declaration.getSourceFile().fileName;
      const result = fileName.includes('/node_modules/');
      return result;
    });
    const result = !isExternallyOwned;
    return result;
  }

  /**
   * The `TypeNode`-based twin of {@link isCanonicalOwnedType}, for callers that already hold a
   * TypeScript compiler `TypeNode` (the mapped-type and indexed-access structural-matching paths)
   * rather than an ESTree node paired with `getTypeAtLocation`.
   */
  public static isCanonicalOwnedTypeNode(typeNode: TypeNode, checker: TypeChecker): boolean {
    if (!isTypeReferenceNode(typeNode)) { return false; }

    const type = checker.getTypeFromTypeNode(typeNode);
    const symbol: Symbol | undefined = type.aliasSymbol ?? type.getSymbol();
    if (symbol === undefined) { return false; }

    const declarations = symbol.getDeclarations() ?? [];
    if (declarations.length === 0) { return false; }

    const isGenericParameter = declarations.some((declaration) => { const result = declaration.kind === SyntaxKind.TypeParameter;
      return result; });
    if (isGenericParameter) { return false; }

    const isNamedTypeDeclaration = declarations.some((declaration) => {
      const result = declaration.kind === SyntaxKind.TypeAliasDeclaration || declaration.kind === SyntaxKind.InterfaceDeclaration;
      return result;
    });
    if (!isNamedTypeDeclaration) { return false; }

    const isExternallyOwned = declarations.every((declaration) => {
      const fileName = declaration.getSourceFile().fileName;
      const result = fileName.includes('/node_modules/');
      return result;
    });
    const result = !isExternallyOwned;
    return result;
  }

}

/**
 * Resolves the literal string-key set a mapped type's key clause (`[K in ...]`) enumerates,
 * when that clause is a string-literal type or a union of string-literal types — the shape a
 * manual `Pick`/`Omit` reimplementation's key clause takes (`'a'`, `'a' | 'b'`). Any other
 * constraint shape (a `keyof` operator, a generic type parameter, ...) returns `undefined`,
 * since those are not the literal-key subsetting pattern this check targets.
 */
class MappedKeySet {
  public static resolve(constraint: TypeNode | undefined): Set<string> | undefined {
    if (constraint === undefined) { return undefined; }

    if (isLiteralTypeNode(constraint) && isStringLiteral(constraint.literal)) {
      return new Set([constraint.literal.text]);
    }

    if (isUnionTypeNode(constraint)) {
      const keys = new Set<string>();
      for (const member of constraint.types) {
        if (!isLiteralTypeNode(member) || !isStringLiteral(member.literal)) { return undefined; }
        keys.add(member.literal.text);
      }
      return keys;
    }

    return undefined;
  }
}

/**
 * Structural (not name-based) matching for the mapped-type shape a manual `Pick`/`Omit`
 * reimplementation takes — `{ [P in K]: T[P] }` — used both directly on a mapped type written at
 * the use site and, recursively, on a locally-defined generic alias's own body to catch a
 * custom-named reimplementation (`type MyPick<T, K extends keyof T> = { [P in K]: T[P] }`).
 */
class MappedSubsettingShape {
  /**
   * True when the mapped type's value clause is an indexed-access `objectType[indexType]` where
   * `indexType` is a bare reference to the mapped type's own key parameter — the structural core
   * of every `Pick`/`Omit`/manual-subsetting mapped type, regardless of what the key clause or
   * object type resolve to.
   */
  public static indexesOwnKeyParameter(node: MappedTypeNode, checker: TypeChecker): TypeReferenceNode | undefined {
    if (node.type === undefined || !isIndexedAccessTypeNode(node.type)) { return undefined; }
    const { indexType, objectType } = node.type;
    if (!isTypeReferenceNode(objectType) || !isTypeReferenceNode(indexType)) { return undefined; }

    const keyParameterSymbol = checker.getSymbolAtLocation(node.typeParameter.name);
    const indexSymbol = checker.getSymbolAtLocation(indexType.typeName);
    if (keyParameterSymbol === undefined || indexSymbol !== keyParameterSymbol) { return undefined; }

    return objectType;
  }

  /**
   * True when a generic alias's own declared body is structurally the `{ [P in K]: T[P] }`
   * reimplementation shape, with `T` and `K` both being the alias's OWN, DISTINCT type
   * parameters (a reusable utility, not yet applied to any concrete type) — the shape
   * `type MyPick<T, K extends keyof T> = { [P in K]: T[P] }` takes.
   *
   * The key clause must be a bare reference to a SEPARATE type parameter, not a `keyof T`
   * operator applied directly — that second detail is what distinguishes an externally
   * caller-narrowable subset (`Pick`'s own `K extends keyof T`, where a caller supplies which
   * keys to keep) from a full-key transform like `Required<T> = { [P in keyof T]-?: T[P] }` or
   * `Partial`, which structurally share the identical `{ [P in K]: T[P] }` skeleton but always
   * retain every one of `T`'s own keys and therefore never hide any property.
   */
  public static isReusableUtilityBody(mapped: MappedTypeNode, checker: TypeChecker): boolean {
    const objectType = MappedSubsettingShape.indexesOwnKeyParameter(mapped, checker);
    if (objectType === undefined) { return false; }

    const objectSymbol = checker.getSymbolAtLocation(objectType.typeName);
    if (objectSymbol === undefined || (objectSymbol.flags & SymbolFlags.TypeParameter) === 0) { return false; }

    const constraint = mapped.typeParameter.constraint;
    if (constraint === undefined || !isTypeReferenceNode(constraint) || constraint.typeArguments !== undefined) {
      return false;
    }
    const constraintSymbol = checker.getSymbolAtLocation(constraint.typeName);
    if (constraintSymbol === undefined || (constraintSymbol.flags & SymbolFlags.TypeParameter) === 0) { return false; }

    const result = constraintSymbol !== objectSymbol;
    return result;
  }
}

/**
 * Resolves `getUtilityName`'s literal-name miss (a `TSTypeReference` whose name is not
 * `Omit`/`Partial`/`Pick`) by checking whether the referenced alias's OWN definition is itself a
 * `{ [P in K]: T[P] }` reusable-utility reimplementation — closing the "custom-named alias"
 * subsetting-utility gap without hardcoding any additional name.
 */
class CustomUtilityAliasMatch {
  public static resolve(typeNode: TypeNode, checker: TypeChecker): string | undefined {
    if (!isTypeReferenceNode(typeNode)) { return undefined; }

    const symbol = checker.getSymbolAtLocation(typeNode.typeName);
    if (symbol === undefined) { return undefined; }
    const resolved = (symbol.flags & SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol;

    const aliasDeclaration = (resolved.getDeclarations() ?? []).find(isTypeAliasDeclaration);
    if (aliasDeclaration === undefined || !isMappedTypeNode(aliasDeclaration.type)) { return undefined; }
    if (!MappedSubsettingShape.isReusableUtilityBody(aliasDeclaration.type, checker)) { return undefined; }

    const result = resolved.getName();
    return result;
  }
}

export const wholeCanonicalTypes: Rule.RuleModule = {
  'create': (context) => {
    const services = ContextHelpers.getServices(context);
    const checker: TypeChecker | undefined = services?.program === undefined ? undefined : services.program.getTypeChecker();

    if (services === undefined || checker === undefined) { return {}; }

    const report = (node: Rule.Node, utility: string): void => {
      context.report({
        'data': { 'utility': utility },
        'messageId': 'noPartialCanonicalType',
        'node': node
      });
    };

    const onTSTypeReference = (node: Rule.Node): void => {
      const rawNode: unknown = node;
      if (!Predicates.isRecord(rawNode)) { return; }
      const literalUtilityName = SubsettingUtilityMatch.getUtilityName(rawNode);

      if (literalUtilityName !== undefined) {
        const typeArgNode = SubsettingUtilityMatch.getFirstTypeArgument(rawNode);
        if (CanonicalTypeResolution.isCanonicalOwnedType(typeArgNode, services)) {
          report(node, literalUtilityName);
        }
        return;
      }

      // The reference's own name isn't a literal `Omit`/`Partial`/`Pick` — check whether it
      // resolves to a LOCALLY-DEFINED alias that is itself a `{ [P in K]: T[P] }` reusable
      // reimplementation of the same subsetting effect (`type MyPick<T, K> = { [P in K]: T[P] }`).
      const typeScriptNode = services.esTreeNodeToTSNodeMap.get(node);
      if (typeScriptNode === undefined) { return; }
      const customUtilityName = CustomUtilityAliasMatch.resolve(typeScriptNode, checker);
      if (customUtilityName === undefined) { return; }

      const typeArgNode = SubsettingUtilityMatch.getFirstTypeArgument(rawNode);
      if (CanonicalTypeResolution.isCanonicalOwnedType(typeArgNode, services)) {
        report(node, customUtilityName);
      }
    };

    // A manual mapped type reproducing `Pick`/`Omit`'s effect with zero reference to any
    // Omit/Partial/Pick-named utility type at all — `{ [K in 'a']: FooType[K] }` — subsets a
    // canonical type's own property set exactly as `Pick<FooType, 'a'>` would, just spelled out
    // by hand. Flagged when the mapped type's key clause resolves to a literal, non-empty,
    // PROPER subset of the target canonical type's own property names.
    const onMappedType = (node: Rule.Node): void => {
      const mapped = services.esTreeNodeToTSNodeMap.get(node);
      if (mapped === undefined || !isMappedTypeNode(mapped)) { return; }

      const objectType = MappedSubsettingShape.indexesOwnKeyParameter(mapped, checker);
      if (objectType === undefined) { return; }
      if (!CanonicalTypeResolution.isCanonicalOwnedTypeNode(objectType, checker)) { return; }

      const keys = MappedKeySet.resolve(mapped.typeParameter.constraint);
      if (keys === undefined || keys.size === 0) { return; }

      const canonicalKeys = new Set<string>();
      const properties = checker.getTypeFromTypeNode(objectType).getProperties();
      const propertyCount = properties.length;
      for (let propertyIndex = 0; propertyIndex < propertyCount; propertyIndex += 1) {
        const property = properties.at(propertyIndex);
        if (property === undefined) { continue; }
        canonicalKeys.add(property.getName());
      }
      const isProperSubset = keys.size < canonicalKeys.size && [...keys].every(canonicalKeys.has, canonicalKeys);
      if (!isProperSubset) { return; }

      report(node, 'a manually mapped Pick');
    };

    // Plain inline indexed-access subsetting — `{ a: FooType['a']; b: FooType['b']; }` — reaches
    // the same result as `Pick<FooType, 'a' | 'b'>` by spelling each retained property out
    // individually via indexed access into the same canonical type, with no utility type or
    // mapped-type syntax involved at all. Flagged only when EVERY member of the type literal is
    // such an indexed-access reference into the SAME canonical type, keeping this from
    // misfiring on a heterogeneous type literal that merely borrows one property's type.
    const onTypeLiteral = (node: Rule.Node): void => {
      const literal = services.esTreeNodeToTSNodeMap.get(node);
      if (literal === undefined || !isTypeLiteralNode(literal) || literal.members.length === 0) { return; }

      let canonicalObjectType: TypeReferenceNode | undefined;
      let canonicalSymbol: Symbol | undefined;
      const keys = new Set<string>();

      for (const member of literal.members) {
        if (!isPropertySignature(member) || member.type === undefined || !isIndexedAccessTypeNode(member.type)) { return; }
        const { indexType, objectType } = member.type;
        if (!isTypeReferenceNode(objectType) || !isLiteralTypeNode(indexType) || !isStringLiteral(indexType.literal)) {
          return;
        }

        const symbol = checker.getSymbolAtLocation(objectType.typeName);
        if (canonicalObjectType === undefined) {
          canonicalObjectType = objectType;
          canonicalSymbol = symbol;
        } else if (symbol === undefined || symbol !== canonicalSymbol) {
          return;
        }

        keys.add(indexType.literal.text);
      }

      if (canonicalObjectType === undefined) { return; }
      if (!CanonicalTypeResolution.isCanonicalOwnedTypeNode(canonicalObjectType, checker)) { return; }

      const canonicalKeys = new Set<string>();
      const properties = checker.getTypeFromTypeNode(canonicalObjectType).getProperties();
      const propertyCount = properties.length;
      for (let propertyIndex = 0; propertyIndex < propertyCount; propertyIndex += 1) {
        const property = properties.at(propertyIndex);
        if (property === undefined) { continue; }
        canonicalKeys.add(property.getName());
      }
      const isProperSubset = keys.size < canonicalKeys.size && [...keys].every(canonicalKeys.has, canonicalKeys);
      if (!isProperSubset) { return; }

      report(node, 'inline indexed-access Pick');
    };

    return {
      'TSMappedType': onMappedType,
      'TSTypeLiteral': onTypeLiteral,
      'TSTypeReference': onTSTypeReference
    };
  },
  'meta': {
    'docs': {
      'description': "Disallow deriving 'Partial'/'Pick'/'Omit' subset views from canonical, codebase-owned named types/interfaces. Canonical data shapes must be consumed whole — define an explicit type for a genuinely different shape instead of positionally subsetting one.",
      'recommended': false
    },
    'messages': {
      'noPartialCanonicalType': "'{{utility}}<...>' derives an implicit subset of a canonical type. A partial type masks what the real data shape is — consumers must always be aware of every property a canonical shape carries. Use the full type, or define an explicit, fully-spelled-out type/entity for the shape you actually need. There is no exemption for this rule."
    },
    'schema': [],
    'type': 'problem'
  }
};
