import type {
  FromSchema, JSONSchema
} from 'json-schema-to-ts';
import type * as ts from 'typescript';

import {
  type InterfaceDeclaration,
  isAsExpression,
  isCallExpression,
  isComputedPropertyName,
  isConstTypeReference,
  isExportDeclaration,
  isImportDeclaration,
  isIndexedAccessTypeNode,
  isInterfaceDeclaration,
  isObjectLiteralExpression,
  isPropertySignature,
  isQualifiedName,
  isSatisfiesExpression,
  isStringLiteral,
  isTypeAliasDeclaration,
  isTypeOperatorNode,
  isTypeParameterDeclaration,
  isTypeQueryNode,
  isTypeReferenceNode,
  isVariableDeclaration,
  type Node,
  NodeFlags,
  type Program,
  SignatureKind,
  type SourceFile,
  type Statement,
  type Symbol,
  SymbolFlags,
  SyntaxKind,
  type TypeAliasDeclaration,
  type TypeChecker,
  type TypeElement,
  TypeFlags,
  type TypeNode,
  type TypeQueryNode
} from 'typescript';

import { type AliasClassificationResultInterface } from './AliasClassificationResultInterface.js';
import { SCHEMA_DERIVING_TYPE_MODULES } from './constants/SchemaDerivationConstants.js';
import { type ContractEvidenceInterface } from './ContractEvidenceInterface.js';
import { type DataNodeResultInterface } from './DataNodeResultInterface.js';
import { type InterfaceClassificationResultInterface } from './InterfaceClassificationResultInterface.js';
import { MAXIMUM_RECURSION_DEPTH } from './MaximumRecursionDepth.js';

namespace SchemaDerivationMetadataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'valid': { 'type': 'boolean' } },
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

import type { TypeContractAliasResolution } from './TypeContractAliasResolution.js';
import type { TypeContractCallabilityClassification } from './TypeContractCallabilityClassification.js';
import type { TypeContractDataNodeClassification } from './TypeContractDataNodeClassification.js';
import type { TypeContractInterfaceContractResolution } from './TypeContractInterfaceContractResolution.js';
import type { TypeContractInterfaceTypeResolution } from './TypeContractInterfaceTypeResolution.js';

/**
 * Shared TS-program state and cross-concern type-contract primitives — symbol resolution,
 * schema-derived-application detection, and package-root provenance — consumed by the
 * data-node, callability, alias-resolution, and interface-resolution modules alike.
 * Constructed once per Program by {@link TypeContractClassification.forProgram} and wired to
 * the five resolver instances immediately after construction.
 */
export class TypeContractContext {
  public dataNode!: TypeContractDataNodeClassification;
  public callability!: TypeContractCallabilityClassification;
  public aliasResolution!: TypeContractAliasResolution;
  public interfaceContract!: TypeContractInterfaceContractResolution;
  public interfaceType!: TypeContractInterfaceTypeResolution;

  private readonly aliasCache = new WeakMap<TypeAliasDeclaration, AliasClassificationResultInterface>();
  private readonly interfaceCache = new WeakMap<InterfaceDeclaration, InterfaceClassificationResultInterface>();
  private readonly canonicalFromSchemaSymbols = new Set<Symbol>();
  private canonicalFromSchemaSymbolsCollected = false;
  public readonly checker: TypeChecker;
  public readonly program: Program;

  public constructor(program: Program) {
    this.program = program;
    this.checker = program.getTypeChecker();
  }

  public analyzeAlias(declaration: TypeAliasDeclaration): AliasClassificationResultInterface {
    const cached = this.aliasCache.get(declaration);

    if (cached !== undefined) {
      return cached;
    }

    const result = this.aliasResolution.classifyAlias(declaration, new Set(), 0);

    this.aliasCache.set(declaration, result);

    return result;
  }

