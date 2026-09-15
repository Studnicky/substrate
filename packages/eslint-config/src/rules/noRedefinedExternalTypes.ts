import type { Rule } from 'eslint';

import {
  createSourceFile,
  getCombinedModifierFlags,
  type InterfaceDeclaration,
  isArrayTypeNode,
  isExportDeclaration,
  isIdentifier,
  isInterfaceDeclaration,
  isLiteralTypeNode,
  isMethodSignature,
  isNamedExports,
  isNumericLiteral,
  isParenthesizedTypeNode,
  isPropertySignature,
  isStringLiteral,
  isTypeAliasDeclaration,
  isTypeLiteralNode,
  isUnionTypeNode,
  ModifierFlags,
  type NamedExports,
  type Node,
  type Program,
  ScriptTarget,
  type SourceFile,
  type Symbol,
  SymbolFlags,
  SyntaxKind,
  type Type,
  type TypeAliasDeclaration,
  type TypeChecker,
  TypeFlags,
  type TypeNode
} from 'typescript';

import type { ProjectHostInterface } from '../interfaces/ProjectHostInterface.js';

import { ProjectHostRegistry } from '../runtime/ProjectHostRegistry.js';
import { AstHelpers } from './shared/astHelpers.js';
import { PackageBoundary } from './shared/PackageBoundary.js';
import { TypeContractClassification } from './shared/TypeContractClassification.js';


interface ExternalTypeCandidateInterface {
  readonly 'dependencyName': string;
  readonly 'exportName': string;
  readonly 'hasRequiredMember': boolean;
  readonly 'shape': string;
}

interface ResolvedDependencyInterface {
  readonly 'dependencyName': string;
  readonly 'filename': string;
  readonly 'packageRoot': string;
}

interface TypeCatalogInterface {
  readonly 'candidates': readonly ExternalTypeCandidateInterface[];
}

class DependencyExportResolver {
  public static resolve(
    filename: string,
    host: ProjectHostInterface
  ): readonly ResolvedDependencyInterface[] {
    const dependencyNames = PackageBoundary.directDependencyNamesForFilename(filename, host);
    const dependencies: ResolvedDependencyInterface[] = [];
    const resolvedFilenames = new Set<string>();
    const dependencyCount = dependencyNames.length;

    for (let index = 0; index < dependencyCount; index += 1) {
      const dependencyName = dependencyNames[index]!;
      const moduleSpecifiers = DependencyExportResolver.publicModuleSpecifiers(
        dependencyName,
        filename,
        host
      );
      const specifierCount = moduleSpecifiers.length;

      for (let specifierIndex = 0; specifierIndex < specifierCount; specifierIndex += 1) {
        const resolution = host.resolveModule(moduleSpecifiers[specifierIndex]!, filename);

        if (resolution === undefined || !DependencyExportResolver.isTypeBearing(resolution)) {
          continue;
        }
        const packageRoot = PackageBoundary.rootForFilename(resolution, host);

        if (packageRoot === undefined || resolvedFilenames.has(resolution)) {
          continue;
        }

        resolvedFilenames.add(resolution);
        dependencies.push({
          'dependencyName': dependencyName,
          'filename': resolution,
          'packageRoot': packageRoot
        });
      }
    }

    return dependencies;
  }

  private static publicModuleSpecifiers(
    dependencyName: string,
    importerFilename: string,
    host: ProjectHostInterface
  ): readonly string[] {
    const manifestFilename = host.resolvePackageManifest?.(dependencyName, importerFilename);

    if (manifestFilename === undefined) {
      return [dependencyName];
    }
    const manifestText = host.readTextFile(manifestFilename);

    if (manifestText === undefined) {
      return [];
    }
    const exportSubpaths = DependencyExportResolver.exportSubpaths(manifestText);
    const result = exportSubpaths.map((subpath) => {
      const moduleSpecifier = subpath === '.' ? dependencyName : `${dependencyName}/${subpath.slice(2)}`;

      return moduleSpecifier;
    });

    return result;
  }

  private static exportSubpaths(manifestText: string): readonly string[] {
    let manifest: unknown;
    try {
      manifest = JSON.parse(manifestText);
    } catch {
      return [];
    }

    if (!DependencyExportResolver.isRecord(manifest)) {
      return [];
    }
    const exportsValue: unknown = Reflect.get(manifest, 'exports');

    if (exportsValue === undefined || typeof exportsValue === 'string') {
      return ['.'];
    }
    if (!DependencyExportResolver.isRecord(exportsValue)) {
      return [];
    }
    const keys = Object.keys(exportsValue);
    const hasSubpathMap = keys.some((key) => {
      const result = key === '.' || key.startsWith('./');

      return result;
    });

    if (!hasSubpathMap) {
      return ['.'];
    }
    const result = keys.filter((key) => {
      const isPublicExactSubpath = (key === '.' || key.startsWith('./')) && !key.includes('*');

      return isPublicExactSubpath;
    });

    return result;
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    const result = value !== null && typeof value === 'object' && !Array.isArray(value);

    return result;
  }

  private static isTypeBearing(filename: string): boolean {
    const result = filename.endsWith('.d.cts')
      || filename.endsWith('.d.mts')
      || filename.endsWith('.d.ts')
      || filename.endsWith('.cts')
      || filename.endsWith('.mts')
      || filename.endsWith('.tsx')
      || filename.endsWith('.ts');

    return result;
  }
}

