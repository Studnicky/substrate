import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types/browser';
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
  type Node,
  type Program,
  type Symbol,
  SymbolFlags,
  SyntaxKind,
  type Type,
  type TypeAliasDeclaration,
  type TypeChecker,
  type TypeNode,
  type TypeReferenceNode
} from 'typescript';

import {
  PRIMITIVE_DISPLAY_NAMES, PRIMITIVE_TYPES
} from './constants/TypeAliasInvariantsConstants.js';
import { AstHelpers } from './shared/astHelpers.js';
import { TypeContractClassification } from './shared/TypeContractClassification.js';

/**
 * Enforces one ordered alias-declaration contract:
 *
 * 1. mustEndType — exported type aliases must end in `Type`.
 * 2. noReadonly — type aliases must not author readonly output policy.
 * 3. noAliasing — disallow naked type re-aliases and import aliases.
 * 4. derivedFromSchema — retain only verified schema-derived pure-data aliases.
 * 5. noPartialCanonicalType — canonical, codebase-owned types are consumed whole, never
 *    subsetted via `Partial`/`Pick`/`Omit` or a structural equivalent.
 *
 * Declaration-shape and canonical-purity verdicts precede naming and readonly checks.
 * Precise alias-identity diagnostics refine invalid pure-data provenance without
 * relying on structural-similarity heuristics.
 */

// ---------------------------------------------------------------------------
// Check 1: mustEndType — exported type aliases must end in `Type`.
// ---------------------------------------------------------------------------

/**
 * Names re-exported as a type via a separate, non-declaring `export { ... }` specifier list,
 * scanned once per file and cached — `MustEndTypeCheck.run` is called once per top-level type
 * alias, and re-scanning the whole `Program` body per alias would make this O(aliases × body
 * length) instead of O(body length).
 */
class ReexportedTypeNames {
  private static readonly cache = new WeakMap<object, ReadonlyMap<string, string>>();

  /**
   * Maps each locally-declared name to the name a separate, non-declaring `export { ... }`
   * specifier list actually re-exports it as. Consumers only ever see the `exported` name — a
   * declaration named `LocalNameType` re-exported as `ExportedNonTypeName` is imported by every
   * consumer as `ExportedNonTypeName`, so that is the name the `Type`-suffix requirement must be
   * checked against, not the declaration's own local name.
   */
  public static collect(context: Rule.RuleContext): ReadonlyMap<string, string> {
    const program = context.sourceCode.ast;
    const cached = ReexportedTypeNames.cache.get(program);

    if (cached !== undefined) {
      return cached;
    }

    const names = new Map<string, string>();
    const body: readonly unknown[] = Array.isArray(program.body) ? program.body : [];

    body.forEach((statement) => {
      if (!Predicates.isRecord(statement)) {
        return;
      }
      if (statement.type !== 'ExportNamedDeclaration') {
        return;
      }
      if (statement.declaration !== null && statement.declaration !== undefined) {
        return;
      }
      if (statement.source !== null && statement.source !== undefined) {
        return;
      }

      const specifiers: readonly unknown[] = Array.isArray(statement.specifiers) ? statement.specifiers : [];
      const specifiersLength = specifiers.length;

      for (let specifierIndex = 0; specifierIndex < specifiersLength; specifierIndex += 1) {
        const specifier = specifiers.at(specifierIndex);

        if (!Predicates.isRecord(specifier)) {
          continue;
        }
        if (statement.exportKind === 'type' || specifier.exportKind === 'type') {
          const localName = Predicates.isRecord(specifier.local)
            ? AstHelpers.getIdentifierName(specifier.local)
            : undefined;
          const exportedName = Predicates.isRecord(specifier.exported)
            ? AstHelpers.getIdentifierName(specifier.exported)
            : undefined;

          if (localName !== undefined && exportedName !== undefined) {
            names.set(localName, exportedName);
          }
        }
      }
    });

    ReexportedTypeNames.cache.set(program, names);

    return names;
  }
}

class MustEndTypeCheck {
  public static run(context: Rule.RuleContext, node: Rule.Node): void {
    const rawNode: unknown = node;

    if (!Predicates.isRecord(rawNode) || !Predicates.isRecord(rawNode.parent)) {
      return;
    }
    const name = AstHelpers.getIdentifierName(rawNode.id);

    if (name === undefined) {
      return;
    }

    const isInlineExport = rawNode.parent.type === 'ExportNamedDeclaration';
    const reexportedAs = rawNode.parent.type === 'Program' ? ReexportedTypeNames.collect(context).get(name) : undefined;
    const isSeparateReexport = reexportedAs !== undefined;

    if (!isInlineExport && !isSeparateReexport) {
      return;
    }

    // The exported name is the name surface consumers actually see — check that, falling back to
    // the declared name only when there is no separate re-export renaming it.
    const nameToCheck = reexportedAs ?? name;

    if (nameToCheck.endsWith('Type')) {
      return;
    }

    context.report({
      'data': { 'name': nameToCheck },
      'messageId': 'mustEndType',
      'node': node
    });
  }
}

