import type { Rule } from 'eslint';

import {
  createSourceFile,
  getCombinedModifierFlags,
  type InterfaceDeclaration,
  isExportDeclaration,
  isInterfaceDeclaration,
  isNamedExports,
  isStringLiteral,
  isTypeAliasDeclaration,
  ModifierFlags,
  type NamedExports,
  type Node,
  ScriptTarget,
  type SourceFile,
  type TypeAliasDeclaration
} from 'typescript';

import type { ProjectHostInterface } from '../interfaces/ProjectHostInterface.js';
import type { ResolvedDependencyInterface } from './shared/ResolvedDependencyInterface.js';

import { ProjectHostRegistry } from '../runtime/ProjectHostRegistry.js';
import { AstHelpers } from './shared/astHelpers.js';
import { DependencyExportResolver } from './shared/DependencyExportResolver.js';
import { PackageBoundary } from './shared/PackageBoundary.js';
import { SemanticTypeCatalog } from './shared/SemanticTypeCatalog.js';
import { TypeDeclarationShape } from './shared/TypeDeclarationShape.js';


interface ExternalTypeCandidateInterface {
  readonly 'dependencyName': string;
  readonly 'exportName': string;
  readonly 'hasRequiredMember': boolean;
  readonly 'shape': string;
}

interface TypeCatalogInterface {
  readonly 'candidates': readonly ExternalTypeCandidateInterface[];
}

interface ModuleResolutionContextInterface {
  readonly 'activeFilenames': Set<string>;
  readonly 'dependencyName': string;
  readonly 'dependencyPackageRoot': string;
  readonly 'host': ProjectHostInterface;
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
    const context: ModuleResolutionContextInterface = {
      'activeFilenames': new Set<string>(),
      'dependencyName': dependency.dependencyName,
      'dependencyPackageRoot': dependency.packageRoot,
      'host': host
    };
    const result = ExternalTypeCatalog.publicTypesFromModule(dependency.filename, undefined, context);

    return result;
  }

  private static publicTypesFromModule(
    filename: string,
    publicNames: ReadonlyMap<string, string> | undefined,
    context: ModuleResolutionContextInterface
  ): readonly ExternalTypeCandidateInterface[] {
    if (context.activeFilenames.has(filename)) {
      return [];
    }

    context.activeFilenames.add(filename);

    const sourceText = context.host.readTextFile(filename);

    if (sourceText === undefined) {
      context.activeFilenames.delete(filename);
      return [];
    }

    const source = createSourceFile(filename, sourceText, ScriptTarget.Latest, true);
    const declarationPublicNames = ExternalTypeCatalog.publicNamesForDeclarations(source, publicNames);
    const candidates: ExternalTypeCandidateInterface[] = [];
    const statementCount = source.statements.length;

    for (let index = 0; index < statementCount; index += 1) {
      const statement = source.statements[index]!;

      if (isInterfaceDeclaration(statement) || isTypeAliasDeclaration(statement)) {
        ExternalTypeCatalog.addDeclarationCandidate(statement, context.dependencyName, declarationPublicNames, candidates);
        continue;
      }

      ExternalTypeCatalog.collectReexportCandidates(statement, filename, publicNames, candidates, context);
    }

    context.activeFilenames.delete(filename);
    return candidates;
  }

  private static collectReexportCandidates(
    statement: Node,
    filename: string,
    publicNames: ReadonlyMap<string, string> | undefined,
    candidates: ExternalTypeCandidateInterface[],
    context: ModuleResolutionContextInterface
  ): void {
    if (!isExportDeclaration(statement) || statement.moduleSpecifier === undefined || !isStringLiteral(statement.moduleSpecifier)) {
      return;
    }

    const reexportFilename = ExternalTypeCatalog.resolveRelativeExport(
      statement.moduleSpecifier.text,
      filename,
      context.dependencyPackageRoot,
      context.host
    );

    if (reexportFilename === undefined) {
      return;
    }
    if (statement.exportClause === undefined) {
      if (publicNames === undefined) {
        candidates.push(...ExternalTypeCatalog.publicTypesFromModule(reexportFilename, undefined, context));
      }

      return;
    }
    if (!isNamedExports(statement.exportClause)) {
      return;
    }

    const reexportedNames = ExternalTypeCatalog.reexportedNames(statement.exportClause, statement.isTypeOnly, publicNames);

    if (reexportedNames.size > 0) {
      candidates.push(...ExternalTypeCatalog.publicTypesFromModule(reexportFilename, reexportedNames, context));
    }
  }

  private static publicNamesForDeclarations(
    source: SourceFile,
    publicNames: ReadonlyMap<string, string> | undefined
  ): ReadonlyMap<string, string> {
    const result = new Map<string, string>();
    const statementCount = source.statements.length;

    for (let index = 0; index < statementCount; index += 1) {
      const statement = source.statements[index]!;

      ExternalTypeCatalog.collectPublicNamesFromStatement(statement, publicNames, result);
    }

    return result;
  }

  private static collectPublicNamesFromStatement(
    statement: Node,
    publicNames: ReadonlyMap<string, string> | undefined,
    result: Map<string, string>
  ): void {
    if (isInterfaceDeclaration(statement) || isTypeAliasDeclaration(statement)) {
      ExternalTypeCatalog.collectDeclarationPublicName(statement, publicNames, result);

      return;
    }
    if (!isExportDeclaration(statement) || statement.moduleSpecifier !== undefined) {
      return;
    }

    const exportClause = statement.exportClause;

    if (exportClause === undefined || !isNamedExports(exportClause)) {
      return;
    }

    const localExportNames = ExternalTypeCatalog.reexportedNames(exportClause, statement.isTypeOnly, publicNames);

    for (const [declarationName, publicExportName] of localExportNames) {
      if (!result.has(declarationName)) {
        result.set(declarationName, publicExportName);
      }
    }
  }

  private static collectDeclarationPublicName(
    statement: InterfaceDeclaration | TypeAliasDeclaration,
    publicNames: ReadonlyMap<string, string> | undefined,
    result: Map<string, string>
  ): void {
    if ((getCombinedModifierFlags(statement) & ModifierFlags.Export) === 0) {
      return;
    }

    const declarationName = statement.name.text;

    if (publicNames !== undefined && !publicNames.has(declarationName)) {
      return;
    }

    result.set(declarationName, publicNames?.get(declarationName) ?? declarationName);
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