class TypeDeclarationShape {
  private static readonly primitiveShapes = new Map<SyntaxKind, string>([
    [SyntaxKind.BigIntKeyword, 'bigint'],
    [SyntaxKind.BooleanKeyword, 'boolean'],
    [SyntaxKind.NeverKeyword, 'never'],
    [SyntaxKind.NumberKeyword, 'number'],
    [SyntaxKind.ObjectKeyword, 'object'],
    [SyntaxKind.StringKeyword, 'string'],
    [SyntaxKind.SymbolKeyword, 'symbol'],
    [SyntaxKind.UndefinedKeyword, 'undefined'],
    [SyntaxKind.UnknownKeyword, 'unknown'],
    [SyntaxKind.VoidKeyword, 'void']
  ]);

  public static membersFor(declaration: InterfaceDeclaration | TypeAliasDeclaration): readonly Node[] | undefined {
    if (isInterfaceDeclaration(declaration)) {
      const result = declaration.members;

      return result;
    }

    if (isTypeLiteralNode(declaration.type)) {
      const result = declaration.type.members;

      return result;
    }

    return undefined;
  }

  public static hasRequiredMember(declaration: InterfaceDeclaration | TypeAliasDeclaration): boolean {
    const members = TypeDeclarationShape.membersFor(declaration);

    if (members === undefined) {
      return true;
    }

    const result = members.some((member) => {
      const isRequired = isPropertySignature(member) && member.questionToken === undefined;

      return isRequired;
    });

    return result;
  }

  public static forDeclaration(declaration: InterfaceDeclaration | TypeAliasDeclaration): string | undefined {
    if (declaration.typeParameters !== undefined && declaration.typeParameters.length > 0) {
      return undefined;
    }
    if (isInterfaceDeclaration(declaration)) {
      if (declaration.heritageClauses !== undefined && declaration.heritageClauses.length > 0) {
        return undefined;
      }

      const result = TypeDeclarationShape.objectMembers(declaration.members);

      return result;
    }

    const result = TypeDeclarationShape.forType(declaration.type);

    return result;
  }

  private static forType(type: TypeNode): string | undefined {
    if (isParenthesizedTypeNode(type)) {
      const result = TypeDeclarationShape.forType(type.type);

      return result;
    }
    if (isTypeLiteralNode(type)) {
      const result = TypeDeclarationShape.objectMembers(type.members);

      return result;
    }
    if (isArrayTypeNode(type)) {
      const elementShape = TypeDeclarationShape.forType(type.elementType);

      if (elementShape === undefined) {
        return undefined;
      }

      return `array:${  elementShape}`;
    }
    if (isUnionTypeNode(type)) {
      const memberShapes = TypeDeclarationShape.typeShapes(type.types);

      if (memberShapes === undefined) {
        return undefined;
      }

      return `union:${  memberShapes.toSorted().join('|')}`;
    }
    if (isLiteralTypeNode(type)) {
      const literal = type.literal;

      if (!isStringLiteral(literal) && !isNumericLiteral(literal) && literal.kind !== SyntaxKind.FalseKeyword && literal.kind !== SyntaxKind.TrueKeyword && literal.kind !== SyntaxKind.NullKeyword) {
        return undefined;
      }

      return `literal:${  literal.getText()}`;
    }

    const result = TypeDeclarationShape.primitiveShapes.get(type.kind);

    return result;
  }

  private static objectMembers(members: readonly Node[]): string | undefined {
    if (members.length === 0) {
      return undefined;
    }

    const memberShapes: string[] = [];

    for (let index = 0; index < members.length; index += 1) {
      const member = members[index]!;

      if (!isPropertySignature(member) || member.type === undefined) {
        return undefined;
      }
      const name = TypeDeclarationShape.propertyName(member.name);
      const type = TypeDeclarationShape.forType(member.type);

      if (name === undefined || type === undefined) {
        return undefined;
      }
      const readOnly = (getCombinedModifierFlags(member) & ModifierFlags.Readonly) !== 0 ? 'readonly' : 'mutable';
      const optional = member.questionToken === undefined ? 'required' : 'optional';

      memberShapes.push(`property:${  readOnly  }:${  optional  }:${  name  }:${  type}`);
    }

    return `object:${  memberShapes.toSorted().join('|')}`;
  }

  private static propertyName(name: Node): string | undefined {
    if (isIdentifier(name)) {
      return `identifier:${  name.text}`;
    }
    if (isStringLiteral(name)) {
      return `string:${  name.text}`;
    }
    if (isNumericLiteral(name)) {
      return `number:${  name.text}`;
    }

    return undefined;
  }

  private static typeShapes(types: readonly TypeNode[]): readonly string[] | undefined {
    const shapes: string[] = [];

    for (let index = 0; index < types.length; index += 1) {
      const shape = TypeDeclarationShape.forType(types[index]!);

      if (shape === undefined) {
        return undefined;
      }

      shapes.push(shape);
    }

    return shapes;
  }
}

class EstreeTypeDeclarationShape {
  private static readonly primitiveShapes = new Map<string, string>([
    ['TSBigIntKeyword', 'bigint'],
    ['TSBooleanKeyword', 'boolean'],
    ['TSNeverKeyword', 'never'],
    ['TSNumberKeyword', 'number'],
    ['TSObjectKeyword', 'object'],
    ['TSStringKeyword', 'string'],
    ['TSSymbolKeyword', 'symbol'],
    ['TSUndefinedKeyword', 'undefined'],
    ['TSUnknownKeyword', 'unknown'],
    ['TSVoidKeyword', 'void']
  ]);

