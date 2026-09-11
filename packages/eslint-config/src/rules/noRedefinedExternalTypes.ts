import type { Rule } from 'eslint';

import { readFileSync } from 'node:fs';
import {
  type CompilerOptions,
  createSourceFile,
  getCombinedModifierFlags,
  type InterfaceDeclaration,
  isArrayTypeNode,
  isExportDeclaration,
  isIdentifier,
  isInterfaceDeclaration,
  isLiteralTypeNode,
  isNamedExports,
  isNumericLiteral,
  isParenthesizedTypeNode,
  isPropertySignature,
  isStringLiteral,
  isTypeAliasDeclaration,
  isTypeLiteralNode,
  isUnionTypeNode,
  ModifierFlags,
  ModuleKind,
  ModuleResolutionKind,
  type NamedExports,
  type Node,
  resolveModuleName,
  ScriptTarget,
  type SourceFile,
  SyntaxKind,
  sys,
  type TypeAliasDeclaration,
  type TypeNode
} from 'typescript';

import { AstHelpers } from './shared/astHelpers.js';
import { PackageBoundary } from './shared/PackageBoundary.js';


interface ExternalTypeCandidateInterface {
  readonly 'dependencyName': string;
  readonly 'exportName': string;
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

const nodeNextModuleResolutionOptions: CompilerOptions = {
  'module': ModuleKind.NodeNext,
  'moduleResolution': ModuleResolutionKind.NodeNext,
  'target': ScriptTarget.ES2022
};

class ExternalTypeCatalog {
  private static readonly catalogsByPackageRoot = new Map<string, TypeCatalogInterface | undefined>();

  public static create(filename: string): TypeCatalogInterface | undefined {
    const packageRoot = PackageBoundary.rootForFilename(filename);

    if (packageRoot === undefined) {
      return undefined;
    }
    if (ExternalTypeCatalog.catalogsByPackageRoot.has(packageRoot)) {
      const result = ExternalTypeCatalog.catalogsByPackageRoot.get(packageRoot);

      return result;
    }
    const result = ExternalTypeCatalog.createForPackage(filename);

    ExternalTypeCatalog.catalogsByPackageRoot.set(packageRoot, result);
    return result;
  }

  public static findExactMatch(shape: string, catalog: TypeCatalogInterface): ExternalTypeCandidateInterface | undefined {
    const result = catalog.candidates.find((candidate) => {
      const matches = candidate.shape === shape;

      return matches;
    });

    return result;
  }

  private static createForPackage(filename: string): TypeCatalogInterface | undefined {
    const dependencies = ExternalTypeCatalog.resolveDependencies(filename);

    if (dependencies.length === 0) {
      return undefined;
    }

    const candidates: ExternalTypeCandidateInterface[] = [];
    const dependencyCount = dependencies.length;

    for (let index = 0; index < dependencyCount; index += 1) {
      const dependency = dependencies[index]!;

      candidates.push(...ExternalTypeCatalog.publicTypesFromEntry(dependency));
    }

    const result: TypeCatalogInterface = { 'candidates': candidates };

    return result;
  }

  private static publicTypesFromEntry(dependency: ResolvedDependencyInterface): readonly ExternalTypeCandidateInterface[] {
    const activeFilenames = new Set<string>();
    const result = ExternalTypeCatalog.publicTypesFromModule(
      dependency.filename,
      dependency.dependencyName,
      dependency.packageRoot,
      undefined,
      activeFilenames
    );

    return result;
  }

  private static publicTypesFromModule(
    filename: string,
    dependencyName: string,
    dependencyPackageRoot: string,
    publicNames: ReadonlyMap<string, string> | undefined,
    activeFilenames: Set<string>
  ): readonly ExternalTypeCandidateInterface[] {
    if (activeFilenames.has(filename)) {
      return [];
    }

    activeFilenames.add(filename);

    let sourceText: string;

    try {
      sourceText = readFileSync(filename, 'utf8');
    } catch {
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
        dependencyPackageRoot
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
            activeFilenames
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
          activeFilenames
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
    dependencyPackageRoot: string
  ): string | undefined {
    if (!moduleSpecifier.startsWith('.')) {
      return undefined;
    }

    const resolution = resolveModuleName(moduleSpecifier, filename, nodeNextModuleResolutionOptions, sys).resolvedModule;

    if (resolution === undefined || PackageBoundary.rootForFilename(resolution.resolvedFileName) !== dependencyPackageRoot) {
      return undefined;
    }

    return resolution.resolvedFileName;
  }

  private static resolveDependencies(filename: string): readonly ResolvedDependencyInterface[] {
    const dependencyNames = PackageBoundary.directDependencyNamesForFilename(filename);
    const dependencies: ResolvedDependencyInterface[] = [];
    const dependencyCount = dependencyNames.length;

    for (let index = 0; index < dependencyCount; index += 1) {
      const dependencyName = dependencyNames[index]!;
      const resolution = resolveModuleName(dependencyName, filename, nodeNextModuleResolutionOptions, sys).resolvedModule;

      if (resolution === undefined) {
        continue;
      }

      const packageRoot = PackageBoundary.rootForFilename(resolution.resolvedFileName);

      if (packageRoot === undefined) {
        continue;
      }

      dependencies.push({
        'dependencyName': dependencyName,
        'filename': resolution.resolvedFileName,
        'packageRoot': packageRoot
      });
    }

    return dependencies;
  }
}

class ExternalTypeRedefinition {
  public static create(context: Rule.RuleContext): Rule.RuleListener {
    const catalog = ExternalTypeCatalog.create(context.filename);

    if (catalog === undefined) {
      return {};
    }
    const typeCatalog = catalog;

    function reportIfExternalTypeIsRedefined(node: Rule.Node): void {
      if (!EstreeTypeDeclarationShape.isExported(node)) {
        return;
      }
      const shape = EstreeTypeDeclarationShape.forDeclaration(node);
      const name = EstreeTypeDeclarationShape.nameForDeclaration(node);

      if (shape === undefined || name === undefined) {
        return;
      }
      const match = ExternalTypeCatalog.findExactMatch(shape, typeCatalog);

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

    return {
      'TSInterfaceDeclaration': reportIfExternalTypeIsRedefined,
      'TSTypeAliasDeclaration': reportIfExternalTypeIsRedefined
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