  public analyzeInterface(declaration: InterfaceDeclaration): InterfaceClassificationResultInterface {
    const cached = this.interfaceCache.get(declaration);

    if (cached !== undefined) {
      return cached;
    }

    const result = this.interfaceContract.classifyInterface(declaration, new Set(), 0);

    this.interfaceCache.set(declaration, result);

    return result;
  }

  public containsTypeParameterReference(node: Node): boolean {
    if (isTypeReferenceNode(node)) {
      const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));

      if (symbol !== undefined && (symbol.flags & SymbolFlags.TypeParameter) !== 0) {
        return true;
      }
    }

    let containsTypeParameter = false;

    node.forEachChild((child) => {
      if (!containsTypeParameter && this.containsTypeParameterReference(child)) {
        containsTypeParameter = true;
      }
    });

    return containsTypeParameter;
  }

  public aliasDeclarationForSymbol(symbol: Symbol | undefined): TypeAliasDeclaration | undefined {
    const resolved = this.resolveSymbol(symbol);

    if (resolved === undefined) {
      return undefined;
    }

    const declarations = resolved.getDeclarations() ?? [];
    const length = declarations.length;

    for (let index = 0; index < length; index++) {
      const declaration = declarations.at(index);

      if (declaration !== undefined && isTypeAliasDeclaration(declaration)) {
        return declaration;
      }
    }

    return undefined;
  }

  public interfaceDeclarationForSymbol(symbol: Symbol | undefined): InterfaceDeclaration | undefined {
    if (symbol === undefined) {
      return undefined;
    }

    const result = symbol.getDeclarations()?.find(isInterfaceDeclaration);

    return result;
  }

  private findResolvedTypeContract(
    type: ts.Type,
    evidenceNode: Node,
    seen: Set<ts.Type>,
    depth: number
  ): ContractEvidenceInterface | undefined {
    if (seen.has(type)) {
      return undefined;
    }
    seen.add(type);
    if (depth > MAXIMUM_RECURSION_DEPTH) {
      return {
        'node': evidenceNode, 'reason': 'nonJson'
      };
    }

    const signature = this.resolvedTypeContractForSignature(type, evidenceNode);

    if (signature !== undefined) {
      return signature;
    }

    if (this.isResolvedClassInstanceType(type)) {
      return {
        'node': evidenceNode, 'reason': 'classInstance'
      };
    }

    const primitive = this.resolvedTypeContractForPrimitiveFlags(type.flags, evidenceNode);

    if (primitive !== undefined) {
      return primitive;
    }

    if (type.isUnion() || type.isIntersection()) {
      const result = this.resolvedTypeContractInConstituents(type.types, evidenceNode, seen, depth);

      return result;
    }

    if ((type.flags & TypeFlags.Object) === 0) {
      return undefined;
    }

    const result = this.resolvedTypeContractForObjectType(type, evidenceNode, seen, depth);

    return result;
  }

  private isResolvedClassInstanceType(type: ts.Type): boolean {
    const typeSymbol = this.resolveSymbol(type.aliasSymbol ?? type.getSymbol());
    const result = typeSymbol !== undefined && (typeSymbol.flags & SymbolFlags.Class) !== 0;

    return result;
  }

  private resolvedTypeContractForSignature(type: ts.Type, evidenceNode: Node): ContractEvidenceInterface | undefined {
    if (type.getCallSignatures().length > 0) {
      return {
        'node': evidenceNode, 'reason': 'callable'
      };
    }
    if (type.getConstructSignatures().length > 0) {
      return {
        'node': evidenceNode, 'reason': 'constructor'
      };
    }

    return undefined;
  }

  private resolvedTypeContractForPrimitiveFlags(flags: TypeFlags, evidenceNode: Node): ContractEvidenceInterface | undefined {
    if ((flags & TypeFlags.Any) !== 0) {
      return {
        'node': evidenceNode, 'reason': 'any'
      };
    }
    if ((flags & TypeFlags.Unknown) !== 0) {
      return {
        'node': evidenceNode, 'reason': 'unknown'
      };
    }
    if ((flags & TypeFlags.ESSymbol) !== 0 || (flags & TypeFlags.UniqueESSymbol) !== 0) {
      return {
        'node': evidenceNode, 'reason': 'symbol'
      };
    }
    if ((flags & TypeFlags.BigIntLike) !== 0) {
      return {
        'node': evidenceNode, 'reason': 'bigint'
      };
    }
    if ((flags & TypeFlags.Never) !== 0) {
      return {
        'node': evidenceNode, 'reason': 'never'
      };
    }
    if ((flags & TypeFlags.Void) !== 0 || (flags & TypeFlags.Undefined) !== 0) {
      return {
        'node': evidenceNode, 'reason': 'undefined'
      };
    }

    return undefined;
  }

  private resolvedTypeContractInConstituents(
    constituents: readonly ts.Type[],
    evidenceNode: Node,
    seen: Set<ts.Type>,
    depth: number
  ): ContractEvidenceInterface | undefined {
    const length = constituents.length;

    for (let index = 0; index < length; index++) {
      const constituent = constituents.at(index);

      if (constituent === undefined) {
        continue;
      }
      const evidence = this.findResolvedTypeContract(constituent, evidenceNode, seen, depth + 1);

      if (evidence !== undefined) {
        return evidence;
      }
    }

    return undefined;
  }

  // An indexed type carries its data in the element type. Its own members are
  // prototype methods supplied by the standard library — `push`, `map`, `filter`
  // and friends all own call signatures — so enumerating them classifies every
  // array as callable. The element type is the whole of the contract here.
  private resolvedTypeContractForObjectType(
    type: ts.Type,
    evidenceNode: Node,
    seen: Set<ts.Type>,
    depth: number
  ): ContractEvidenceInterface | undefined {
    const elementType = type.getNumberIndexType();

    if (elementType !== undefined) {
      const result = this.findResolvedTypeContract(elementType, evidenceNode, seen, depth + 1);

      return result;
    }

    const result = this.resolvedTypeContractInProperties(type.getProperties(), seen, depth);

    return result;
  }

  private resolvedTypeContractInProperties(
    properties: readonly ts.Symbol[],
    seen: Set<ts.Type>,
    depth: number
  ): ContractEvidenceInterface | undefined {
    const propertyLength = properties.length;

    for (let index = 0; index < propertyLength; index++) {
      const property = properties.at(index);

      if (property === undefined) {
        continue;
      }
      const declaration = property.valueDeclaration ?? (property.getDeclarations() ?? []).at(0);

      if (declaration === undefined) {
        continue;
      }
      const propertyType = this.checker.getTypeOfSymbolAtLocation(property, declaration);
      const evidence = this.findResolvedTypeContract(propertyType, declaration, seen, depth + 1);

      if (evidence !== undefined) {
        return evidence;
      }
    }

    return undefined;
  }

  public isFromSchemaNamedReference(node: TypeNode): boolean {
    if (!isTypeReferenceNode(node)) {
      return false;
    }
    const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));

    const result = symbol?.getName() === 'FromSchema';

    return result;
  }

  public isIntrinsic(node: TypeNode, name: 'Array' | 'Function' | 'Readonly' | 'ReadonlyArray'): boolean {
    if (!isTypeReferenceNode(node)) {
      return false;
    }
    const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));

    if (symbol?.getName() !== name) {
      return false;
    }

    const declarations = symbol.getDeclarations() ?? [];

    const result = declarations.some((declaration) => {
      const sourceFile = declaration.getSourceFile();
      const filename = sourceFile.fileName.split('\\').join('/');

      const isLibDeclaration = sourceFile.isDeclarationFile && filename.includes('/lib.') && filename.endsWith('.d.ts');

      return isLibDeclaration;
    });

    return result;
  }

  public isRuntimeType(node: TypeNode): boolean {
    if (!isTypeReferenceNode(node)) {
      return false;
    }
    const symbol = this.resolveSymbol(this.checker.getSymbolAtLocation(node.typeName));

    if (symbol?.valueDeclaration === undefined || this.isIntrinsic(node, 'Array')) {
      return false;
    }

    const declarations = symbol.getDeclarations() ?? [];

    if (!declarations.some(isInterfaceDeclaration)) {
      return false;
    }

    const valueType = this.checker.getTypeOfSymbolAtLocation(symbol, node);

    const result = this.checker.getSignaturesOfType(valueType, SignatureKind.Construct).length > 0;

    return result;
  }

  public isUniqueSymbol(node: TypeNode): boolean {
    const result = isTypeOperatorNode(node)
      && node.operator === SyntaxKind.UniqueKeyword
      && node.type.kind === SyntaxKind.SymbolKeyword;

    return result;
  }

  /**
   * A member keyed by a unique symbol brands its declaration nominally, whatever the member's own
   * type. `{ [Marker]: T }` and `{ readonly brand?: unique symbol }` mark the same thing from
   * opposite sides — one puts the symbol in the key, the other in the value — and neither is
   * expressible in JSON.
   */
  private hasUniqueSymbolKey(member: TypeElement): boolean {
    const name = member.name;

    if (name === undefined || !isComputedPropertyName(name)) {
      return false;
    }

    const keyType = this.checker.getTypeAtLocation(name.expression);

    const result = (keyType.flags & TypeFlags.UniqueESSymbol) !== 0;

    return result;
  }

  public isBrandMember(member: TypeElement): boolean {
    if (this.hasUniqueSymbolKey(member)) {
      return true;
    }
    if (!isPropertySignature(member) || member.type === undefined) {
      return false;
    }

    const result = this.isUniqueSymbol(member.type);

    return result;
  }

  public classifySchemaDerivedApplication(node: TypeNode): DataNodeResultInterface {
    const resolved = this.checker.getTypeFromTypeNode(node);
    const contract = this.findResolvedTypeContract(resolved, node, new Set(), 0);

    if (contract !== undefined) {
      return {
        'canonicalRoot': false, 'evidence': node, 'reason': contract.reason, 'valid': false
      };
    }

    return {
      'canonicalRoot': true, 'evidence': node, 'reason': 'fromSchema', 'valid': true
    };
  }

  public isSchemaDerivedApplication(node: TypeNode): boolean {
    const shape = this.schemaDerivationShape(node);

    const result = shape === undefined ? false : this.isSchemaDerivedShape(shape);

    return result;
  }

  /**
   * An interface's `extends FromSchema<typeof Schema>` heritage clause derives the same canonical
   * pure-data shape a `type X = FromSchema<typeof Schema>` alias does — the interface spelling of
   * the identical pattern. Heritage-clause types are `ExpressionWithTypeArguments`, not
   * `TypeNode`s, so they need their own shape resolution rather than {@link schemaDerivationShape}.
   */
  public isSchemaDerivedShape(shape: SchemaDerivationShapeInterface): boolean {
    const valueSymbol = this.resolveEntityNameSymbol(shape.valueQuery.exprName);

    if (valueSymbol === undefined) {
      return false;
    }

    const authoring = this.evaluateSchemaValueAuthoring(valueSymbol);

    if (!authoring.valid) {
      return false;
    }

    if (shape.derivingNameNode === undefined) {
      return true;
    }

    const result = this.isSchemaDerivingFunction(shape.derivingNameNode, authoring.builderCallee);

    return result;
  }

  private schemaDerivationShape(node: TypeNode): SchemaDerivationShapeInterface | undefined {
    if (isTypeReferenceNode(node)) {
      const typeArguments = node.typeArguments;

      if (typeArguments === undefined) {
        return undefined;
      }
      const valueQuery = typeArguments.find(isTypeQueryNode);

      if (valueQuery === undefined) {
        return undefined;
      }

      return {
        'derivingNameNode': node.typeName, 'valueQuery': valueQuery
      };
    }

    if (isTypeQueryNode(node) && isQualifiedName(node.exprName)) {
      return {
        'derivingNameNode': undefined, 'valueQuery': node
      };
    }

    if (isIndexedAccessTypeNode(node) && isTypeQueryNode(node.objectType)) {
      return {
        'derivingNameNode': undefined, 'valueQuery': node.objectType
      };
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

    if (declarations.some(isVariableDeclaration)) {
      return resolved;
    }
    if (isQualifiedName(name)) {
      const result = this.resolveEntityNameSymbol(name.left);

      return result;
    }

    return resolved;
  }

  private evaluateSchemaValueAuthoring(valueSymbol: Symbol): SchemaValueAuthoringInterface {
    const declarations = valueSymbol.getDeclarations() ?? [];
    const declaration = declarations.find(isVariableDeclaration);

    if (declaration === undefined) {
      return {
        'builderCallee': undefined, 'valid': false
      };
    }
    if ((declaration.parent.flags & NodeFlags.Const) === 0) {
      return {
        'builderCallee': undefined, 'valid': false
      };
    }
    if (declaration.type !== undefined) {
      return {
        'builderCallee': undefined, 'valid': false
      };
    }

    const initializer = declaration.initializer;

    if (initializer === undefined) {
      return {
        'builderCallee': undefined, 'valid': false
      };
    }

    if (this.isConstAssertedObjectLiteral(initializer)) {
      return {
        'builderCallee': undefined, 'valid': true
      };
    }

    if (isCallExpression(initializer)) {
      const calleeSymbol = this.resolveSymbol(this.checker.getSymbolAtLocation(initializer.expression));

      return {
        'builderCallee': calleeSymbol, 'valid': true
      };
    }

    return {
      'builderCallee': undefined, 'valid': false
    };
  }

  private isConstAssertedObjectLiteral(node: Node): boolean {
    const target = isSatisfiesExpression(node) ? node.expression : node;

    const result = isAsExpression(target) && isConstTypeReference(target.type) && isObjectLiteralExpression(target.expression);

    return result;
  }

  public isCanonicalFromSchemaReference(derivingNameNode: Node): boolean {
    const resolvedSymbol = this.resolveSymbol(this.checker.getSymbolAtLocation(derivingNameNode));

    if (resolvedSymbol === undefined || !SCHEMA_DERIVING_TYPE_MODULES.has(resolvedSymbol.getName())) {
      return false;
    }

    this.collectCanonicalFromSchemaSymbols();

    const result = this.canonicalFromSchemaSymbols.has(resolvedSymbol);

    return result;
  }

  private collectCanonicalFromSchemaSymbols(): void {
    if (this.canonicalFromSchemaSymbolsCollected) {
      return;
    }

    this.canonicalFromSchemaSymbolsCollected = true;
    const sourceFiles = this.program.getSourceFiles();
    const sourceFileCount = sourceFiles.length;

    for (let sourceIndex = 0; sourceIndex < sourceFileCount; sourceIndex += 1) {
      this.collectCanonicalFromSchemaSymbolsInFile(sourceFiles[sourceIndex]!);
    }
  }

  private collectCanonicalFromSchemaSymbolsInFile(sourceFile: SourceFile): void {
    const statements = sourceFile.statements;
    const statementCount = statements.length;

    for (let statementIndex = 0; statementIndex < statementCount; statementIndex += 1) {
      this.collectCanonicalFromSchemaSymbolFromStatement(statements[statementIndex]!);
    }
  }

  private collectCanonicalFromSchemaSymbolFromStatement(statement: Statement): void {
    if (!isImportDeclaration(statement) && !isExportDeclaration(statement)) {
      return;
    }

    const moduleSpecifier = statement.moduleSpecifier;

    if (moduleSpecifier === undefined || !isStringLiteral(moduleSpecifier)) {
      return;
    }

    const derivingTypeName = TypeContractContext.derivingTypeNameForModule(moduleSpecifier.text);

    if (derivingTypeName === undefined) {
      return;
    }

    const moduleSymbol = this.checker.getSymbolAtLocation(moduleSpecifier);

    if (moduleSymbol === undefined) {
      return;
    }

    const exportedSymbols = this.checker.getExportsOfModule(moduleSymbol);
    const exportedDerivingType = exportedSymbols.find((symbol) => {
      const result = symbol.getName() === derivingTypeName;

      return result;
    });
    const resolvedSymbol = this.resolveSymbol(exportedDerivingType);

    if (resolvedSymbol !== undefined) {
      this.canonicalFromSchemaSymbols.add(resolvedSymbol);
    }
  }

  private static derivingTypeNameForModule(moduleSpecifierText: string): string | undefined {
    for (const [derivingTypeName, moduleSpecifier] of SCHEMA_DERIVING_TYPE_MODULES) {
      if (moduleSpecifier === moduleSpecifierText) {
        return derivingTypeName;
      }
    }

    return undefined;
  }

  private isSchemaDerivingFunction(derivingNameNode: Node, builderCallee: Symbol | undefined): boolean {
    const derivingSymbol = this.resolveSymbol(this.checker.getSymbolAtLocation(derivingNameNode));

    if (derivingSymbol === undefined) {
      return false;
    }

    if (SCHEMA_DERIVING_TYPE_MODULES.has(derivingSymbol.getName())) {
      const result = this.isCanonicalFromSchemaReference(derivingNameNode);

      return result;
    }

    if (derivingSymbol.getJsDocTags().some((tag) => {
      const result = tag.name === 'schemaDerivation';

      return result;
    })) {
      return true;
    }
    if (builderCallee !== undefined && this.sharePackageRoot(derivingSymbol, builderCallee)) {
      return true;
    }

    const declarations = derivingSymbol.getDeclarations() ?? [];

    const result = declarations.some((declaration) => {
      const isGenericOrDeclarationFile = (isTypeAliasDeclaration(declaration) && (declaration.typeParameters?.length ?? 0) > 0)
      || declaration.getSourceFile().isDeclarationFile;

      return isGenericOrDeclarationFile;
    });

    return result;
  }

  private sharePackageRoot(first: Symbol, second: Symbol): boolean {
    const firstRoot = this.packageRootForSymbol(first);
    const secondRoot = this.packageRootForSymbol(second);

    const result = firstRoot !== undefined && firstRoot === secondRoot;

    return result;
  }

  private packageRootForSymbol(symbol: Symbol): string | undefined {
    const declarations = symbol.getDeclarations() ?? [];
    const declaration = declarations.at(0);

    if (declaration === undefined) {
      return undefined;
    }

    const result = this.packageRootForPath(declaration.getSourceFile().fileName.split('\\').join('/'));

    return result;
  }

  private packageRootForPath(filename: string): string {
    const segments = filename.split('/node_modules/');

    if (segments.length > 1) {
      const afterNodeModules = segments.at(-1) ?? filename;
      const parts = afterNodeModules.split('/');
      const first = parts.at(0);
      const second = parts.at(1);

      if (first !== undefined && first.startsWith('@') && second !== undefined) {
        return `${first}/${second}`;
      }

      const result = first ?? afterNodeModules;

      return result;
    }

    const lastSlash = filename.lastIndexOf('/');

    const result = lastSlash === -1 ? filename : filename.slice(0, lastSlash);

    return result;
  }

  public resolveSymbol(symbol: Symbol | undefined): Symbol | undefined {
    if (symbol === undefined) {
      return undefined;
    }
    if ((symbol.flags & SymbolFlags.Alias) === 0) {
      return symbol;
    }

    const result = this.checker.getAliasedSymbol(symbol);

    return result;
  }

  /**
   * A type-parameter symbol's own declaration(s) carry its `extends` constraint, if any —
   * `<T extends () => void>` declares the constraint on `T`'s `TypeParameterDeclaration`, not on
   * any reference to `T`. Declaration merging aside, a type parameter has exactly one declaring
   * site, so the first constraint found wins.
   */
  public typeParameterConstraintNode(symbol: Symbol): TypeNode | undefined {
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
}