  public static forDeclaration(node: Rule.Node): string | undefined {
    const typeParameters = AstHelpers.getNodeProperty(node, 'typeParameters');
    const parameters = AstHelpers.getNodeProperty(typeParameters, 'params');

    if (Array.isArray(parameters) && parameters.length > 0) {
      return undefined;
    }
    const nodeType = AstHelpers.getNodeType(node);

    if (nodeType === 'TSInterfaceDeclaration') {
      const extendsNodes = AstHelpers.getNodeProperty(node, 'extends');
      const body = AstHelpers.getNodeProperty(node, 'body');

      if (!Array.isArray(extendsNodes) || extendsNodes.length !== 0 || AstHelpers.getNodeType(body) !== 'TSInterfaceBody') {
        return undefined;
      }

      const result = EstreeTypeDeclarationShape.objectMembers(AstHelpers.getNodeProperty(body, 'body'));

      return result;
    }
    if (nodeType === 'TSTypeAliasDeclaration') {
      const result = EstreeTypeDeclarationShape.forType(AstHelpers.getNodeProperty(node, 'typeAnnotation'));

      return result;
    }

    return undefined;
  }

  public static nameForDeclaration(node: Rule.Node): string | undefined {
    const identifier = AstHelpers.getNodeProperty(node, 'id');
    const result = AstHelpers.getIdentifierName(identifier);

    return result;
  }

  public static isExported(node: Rule.Node): boolean {
    const parent = AstHelpers.getNodeProperty(node, 'parent');
    const parentType = AstHelpers.getNodeType(parent);
    const result = parentType === 'ExportDefaultDeclaration' || parentType === 'ExportNamedDeclaration';

    return result;
  }

  private static forType(node: unknown): string | undefined {
    const nodeType = AstHelpers.getNodeType(node);

    if (nodeType === 'TSParenthesizedType') {
      const result = EstreeTypeDeclarationShape.forType(AstHelpers.getNodeProperty(node, 'typeAnnotation'));

      return result;
    }
    if (nodeType === 'TSTypeLiteral') {
      const result = EstreeTypeDeclarationShape.objectMembers(AstHelpers.getNodeProperty(node, 'members'));

      return result;
    }
    if (nodeType === 'TSArrayType') {
      const elementShape = EstreeTypeDeclarationShape.forType(AstHelpers.getNodeProperty(node, 'elementType'));

      if (elementShape === undefined) {
        return undefined;
      }

      return `array:${  elementShape}`;
    }
    if (nodeType === 'TSUnionType') {
      const memberShapes = EstreeTypeDeclarationShape.typeShapes(AstHelpers.getNodeProperty(node, 'types'));

      if (memberShapes === undefined) {
        return undefined;
      }

      return `union:${  memberShapes.toSorted().join('|')}`;
    }
    if (nodeType === 'TSLiteralType') {
      const literal = AstHelpers.getNodeProperty(node, 'literal');
      const raw = AstHelpers.getNodeProperty(literal, 'raw');

      if (typeof raw !== 'string') {
        return undefined;
      }

      return `literal:${  raw}`;
    }

    const result = nodeType === undefined ? undefined : EstreeTypeDeclarationShape.primitiveShapes.get(nodeType);

    return result;
  }

  private static objectMembers(members: unknown): string | undefined {
    if (!Array.isArray(members) || members.length === 0) {
      return undefined;
    }

    const memberShapes: string[] = [];

    for (let index = 0; index < members.length; index += 1) {
      const member: unknown = Reflect.get(members, index);

      if (AstHelpers.getNodeType(member) !== 'TSPropertySignature') {
        return undefined;
      }
      const name = EstreeTypeDeclarationShape.propertyName(AstHelpers.getNodeProperty(member, 'key'));
      const annotation = AstHelpers.getNodeProperty(member, 'typeAnnotation');
      const type = EstreeTypeDeclarationShape.forType(AstHelpers.getNodeProperty(annotation, 'typeAnnotation'));

      if (name === undefined || type === undefined) {
        return undefined;
      }
      const readOnly = AstHelpers.getNodeProperty(member, 'readonly') === true ? 'readonly' : 'mutable';
      const optional = AstHelpers.getNodeProperty(member, 'optional') === true ? 'optional' : 'required';

      memberShapes.push(`property:${  readOnly  }:${  optional  }:${  name  }:${  type}`);
    }

    return `object:${  memberShapes.toSorted().join('|')}`;
  }

  private static propertyName(node: unknown): string | undefined {
    const nodeType = AstHelpers.getNodeType(node);

    if (nodeType === 'Identifier') {
      const name = AstHelpers.getIdentifierName(node);
      const result = name === undefined ? undefined : `identifier:${  name}`;

      return result;
    }
    if (nodeType === 'Literal') {
      const value = AstHelpers.getNodeProperty(node, 'value');

      if (typeof value === 'string') {
        return `string:${  value}`;
      }
      if (typeof value === 'number') {
        return `number:${  value}`;
      }
    }

    return undefined;
  }

  private static typeShapes(types: unknown): readonly string[] | undefined {
    if (!Array.isArray(types)) {
      return undefined;
    }

    const shapes: string[] = [];

    for (let index = 0; index < types.length; index += 1) {
      const shape = EstreeTypeDeclarationShape.forType(Reflect.get(types, index));

      if (shape === undefined) {
        return undefined;
      }

      shapes.push(shape);
    }

    return shapes;
  }
}

class ExternalTypeCatalog {
  private static readonly catalogsByHost = new WeakMap<ProjectHostInterface, Map<string, TypeCatalogInterface | undefined>>();

  public static create(filename: string, host: ProjectHostInterface | undefined): TypeCatalogInterface | undefined {
    if (host === undefined) {
      return undefined;
    }

    const packageRoot = PackageBoundary.rootForFilename(filename, host);

    if (packageRoot === undefined) {
      return undefined;
    }

    const catalogsByPackageRoot = ExternalTypeCatalog.catalogsFor(host);

    if (catalogsByPackageRoot.has(packageRoot)) {
      const result = catalogsByPackageRoot.get(packageRoot);

      return result;
    }

    const result = ExternalTypeCatalog.createForPackage(filename, host);

    catalogsByPackageRoot.set(packageRoot, result);
    return result;
  }