interface ParserServicesInterface {
  readonly 'esTreeNodeToTSNodeMap': ReadonlyMap<object, Node>;
  readonly 'getTypeAtLocation': (node: unknown) => Type;
  readonly 'program': Program;
}

interface SourceCodeServicesAccessorInterface {
  readonly 'parserServices'?: ParserServicesInterface;
}

class ParserServicesGuard {
  public static hasTypeInformation(value: unknown): value is ParserServicesInterface {
    if (!Predicates.isRecord(value)) {
      return false;
    }
    if (!Predicates.isRecord(value.esTreeNodeToTSNodeMap) || typeof value.esTreeNodeToTSNodeMap.get !== 'function') {
      return false;
    }
    if (typeof value.getTypeAtLocation !== 'function') {
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

class ReadonlyCheck {
  public static checkAlias(
    context: Rule.RuleContext,
    declaration: TypeAliasDeclaration,
    analysis: ReturnType<TypeContractClassification['analyzeAlias']>
  ): void {
    const { sourceCode } = context;
    const sourceFile = declaration.getSourceFile();

    const evidenceList = analysis.readonlyOutput;
    const evidenceCount = evidenceList.length;

    for (let index = 0; index < evidenceCount; index++) {
      const evidence = evidenceList.at(index);

      if (evidence === undefined) {
        continue;
      }
      const evidenceStart = evidence.node.getStart(sourceFile);
      const evidenceEnd = evidence.node.getEnd();
      const location = {
        'end': sourceCode.getLocFromIndex(evidenceEnd),
        'start': sourceCode.getLocFromIndex(evidenceStart)
      };

      // NO AUTOFIX HERE, DELIBERATELY. DO NOT REINSTATE ONE.
      //
      // A previous revision stripped the `readonly` modifier's text range. That is a
      // SEMANTIC TYPE CHANGE, and it is the dangerous kind: it typechecks. Removing
      // `readonly` does not break the build — it makes previously-rejected mutation
      // compile, silently discarding an immutability guarantee someone chose on
      // purpose. A fixer whose failure mode is "the code still builds but is now
      // mutable" is worse than one that breaks loudly, because nothing surfaces it.
      //
      // Standing policy: an autofixer may exist ONLY for a transformation that
      // cannot break the build or change program meaning. Deciding whether a
      // readonly output type should be relaxed, or the surrounding design changed
      // instead, is a judgement about intent. This rule reports; a person fixes.
      context.report({
        'data': { 'name': declaration.name.text },
        'loc': location,
        'messageId': 'noReadonly'
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Check 3: noAliasing — disallow naked type re-aliases and import aliases.
// ---------------------------------------------------------------------------

class PrimitiveDisplay {
  public static get(type: string): string {
    const result = PRIMITIVE_DISPLAY_NAMES.get(type) ?? type;

    return result;
  }
}

class AliasingAstHelpers {
  public static getTypeArgNames(typeArguments: unknown): readonly string[] | undefined {
    if (!Predicates.isRecord(typeArguments)) {
      return undefined;
    }
    const parameters = typeArguments.params;

    if (!Array.isArray(parameters)) {
      return undefined;
    }

    const names: string[] = [];
    const parameterCount = parameters.length;

    for (let i = 0; i < parameterCount; i += 1) {
      const arg: unknown = parameters.at(i);

      if (!Predicates.isRecord(arg) || AstHelpers.getNodeType(arg) !== 'TSTypeReference') {
        return undefined;
      }
      const typeName = arg.typeName;
      const name = AstHelpers.getIdentifierName(typeName);

      if (name === undefined) {
        return undefined;
      }
      names.push(name);
    }

    return names;
  }

  public static getTypeParamNames(typeParameters: unknown): readonly string[] {
    if (!Predicates.isRecord(typeParameters)) {
      return [];
    }
    const parameters = typeParameters.params;

    if (!Array.isArray(parameters)) {
      return [];
    }

    const names: string[] = [];
    const parameterCount = parameters.length;

    for (let i = 0; i < parameterCount; i += 1) {
      const param: unknown = parameters.at(i);
      const nameNode = Predicates.isRecord(param) ? param.name : undefined;
      const name = AstHelpers.getIdentifierName(nameNode);

      if (name === undefined) {
        return [];
      }
      names.push(name);
    }

    return names;
  }
}

class GenericAliasAnalysis {
  public static hasTypeParameters(node: unknown): boolean {
    if (!Predicates.isRecord(node)) {
      return false;
    }
    let wrapper: Record<string, unknown> | undefined;

    if (Array.isArray(node.params)) {
      wrapper = node;
    } else if (Predicates.isRecord(node.typeParameters)) {
      wrapper = node.typeParameters;
    } else if (Predicates.isRecord(node.typeArguments)) {
      wrapper = node.typeArguments;
    }

    if (!Predicates.isRecord(wrapper)) {
      return false;
    }
    const parameterList = wrapper.params;

    if (!Array.isArray(parameterList)) {
      return false;
    }

    const result = parameterList.length > 0;

    return result;
  }

  public static isGenericForwardingShim(
    leftNames: readonly string[],
    annotation: unknown
  ): { 'parameters': string; 'rhsName': string; } | undefined {
    if (!Predicates.isRecord(annotation) || AstHelpers.getNodeType(annotation) !== 'TSTypeReference') {
      return undefined;
    }
    const rightHandTypeArguments = annotation.typeArguments ?? annotation.typeParameters;
    const rightNames = AliasingAstHelpers.getTypeArgNames(rightHandTypeArguments);

    if (rightNames?.length !== leftNames.length) {
      return undefined;
    }

    const length = leftNames.length;

    for (let i = 0; i < length; i += 1) {
      if (leftNames.at(i) !== rightNames.at(i)) {
        return undefined;
      }
    }
    const typeName = annotation.typeName;
    const rhsName = AstHelpers.getIdentifierName(typeName);

    if (rhsName === undefined) {
      return undefined;
    }

    return {
      'parameters': leftNames.join(', '), 'rhsName': rhsName
    };
  }
}

class AliasingCheck {
  /**
   * Returns `true` when this check reported (or would report, ignoring severity) a
   * "delete this declaration, use the right-hand side directly" violation. The caller
   * uses this to suppress `mustEndType`'s "rename this declaration" advice on the same
   * node — renaming a declaration that should be deleted entirely is contradictory advice.
   */
  public static checkTypeAlias(context: Rule.RuleContext, node: Rule.Node): boolean {
    const rawNode: unknown = node;

    if (!Predicates.isRecord(rawNode)) {
      return false;
    }
    const name = AstHelpers.getIdentifierName(rawNode.id);

    if (name === undefined) {
      return false;
    }

    const leftParamNames = AliasingAstHelpers.getTypeParamNames(rawNode.typeParameters);

    if (leftParamNames.length > 0) {
      const forwarding = GenericAliasAnalysis.isGenericForwardingShim(leftParamNames, rawNode.typeAnnotation);

      if (forwarding !== undefined) {
        context.report({
          'data': {
            'name': name, 'parameters': forwarding.parameters, 'rhs': forwarding.rhsName
          },
          'messageId': 'genericForwardingAlias',
          'node': node
        });

        return true;
      }

      return false;
    }

    const annotation = rawNode.typeAnnotation;
    const annotationType = AstHelpers.getNodeType(annotation);

    if (annotationType === undefined) {
      return false;
    }

    if (PRIMITIVE_TYPES.has(annotationType)) {
      const display = PrimitiveDisplay.get(annotationType);

      context.report({
        'data': {
          'name': name, 'rhs': display
        },
        'messageId': 'primitiveTypeAlias',
        'node': node
      });

      return true;
    }

    if (annotationType === 'TSTypeReference') {
      if (GenericAliasAnalysis.hasTypeParameters(annotation)) {
        return false;
      }
      const typeName = Predicates.isRecord(annotation) ? annotation.typeName : undefined;
      const rhsName = AstHelpers.getIdentifierName(typeName);

      if (rhsName === undefined) {
        return false;
      }

      context.report({
        'data': {
          'name': name, 'rhs': rhsName
        },
        'messageId': 'nakedTypeAlias',
        'node': node
      });

      return true;
    }

    return false;
  }

  public static checkImportSpecifier(context: Rule.RuleContext, node: Rule.Node): void {
    const rawNode: unknown = node;

    if (!Predicates.isRecord(rawNode)) {
      return;
    }
    const importedName = AstHelpers.getIdentifierName(rawNode.imported);
    const localName = AstHelpers.getIdentifierName(rawNode.local);

    if (importedName === undefined || localName === undefined) {
      return;
    }

    if (importedName === localName) {
      return;
    }

    context.report({
      'data': {
        'imported': importedName, 'local': localName
      },
      'messageId': 'importAlias',
      'node': node
    });
  }
}

// ---------------------------------------------------------------------------
// Check 5: noPartialCanonicalType — canonical, codebase-owned types are
// consumed whole, never subsetted via `Partial`/`Pick`/`Omit` or an equivalent.
// ---------------------------------------------------------------------------

const SUBSETTING_UTILITY_NAMES = new Set(['Omit', 'Partial', 'Pick']);

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
  public static resolve(typeNode: Node, checker: TypeChecker): string | undefined {
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

class PartialCanonicalTypeCheck {
  public static report(context: Rule.RuleContext, node: Rule.Node, utility: string): void {
    context.report({
      'data': { 'utility': utility },
      'messageId': 'noPartialCanonicalType',
      'node': node
    });
  }

  public static onTSTypeReference(
    context: Rule.RuleContext, services: ParserServicesInterface, checker: TypeChecker, node: Rule.Node
  ): void {
    const rawNode: unknown = node;
    if (!Predicates.isRecord(rawNode)) { return; }
    const literalUtilityName = SubsettingUtilityMatch.getUtilityName(rawNode);

    if (literalUtilityName !== undefined) {
      const typeArgNode = SubsettingUtilityMatch.getFirstTypeArgument(rawNode);
      if (CanonicalTypeResolution.isCanonicalOwnedType(typeArgNode, services)) {
        PartialCanonicalTypeCheck.report(context, node, literalUtilityName);
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
      PartialCanonicalTypeCheck.report(context, node, customUtilityName);
    }
  }

  // A manual mapped type reproducing `Pick`/`Omit`'s effect with zero reference to any
  // Omit/Partial/Pick-named utility type at all — `{ [K in 'a']: FooType[K] }` — subsets a
  // canonical type's own property set exactly as `Pick<FooType, 'a'>` would, just spelled out
  // by hand. Flagged when the mapped type's key clause resolves to a literal, non-empty,
  // PROPER subset of the target canonical type's own property names.
  public static onMappedType(
    context: Rule.RuleContext, services: ParserServicesInterface, checker: TypeChecker, node: Rule.Node
  ): void {
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

    PartialCanonicalTypeCheck.report(context, node, 'a manually mapped Pick');
  }

  // Plain inline indexed-access subsetting — `{ a: FooType['a']; b: FooType['b']; }` — reaches
  // the same result as `Pick<FooType, 'a' | 'b'>` by spelling each retained property out
  // individually via indexed access into the same canonical type, with no utility type or
  // mapped-type syntax involved at all. Flagged only when EVERY member of the type literal is
  // such an indexed-access reference into the SAME canonical type, keeping this from
  // misfiring on a heterogeneous type literal that merely borrows one property's type.
  public static onTypeLiteral(
    context: Rule.RuleContext, services: ParserServicesInterface, checker: TypeChecker, node: Rule.Node
  ): void {
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

    PartialCanonicalTypeCheck.report(context, node, 'inline indexed-access Pick');
  }
}

// ---------------------------------------------------------------------------
// Rule
// ---------------------------------------------------------------------------

export const typeAliasInvariants: Rule.RuleModule = {
  'create': (context) => {
    const services = ContextHelpers.getServices(context);
    const classification = services === undefined
      ? undefined
      : TypeContractClassification.forProgram(services.program);

    const onTSTypeAliasDeclaration = (node: Rule.Node): void => {
      const typeScriptNode = services?.esTreeNodeToTSNodeMap.get(node);
      const declaration = typeScriptNode !== undefined && isTypeAliasDeclaration(typeScriptNode)
        ? typeScriptNode
        : undefined;
      const analysis = declaration === undefined || classification === undefined
        ? undefined
        : classification.analyzeAlias(declaration);

      if (analysis === undefined || declaration === undefined) {
        return;
      }

      if (analysis.classification === 'interfaceContract') {
        // Mixed union/intersection has no interface remedy; `no-mixed-callable-shapes` owns the
        // diagnostic, except when `any` is a direct constituent (D6) — reported here unconditionally.
        if (
          classification?.isTopLevelMixedCallableData(declaration.type) === true
          && !classification.topLevelMixIncludesAny(declaration.type)
        ) {
          return;
        }

        // A top-level union of independently-declared, pure-data contract interfaces (every
        // constituent readonly-evidenced, none callable) has no interface remedy either — the
        // same "TypeScript cannot express a union as one interface" limitation above, just
        // without a callable constituent to name it after. See
        // `isTopLevelUnionOfDataContractInterfaces`'s doc comment.
        if (classification?.isTopLevelUnionOfDataContractInterfaces(declaration.type) === true) {
          return;
        }

        const sourceFile = declaration.getSourceFile();
        const evidenceStart = analysis.evidence.getStart(sourceFile);
        const evidenceEnd = analysis.evidence.getEnd();

        context.report({
          'data': { 'name': declaration.name.text },
          'loc': {
            'end': context.sourceCode.getLocFromIndex(evidenceEnd),
            'start': context.sourceCode.getLocFromIndex(evidenceStart)
          },
          'messageId': 'aliasMustBeInterface'
        });

        return;
      }

      if (analysis.classification === 'pureDataInvalid') {
        if (AliasingCheck.checkTypeAlias(context, node)) {
          return;
        }

        const sourceFile = declaration.getSourceFile();
        const evidenceStart = analysis.evidence.getStart(sourceFile);
        const evidenceEnd = analysis.evidence.getEnd();

        context.report({
          'data': { 'name': declaration.name.text },
          'loc': {
            'end': context.sourceCode.getLocFromIndex(evidenceEnd),
            'start': context.sourceCode.getLocFromIndex(evidenceStart)
          },
          'messageId': 'derivedFromSchema'
        });

        return;
      }

      if (AliasingCheck.checkTypeAlias(context, node)) {
        return;
      }
      MustEndTypeCheck.run(context, node);
      ReadonlyCheck.checkAlias(context, declaration, analysis);
    };

    const onImportSpecifier = (node: Rule.Node): void => {
      AliasingCheck.checkImportSpecifier(context, node);
    };

    const checker: TypeChecker | undefined = services?.program === undefined ? undefined : services.program.getTypeChecker();

    const onTSTypeReference = (node: Rule.Node): void => {
      if (services === undefined || checker === undefined) { return; }
      PartialCanonicalTypeCheck.onTSTypeReference(context, services, checker, node);
    };

    const onTSMappedType = (node: Rule.Node): void => {
      if (services === undefined || checker === undefined) { return; }
      PartialCanonicalTypeCheck.onMappedType(context, services, checker, node);
    };

    const onTSTypeLiteral = (node: Rule.Node): void => {
      if (services === undefined || checker === undefined) { return; }
      PartialCanonicalTypeCheck.onTypeLiteral(context, services, checker, node);
    };

    return {
      'ImportSpecifier': onImportSpecifier,
      'TSMappedType': onTSMappedType,
      'TSTypeAliasDeclaration': onTSTypeAliasDeclaration,
      'TSTypeLiteral': onTSTypeLiteral,
      'TSTypeReference': onTSTypeReference
    };
  },
  'meta': {
    'docs': {
      'description':
        'Type aliases preserve canonical schema-derived data identity, use interfaces for contracts, avoid readonly output policy, and consume canonical types whole.'
    },
    'messages': {
      'aliasMustBeInterface': "Type alias '{{name}}' represents a contract or non-schema type computation. Declare the contract as an interface or redesign the type as schema-derived canonical data.",
      'derivedFromSchema': "Type alias '{{name}}' is not verified schema-derived pure data. Define canonical data with 'FromSchema<typeof Schema>' and compose only verified canonical data types.",
      'genericForwardingAlias': "Type alias '{{name}}' is a generic forwarding shim — '{{rhs}}<{{parameters}}>' renames '{{rhs}}' without transformation. Use '{{rhs}}' directly with the type arguments at each call site.",
      'importAlias': "Import alias '{{local}}' hides the canonical name '{{imported}}'. Use '{{imported}}' directly.",
      'mustEndType': "Exported type alias '{{name}}' must end in 'Type'. Rename to '{{name}}Type'.",
      'nakedTypeAlias': "Type alias '{{name}}' is a naked rename of '{{rhs}}'. Use '{{rhs}}' directly — do not create local synonyms for canonical types.",
      'noPartialCanonicalType': "'{{utility}}<...>' derives an implicit subset of a canonical type. A partial type masks what the real data shape is — consumers must always be aware of every property a canonical shape carries. Use the full type, or define an explicit, fully-spelled-out type/entity for the shape you actually need. There is no exemption for this rule.",
      'noReadonly': "Data type '{{name}}' bakes in `readonly` output policy. Consumers declare immutability at the use site.",
      'primitiveTypeAlias': "Type alias '{{name}}' wraps primitive type '{{rhs}}'. Use '{{rhs}}' directly."
    },
    'schema': [],
    'type': 'problem'
  }
};