  public static findExactMatch(shape: string, catalog: TypeCatalogInterface): ExternalTypeCandidateInterface | undefined {
    const result = catalog.candidates.find((candidate) => {
      const matches = candidate.hasRequiredMember && candidate.shape === shape;

      return matches;
    });

    return result;
  }

  private static createForPackage(filename: string, host: ProjectHostInterface): TypeCatalogInterface | undefined {
    const dependencies = DependencyExportResolver.resolve(filename, host);

    if (dependencies.length === 0) {
      return undefined;
    }

    const candidates: ExternalTypeCandidateInterface[] = [];
    const dependencyCount = dependencies.length;

    for (let index = 0; index < dependencyCount; index += 1) {
      const dependency = dependencies[index]!;

      candidates.push(...ExternalTypeCatalog.publicTypesFromEntry(dependency, host));
    }

    const result: TypeCatalogInterface = { 'candidates': candidates };

    return result;
  }

  private static publicTypesFromEntry(
    dependency: ResolvedDependencyInterface,
    host: ProjectHostInterface
  ): readonly ExternalTypeCandidateInterface[] {
    const activeFilenames = new Set<string>();
    const result = ExternalTypeCatalog.publicTypesFromModule(
      dependency.filename,
      dependency.dependencyName,
      dependency.packageRoot,
      undefined,
      activeFilenames,
      host
    );

    return result;
  }

  private static publicTypesFromModule(
    filename: string,
    dependencyName: string,
    dependencyPackageRoot: string,
    publicNames: ReadonlyMap<string, string> | undefined,
    activeFilenames: Set<string>,
    host: ProjectHostInterface
  ): readonly ExternalTypeCandidateInterface[] {
    if (activeFilenames.has(filename)) {
      return [];
    }

    activeFilenames.add(filename);

    const sourceText = host.readTextFile(filename);

    if (sourceText === undefined) {
      activeFilenames.delete(filename);
      return [];
    }

    const source = createSourceFile(filename, sourceText, ScriptTarget.Latest, true);
    const declarationPublicNames = ExternalTypeCatalog.publicNamesForDeclarations(source, publicNames);
    const candidates: ExternalTypeCandidateInterface[] = [];
    const statementCount = source.statements.length;

    for (let index = 0; index < statementCount; index += 1) {
      const statement = source.statements[index]!;

      if (isInterfaceDeclaration(statement) || isTypeAliasDeclaration(statement)) {
        ExternalTypeCatalog.addDeclarationCandidate(statement, dependencyName, declarationPublicNames, candidates);
        continue;
      }
      if (!isExportDeclaration(statement) || statement.moduleSpecifier === undefined || !isStringLiteral(statement.moduleSpecifier)) {
        continue;
      }

      const reexportFilename = ExternalTypeCatalog.resolveRelativeExport(
        statement.moduleSpecifier.text,
        filename,
        dependencyPackageRoot,
        host
      );

      if (reexportFilename === undefined) {
        continue;
      }
      if (statement.exportClause === undefined) {
        if (publicNames === undefined) {
          candidates.push(...ExternalTypeCatalog.publicTypesFromModule(
            reexportFilename,
            dependencyName,
            dependencyPackageRoot,
            undefined,
            activeFilenames,
            host
          ));
        }
        continue;
      }
      if (!isNamedExports(statement.exportClause)) {
        continue;
      }

      const reexportedNames = ExternalTypeCatalog.reexportedNames(statement.exportClause, statement.isTypeOnly, publicNames);

      if (reexportedNames.size > 0) {
        candidates.push(...ExternalTypeCatalog.publicTypesFromModule(
          reexportFilename,
          dependencyName,
          dependencyPackageRoot,
          reexportedNames,
          activeFilenames,
          host
        ));
      }
    }

    activeFilenames.delete(filename);
    return candidates;
  }

  private static publicNamesForDeclarations(
    source: SourceFile,
    publicNames: ReadonlyMap<string, string> | undefined
  ): ReadonlyMap<string, string> {
    const result = new Map<string, string>();
    const statementCount = source.statements.length;

    for (let index = 0; index < statementCount; index += 1) {
      const statement = source.statements[index]!;

      if (isInterfaceDeclaration(statement) || isTypeAliasDeclaration(statement)) {
        if ((getCombinedModifierFlags(statement) & ModifierFlags.Export) === 0) {
          continue;
        }

        const declarationName = statement.name.text;

        if (publicNames !== undefined && !publicNames.has(declarationName)) {
          continue;
        }

        result.set(declarationName, publicNames?.get(declarationName) ?? declarationName);
        continue;
      }
      if (!isExportDeclaration(statement) || statement.moduleSpecifier !== undefined) {
        continue;
      }

      const exportClause = statement.exportClause;

      if (exportClause === undefined || !isNamedExports(exportClause)) {
        continue;
      }

      const localExportNames = ExternalTypeCatalog.reexportedNames(exportClause, statement.isTypeOnly, publicNames);

      for (const [declarationName, publicExportName] of localExportNames) {
        if (!result.has(declarationName)) {
          result.set(declarationName, publicExportName);
        }
      }
    }

    return result;
  }

  private static addDeclarationCandidate(
    declaration: InterfaceDeclaration | TypeAliasDeclaration,
    dependencyName: string,
    publicNames: ReadonlyMap<string, string>,
    candidates: ExternalTypeCandidateInterface[]
  ): void {
    const declarationName = declaration.name.text;
    const exportName = publicNames.get(declarationName);

    if (exportName === undefined) {
      return;
    }

    const shape = TypeDeclarationShape.forDeclaration(declaration);

    if (shape === undefined) {
      return;
    }

    candidates.push({
      'dependencyName': dependencyName,
      'exportName': exportName,
      'hasRequiredMember': TypeDeclarationShape.hasRequiredMember(declaration),
      'shape': shape
    });
  }

  private static reexportedNames(
    exportClause: NamedExports,
    declarationIsTypeOnly: boolean,
    publicNames: ReadonlyMap<string, string> | undefined
  ): ReadonlyMap<string, string> {
    const result = new Map<string, string>();
    const elementCount = exportClause.elements.length;

    for (let index = 0; index < elementCount; index += 1) {
      const element = exportClause.elements[index]!;

      if (!declarationIsTypeOnly && !element.isTypeOnly) {
        continue;
      }

      const localExportName = element.name.text;

      if (publicNames !== undefined && !publicNames.has(localExportName)) {
        continue;
      }

      const sourceExportName = element.propertyName?.text ?? localExportName;
      const publicExportName = publicNames?.get(localExportName) ?? localExportName;

      result.set(sourceExportName, publicExportName);
    }

    return result;
  }

  private static resolveRelativeExport(
    moduleSpecifier: string,
    filename: string,
    dependencyPackageRoot: string,
    host: ProjectHostInterface
  ): string | undefined {
    if (!moduleSpecifier.startsWith('.')) {
      return undefined;
    }

    const resolution = host.resolveModule(moduleSpecifier, filename);

    if (resolution === undefined || PackageBoundary.rootForFilename(resolution, host) !== dependencyPackageRoot) {
      return undefined;
    }

    return resolution;
  }

  private static catalogsFor(host: ProjectHostInterface): Map<string, TypeCatalogInterface | undefined> {
    let catalogsByPackageRoot = ExternalTypeCatalog.catalogsByHost.get(host);

    if (catalogsByPackageRoot === undefined) {
      catalogsByPackageRoot = new Map<string, TypeCatalogInterface | undefined>();
      ExternalTypeCatalog.catalogsByHost.set(host, catalogsByPackageRoot);
    }

    return catalogsByPackageRoot;
  }
}


interface SemanticTypeCandidateInterface {
  readonly 'composesAllowed': boolean;
  readonly 'dependencyName': string;
  readonly 'exportName': string;
  readonly 'isPlatform': boolean;
  readonly 'symbol': Symbol;
  readonly 'type': Type;
}

class SemanticTypeCatalog {
  public static create(
    context: Rule.RuleContext,
    host: ProjectHostInterface | undefined
  ): SemanticTypeCatalog | undefined {
    const servicesUnknown: unknown = context.sourceCode.parserServices;

    if (!AstHelpers.hasTypeServices(servicesUnknown)) {
      return undefined;
    }

    const sourceFile = SemanticTypeCatalog.sourceFileForContext(context, servicesUnknown.program);

    if (sourceFile === undefined) {
      return undefined;
    }

    const candidates = SemanticTypeCatalog.collectCandidates(sourceFile, servicesUnknown.program, host);

    return new SemanticTypeCatalog(servicesUnknown.esTreeNodeToTSNodeMap, servicesUnknown.program, candidates);
  }

  public isCanonicalEntityType(node: Rule.Node): boolean {
    const declaration = this.esTreeNodeToTSNodeMap.get(node);

    if (declaration === undefined) {
      return false;
    }

    const classification = TypeContractClassification.forProgram(this.program);

    if (isTypeAliasDeclaration(declaration)) {
      const result = classification.isCanonicalEntityTypeAlias(declaration);

      return result;
    }

    const result = isInterfaceDeclaration(declaration)
      && classification.isCanonicalEntityInterface(declaration);

    return result;
  }

  public findExactMatch(node: Rule.Node): SemanticTypeCandidateInterface | undefined {
    const declaration = this.esTreeNodeToTSNodeMap.get(node);

    if (declaration === undefined || (!isInterfaceDeclaration(declaration) && !isTypeAliasDeclaration(declaration))) {
      return undefined;
    }

    const symbol = this.checker.getSymbolAtLocation(declaration.name);

    if (symbol === undefined) {
      return undefined;
    }

    const type = this.checker.getTypeAtLocation(declaration.name);

    if (!SemanticTypeCatalog.isComparable(type)) {
      return undefined;
    }

    const candidateCount = this.candidates.length;
    let exactMatch: SemanticTypeCandidateInterface | undefined;
    let highestSpecificity = -1;

    for (let index = 0; index < candidateCount; index += 1) {
      const candidate = this.candidates[index]!;

      if (candidate.symbol === symbol || (candidate.composesAllowed && SemanticTypeCatalog.composesCandidate(declaration, candidate.symbol, this.checker))) {
        continue;
      }

      if (!SemanticTypeCatalog.hasConstrainedShape(candidate.type) || !SemanticTypeCatalog.hasRequiredMember(candidate.type) || !SemanticTypeCatalog.isComparable(candidate.type)) {
        continue;
      }


      if (candidate.isPlatform && !SemanticTypeCatalog.isPlatformMatch(type, candidate, declaration, this.checker)) {
        continue;
      }

      const localAssignableToCandidate = this.checker.isTypeAssignableTo(type, candidate.type);
      const candidateAssignableToLocal = this.checker.isTypeAssignableTo(candidate.type, type);

      if (!localAssignableToCandidate || !candidateAssignableToLocal) {
        continue;
      }

      const specificity = SemanticTypeCatalog.specificityOf(candidate.type);

      if (specificity > highestSpecificity) {
        exactMatch = candidate;
        highestSpecificity = specificity;
      }
    }

    return exactMatch;
  }

  private readonly checker;

  private readonly program: Program;

  private constructor(
    private readonly esTreeNodeToTSNodeMap: {
      readonly 'get': (node: unknown) => Node | undefined;
    },
    program: Program,
    private readonly candidates: readonly SemanticTypeCandidateInterface[]
  ) {
    this.program = program;
    this.checker = program.getTypeChecker();
  }

  private static sourceFileForContext(context: Rule.RuleContext, program: Program): SourceFile | undefined {
    const normalizedFilename = context.filename.replaceAll('\\', '/');
    const sourceFiles = program.getSourceFiles();
    const sourceFileCount = sourceFiles.length;

    for (let index = 0; index < sourceFileCount; index += 1) {
      const sourceFile = sourceFiles[index]!;

      if (sourceFile.fileName.replaceAll('\\', '/') === normalizedFilename) {
        return sourceFile;
      }
    }

    return undefined;
  }

  private static collectCandidates(
    sourceFile: SourceFile,
    program: Program,
    host: ProjectHostInterface | undefined
  ): readonly SemanticTypeCandidateInterface[] {
    const checker = program.getTypeChecker();
    const candidates: SemanticTypeCandidateInterface[] = [];

    SemanticTypeCatalog.addPlatformCandidates(sourceFile, program, checker, candidates);
    SemanticTypeCatalog.addDependencyCandidates(sourceFile, program, host, checker, candidates);
    SemanticTypeCatalog.addEntityCandidates(sourceFile, program, host, checker, candidates);

    return candidates;
  }

  private static addPlatformCandidates(
    sourceFile: SourceFile,
    program: Program,
    checker: TypeChecker,
    candidates: SemanticTypeCandidateInterface[]
  ): void {
    const symbols = checker.getSymbolsInScope(sourceFile, SymbolFlags.Type | SymbolFlags.Value);
    const symbolCount = symbols.length;

    for (let index = 0; index < symbolCount; index += 1) {
      const symbol = symbols[index]!;

      if (!SemanticTypeCatalog.isPlatformSymbol(symbol, program) || !SemanticTypeCatalog.isPlatformContract(symbol, sourceFile, checker, program)) {
        continue;
      }

      SemanticTypeCatalog.addSymbolCandidates(
        symbol,
        sourceFile,
        checker,
        true,
        'TypeScript platform library',
        symbol.name,
        candidates
      );
    }
  }

  private static addDependencyCandidates(
    sourceFile: SourceFile,
    program: Program,
    host: ProjectHostInterface | undefined,
    checker: TypeChecker,
    candidates: SemanticTypeCandidateInterface[]
  ): void {
    const dependencies = host === undefined
      ? []
      : DependencyExportResolver.resolve(sourceFile.fileName, host);
    const dependencyCount = dependencies.length;

    for (let index = 0; index < dependencyCount; index += 1) {
      const dependency = dependencies[index]!;
      const dependencySource = program.getSourceFile(dependency.filename);

      if (dependencySource === undefined) {
        continue;
      }

      const moduleSymbol = checker.getSymbolAtLocation(dependencySource);

      if (moduleSymbol === undefined) {
        continue;
      }

      const exports = checker.getExportsOfModule(moduleSymbol);
      const exportCount = exports.length;

      for (let exportIndex = 0; exportIndex < exportCount; exportIndex += 1) {
        const exportedSymbol = exports[exportIndex]!;

        SemanticTypeCatalog.addSymbolCandidates(
          exportedSymbol,
          sourceFile,
          checker,
          false,
          dependency.dependencyName,
          exportedSymbol.name,
          candidates
        );
        SemanticTypeCatalog.addEntityCandidate(exportedSymbol, checker, dependency.dependencyName, candidates);
      }
    }
  }

  private static addEntityCandidates(
    sourceFile: SourceFile,
    program: Program,
    host: ProjectHostInterface | undefined,
    checker: TypeChecker,
    candidates: SemanticTypeCandidateInterface[]
  ): void {
    const packageRoot = PackageBoundary.rootFor(sourceFile, program, host);

    if (packageRoot === undefined) {
      return;
    }

    const sourceFiles = program.getSourceFiles();
    const sourceFileCount = sourceFiles.length;

    for (let sourceIndex = 0; sourceIndex < sourceFileCount; sourceIndex += 1) {
      const candidateSource = sourceFiles[sourceIndex]!;
      const candidateRoot = PackageBoundary.rootFor(candidateSource, program, host);

      if (candidateRoot !== packageRoot) {
        continue;
      }

      const moduleSymbol = checker.getSymbolAtLocation(candidateSource);

      if (moduleSymbol === undefined) {
        continue;
      }

      const exports = checker.getExportsOfModule(moduleSymbol);
      const exportCount = exports.length;

      for (let exportIndex = 0; exportIndex < exportCount; exportIndex += 1) {
        const exportedSymbol = exports[exportIndex]!;

        SemanticTypeCatalog.addEntityCandidate(exportedSymbol, checker, packageRoot, candidates);
      }
    }
  }

  private static addEntityCandidate(
    exportedSymbol: Symbol,
    checker: TypeChecker,
    dependencyName: string,
    candidates: SemanticTypeCandidateInterface[]
  ): void {
    const members = checker.getExportsOfModule(exportedSymbol);
    const typeSymbol = members.find((member) => {
      const result = member.name === 'Type';

      return result;
    });
    const schemaSymbol = members.find((member) => {
      const result = member.name === 'Schema';

      return result;
    });

    if (typeSymbol === undefined || schemaSymbol === undefined) {
      return;
    }

    SemanticTypeCatalog.addTypeCandidate(
      typeSymbol,
      checker.getDeclaredTypeOfSymbol(typeSymbol),
      true,
      false,
      dependencyName,
      `${exportedSymbol.name}.Type`,
      candidates
    );
  }

  private static addSymbolCandidates(
    symbol: Symbol,
    sourceFile: SourceFile,
    checker: TypeChecker,
    isPlatform: boolean,
    dependencyName: string,
    exportName: string,
    candidates: SemanticTypeCandidateInterface[]
  ): void {
    const resolvedSymbol = SemanticTypeCatalog.resolvedSymbol(symbol, checker);

    if (resolvedSymbol === undefined) {
      return;
    }

    if (
      (resolvedSymbol.flags & SymbolFlags.Type) !== 0
      && !SemanticTypeCatalog.hasGenericTypeParameters(resolvedSymbol)
    ) {
      const type = checker.getDeclaredTypeOfSymbol(resolvedSymbol);

      if (isPlatform || SemanticTypeCatalog.hasRequiredMember(type)) {
        SemanticTypeCatalog.addTypeCandidate(
          resolvedSymbol,
          type,
          true,
          isPlatform,
          dependencyName,
          exportName,
          candidates
        );
      }
    }

    if ((resolvedSymbol.flags & SymbolFlags.Value) !== 0) {
      const type = checker.getTypeOfSymbolAtLocation(resolvedSymbol, sourceFile);

      if (isPlatform || SemanticTypeCatalog.hasRequiredMember(type)) {
        SemanticTypeCatalog.addTypeCandidate(
          resolvedSymbol,
          type,
          false,
          isPlatform,
          dependencyName,
          exportName,
          candidates
        );
      }
    }
  }

  private static hasGenericTypeParameters(symbol: Symbol): boolean {
    const declarations = symbol.getDeclarations() ?? [];
    const result = declarations.some((declaration) => {
      const typeParameters = (isInterfaceDeclaration(declaration) || isTypeAliasDeclaration(declaration))
        ? declaration.typeParameters
        : undefined;

      const hasTypeParameters = typeParameters !== undefined && typeParameters.length > 0;

      return hasTypeParameters;
    });

    return result;
  }

  private static addTypeCandidate(
    symbol: Symbol,
    type: Type,
    composesAllowed: boolean,
    isPlatform: boolean,
    dependencyName: string,
    exportName: string,
    candidates: SemanticTypeCandidateInterface[]
  ): void {
    const isDuplicate = candidates.some((candidate) => {
      const result = candidate.symbol === symbol && candidate.type === type;

      return result;
    });

    if (isDuplicate) {
      return;
    }

    candidates.push({
      'composesAllowed': composesAllowed,
      'dependencyName': dependencyName,
      'exportName': exportName,
      'isPlatform': isPlatform,
      'symbol': symbol,
      'type': type
    });
  }

  private static hasConstrainedShape(type: Type): boolean {
    const result = SemanticTypeCatalog.specificityOf(type) > 0;

    return result;
  }

  private static hasRequiredMember(type: Type): boolean {
    if (type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0) {
      return true;
    }

    const result = type.getProperties().some((property) => {
      const isRequired = (property.flags & SymbolFlags.Optional) === 0;

      return isRequired;
    });

    return result;
  }

  private static specificityOf(type: Type): number {
    const result = type.getProperties().length + type.getCallSignatures().length + type.getConstructSignatures().length;

    return result;
  }

  private static isPlatformSymbol(symbol: Symbol, program: Program): boolean {
    const declarations = symbol.getDeclarations();

    if (declarations === undefined) {
      return false;
    }

    const result = declarations.some((declaration) => {
      const isDefaultLibrary = program.isSourceFileDefaultLibrary(declaration.getSourceFile());

      return isDefaultLibrary;
    });

    return result;
  }



  private static isPlatformMatch(
    localType: Type,
    candidate: SemanticTypeCandidateInterface,
    declaration: InterfaceDeclaration | TypeAliasDeclaration,
    checker: TypeChecker
  ): boolean {
    if (candidate.type.getConstructSignatures().length > 0 && localType.getConstructSignatures().length === 0) {
      return false;
    }

    const properties = candidate.type.getProperties();
    const propertyCount = properties.length;
    let behavioralPropertyCount = 0;
    let declaredPropertyCount = 0;

    for (let index = 0; index < propertyCount; index += 1) {
      const property = properties[index]!;
      const propertyType = checker.getTypeOfSymbolAtLocation(property, declaration);
      const declaresProperty = SemanticTypeCatalog.declaresMember(declaration, property.name);
      const isBehavioral = propertyType.getCallSignatures().length > 0 || propertyType.getConstructSignatures().length > 0;

      if (declaresProperty) {
        declaredPropertyCount += 1;
      } else if (isBehavioral) {
        return false;
      }

      if (isBehavioral) {
        behavioralPropertyCount += 1;
      }
    }

    const result = candidate.type.getConstructSignatures().length > 0 || behavioralPropertyCount > 0 || (propertyCount >= 3 && declaredPropertyCount >= propertyCount - 1);

    return result;
  }

  private static declaresMember(
    declaration: InterfaceDeclaration | TypeAliasDeclaration,
    name: string
  ): boolean {
    const members = TypeDeclarationShape.membersFor(declaration) ?? [];
    const result = members.some((member) => {
      if ((!isPropertySignature(member) && !isMethodSignature(member)) || member.name === undefined) {
        return false;
      }

      if (!isIdentifier(member.name) && !isStringLiteral(member.name) && !isNumericLiteral(member.name)) {
        return false;
      }

      const matches = member.name.text === name;

      return matches;
    });

    return result;
  }

  private static isPlatformContract(
    symbol: Symbol,
    sourceFile: SourceFile,
    checker: TypeChecker,
    program: Program
  ): boolean {
    const types: Type[] = [];

    if ((symbol.flags & SymbolFlags.Type) !== 0) {
      types.push(checker.getDeclaredTypeOfSymbol(symbol));
    }

    if ((symbol.flags & SymbolFlags.Value) !== 0) {
      types.push(checker.getTypeOfSymbolAtLocation(symbol, sourceFile));
    }

    const typeCount = types.length;

    for (let index = 0; index < typeCount; index += 1) {
      if (SemanticTypeCatalog.hasPlatformContractMember(types[index]!, sourceFile, checker, program)) {
        return true;
      }
    }

    const declarations = symbol.getDeclarations() ?? [];

    for (let index = 0; index < declarations.length; index += 1) {
      if (SemanticTypeCatalog.referencesPlatformType(declarations[index]!, symbol, checker, program)) {
        return true;
      }
    }

    return false;
  }

  private static referencesPlatformType(
    declaration: Node,
    candidateSymbol: Symbol,
    checker: TypeChecker,
    program: Program
  ): boolean {
    let result = false;

    const visit = (node: Node): void => {
      if (result) {
        return;
      }

      if (isIdentifier(node)) {
        const symbol = SemanticTypeCatalog.resolvedSymbol(checker.getSymbolAtLocation(node), checker);

        if (symbol !== undefined && symbol !== candidateSymbol && SemanticTypeCatalog.isPlatformSymbol(symbol, program)) {
          result = true;
          return;
        }
      }

      node.forEachChild(visit);
    };

    declaration.forEachChild(visit);

    return result;
  }

  private static hasPlatformContractMember(
    type: Type,
    sourceFile: SourceFile,
    checker: TypeChecker,
    program: Program
  ): boolean {
    if (type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0) {
      return true;
    }

    const properties = type.getProperties();
    const propertyCount = properties.length;

    for (let index = 0; index < propertyCount; index += 1) {
      const property = properties[index]!;
      const propertyType = checker.getTypeOfSymbolAtLocation(property, sourceFile);

      if (propertyType.getCallSignatures().length > 0 || propertyType.getConstructSignatures().length > 0) {
        return true;
      }

      const referencedSymbol = propertyType.aliasSymbol ?? propertyType.getSymbol();

      if (referencedSymbol !== undefined && SemanticTypeCatalog.isPlatformSymbol(referencedSymbol, program)) {
        return true;
      }
    }

    return false;
  }

  private static composesCandidate(
    declaration: InterfaceDeclaration | TypeAliasDeclaration,
    candidateSymbol: Symbol,
    checker: TypeChecker
  ): boolean {
    let composesCandidate = false;

    const visit = (node: Node): void => {
      if (composesCandidate) {
        return;
      }

      if (isIdentifier(node)) {
        const symbol = checker.getSymbolAtLocation(node);

        if (SemanticTypeCatalog.resolvedSymbol(symbol, checker) === candidateSymbol) {
          composesCandidate = true;
          return;
        }
      }

      node.forEachChild(visit);
    };

    declaration.forEachChild(visit);
    return composesCandidate;
  }

  private static resolvedSymbol(
    symbol: Symbol | undefined,
    checker: TypeChecker
  ): Symbol | undefined {
    if (symbol === undefined || (symbol.flags & SymbolFlags.Alias) === 0) {
      return symbol;
    }

    const result = checker.getAliasedSymbol(symbol);

    return result;
  }

  private static isComparable(type: Type): boolean {
    const result = (type.flags & (TypeFlags.Any | TypeFlags.Unknown)) === 0;

    return result;
  }
}

class ExternalTypeRedefinition {
  public static create(context: Rule.RuleContext): Rule.RuleListener {
    const host = ProjectHostRegistry.hostFor(context);
    const catalog = ExternalTypeCatalog.create(context.filename, host);
    const declarations: Rule.Node[] = [];

    function reportIfExternalTypeIsRedefined(
      node: Rule.Node,
      semanticCatalog: SemanticTypeCatalog | undefined
    ): void {
      if (!EstreeTypeDeclarationShape.isExported(node)) {
        return;
      }
      const name = EstreeTypeDeclarationShape.nameForDeclaration(node);

      if (name === undefined) {
        return;
      }

      if (semanticCatalog?.isCanonicalEntityType(node) === true) {
        return;
      }

      const semanticMatch = semanticCatalog?.findExactMatch(node);

      if (semanticMatch !== undefined) {
        context.report({
          'data': {
            'dependencyName': semanticMatch.dependencyName,
            'exportName': semanticMatch.exportName,
            'name': name
          },
          'messageId': 'redefined-external-type',
          'node': node
        });
        return;
      }

      const shape = EstreeTypeDeclarationShape.forDeclaration(node);

      if (shape === undefined || catalog === undefined) {
        return;
      }

      const match = ExternalTypeCatalog.findExactMatch(shape, catalog);

      if (match === undefined) {
        return;
      }

      context.report({
        'data': {
          'dependencyName': match.dependencyName,
          'exportName': match.exportName,
          'name': name
        },
        'messageId': 'redefined-external-type',
        'node': node
      });
    }

    function collectDeclaration(node: Rule.Node): void {
      declarations.push(node);
    }

    function reportCollectedDeclarations(): void {
      const semanticCatalog = SemanticTypeCatalog.create(context, host);
      const declarationCount = declarations.length;

      for (let declarationIndex = 0; declarationIndex < declarationCount; declarationIndex += 1) {
        reportIfExternalTypeIsRedefined(declarations[declarationIndex]!, semanticCatalog);
      }
    }

    return {
      'Program:exit': reportCollectedDeclarations,
      'TSInterfaceDeclaration': collectDeclaration,
      'TSTypeAliasDeclaration': collectDeclaration
    };
  }
}

export const noRedefinedExternalTypes: Rule.RuleModule = {
  'create': ExternalTypeRedefinition.create,
  'meta': {
    'docs': {
      'description': 'Requires exported local types to reuse or extend direct dependency public types instead of redefining them.',
      'recommended': false
    },
    'messages': {
      'redefined-external-type': 'Type {{name}} redefines public type {{exportName}} from direct dependency {{dependencyName}}. Import that type directly, or compose it into a strictly larger local shape.'
    },
    'schema': [],
    'type': 'problem'
  }
};
