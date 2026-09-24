import type { Rule } from 'eslint';

import {
  type InterfaceDeclaration,
  isIdentifier,
  isInterfaceDeclaration,
  isMethodSignature,
  isNumericLiteral,
  isPropertySignature,
  isStringLiteral,
  isTypeAliasDeclaration,
  type Node,
  type Program,
  type SourceFile,
  type Symbol,
  SymbolFlags,
  type Type,
  type TypeAliasDeclaration,
  type TypeChecker,
  TypeFlags
} from 'typescript';

import type { ProjectHostInterface } from '../../interfaces/ProjectHostInterface.js';

import { AstHelpers } from './astHelpers.js';
import { DependencyExportResolver } from './DependencyExportResolver.js';
import { PackageBoundary } from './PackageBoundary.js';
import { TypeContractClassification } from './TypeContractClassification.js';
import { TypeDeclarationShape } from './TypeDeclarationShape.js';

interface SemanticTypeCandidateInterface {
  readonly 'composesAllowed': boolean;
  readonly 'dependencyName': string;
  readonly 'exportName': string;
  readonly 'isPlatform': boolean;
  readonly 'symbol': Symbol;
  readonly 'type': Type;
}

interface SymbolCandidateContextInterface {
  readonly 'candidates': SemanticTypeCandidateInterface[];
  readonly 'dependencyName': string;
  readonly 'exportName': string;
  readonly 'isPlatform': boolean;
}

export class SemanticTypeCatalog {
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

    const result = this.bestMatchingCandidate(declaration, symbol, type);

    return result;
  }

  private bestMatchingCandidate(
    declaration: InterfaceDeclaration | TypeAliasDeclaration,
    symbol: Symbol,
    type: Type
  ): SemanticTypeCandidateInterface | undefined {
    const candidateCount = this.candidates.length;
    let exactMatch: SemanticTypeCandidateInterface | undefined;
    let highestSpecificity = -1;

    for (let index = 0; index < candidateCount; index += 1) {
      const candidate = this.candidates[index]!;

      if (!this.isEligibleCandidate(candidate, declaration, symbol, type)) {
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

  private isEligibleCandidate(
    candidate: SemanticTypeCandidateInterface,
    declaration: InterfaceDeclaration | TypeAliasDeclaration,
    symbol: Symbol,
    type: Type
  ): boolean {
    if (candidate.symbol === symbol || (candidate.composesAllowed && SemanticTypeCatalog.composesCandidate(declaration, candidate.symbol, this.checker))) {
      return false;
    }

    if (!SemanticTypeCatalog.hasConstrainedShape(candidate.type) || !SemanticTypeCatalog.hasRequiredMember(candidate.type) || !SemanticTypeCatalog.isComparable(candidate.type)) {
      return false;
    }

    if (candidate.isPlatform && !SemanticTypeCatalog.isPlatformMatch(type, candidate, declaration, this.checker)) {
      return false;
    }

    const localAssignableToCandidate = this.checker.isTypeAssignableTo(type, candidate.type);
    const candidateAssignableToLocal = this.checker.isTypeAssignableTo(candidate.type, type);
    const result = localAssignableToCandidate && candidateAssignableToLocal;

    return result;
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

      SemanticTypeCatalog.addSymbolCandidates(symbol, sourceFile, checker, {
        'candidates': candidates,
        'dependencyName': 'TypeScript platform library',
        'exportName': symbol.name,
        'isPlatform': true
      });
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

        SemanticTypeCatalog.addSymbolCandidates(exportedSymbol, sourceFile, checker, {
          'candidates': candidates,
          'dependencyName': dependency.dependencyName,
          'exportName': exportedSymbol.name,
          'isPlatform': false
        });
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

    SemanticTypeCatalog.addTypeCandidate(typeSymbol, checker.getDeclaredTypeOfSymbol(typeSymbol), true, {
      'candidates': candidates,
      'dependencyName': dependencyName,
      'exportName': `${exportedSymbol.name}.Type`,
      'isPlatform': false
    });
  }

  private static addSymbolCandidates(
    symbol: Symbol,
    sourceFile: SourceFile,
    checker: TypeChecker,
    context: SymbolCandidateContextInterface
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

      SemanticTypeCatalog.addQualifyingTypeCandidate(resolvedSymbol, type, true, context);
    }

    if ((resolvedSymbol.flags & SymbolFlags.Value) !== 0) {
      const type = checker.getTypeOfSymbolAtLocation(resolvedSymbol, sourceFile);

      SemanticTypeCatalog.addQualifyingTypeCandidate(resolvedSymbol, type, false, context);
    }
  }

  private static addQualifyingTypeCandidate(
    symbol: Symbol,
    type: Type,
    composesAllowed: boolean,
    context: SymbolCandidateContextInterface
  ): void {
    if (!context.isPlatform && !SemanticTypeCatalog.hasRequiredMember(type)) {
      return;
    }

    SemanticTypeCatalog.addTypeCandidate(symbol, type, composesAllowed, context);
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
    context: SymbolCandidateContextInterface
  ): void {
    const isDuplicate = context.candidates.some((candidate) => {
      const result = candidate.symbol === symbol && candidate.type === type;

      return result;
    });

    if (isDuplicate) {
      return;
    }

    context.candidates.push({
      'composesAllowed': composesAllowed,
      'dependencyName': context.dependencyName,
      'exportName': context.exportName,
      'isPlatform': context.isPlatform,
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

    const propertyCounts = SemanticTypeCatalog.behavioralPropertyCounts(candidate.type, declaration, checker);

    if (propertyCounts === undefined) {
      return false;
    }

    const propertyCount = candidate.type.getProperties().length;
    const result = candidate.type.getConstructSignatures().length > 0
      || propertyCounts.behavioralPropertyCount > 0
      || (propertyCount >= 3 && propertyCounts.declaredPropertyCount >= propertyCount - 1);

    return result;
  }

  private static behavioralPropertyCounts(
    type: Type,
    declaration: InterfaceDeclaration | TypeAliasDeclaration,
    checker: TypeChecker
  ): Readonly<{ 'behavioralPropertyCount': number; 'declaredPropertyCount': number }> | undefined {
    const properties = type.getProperties();
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
        return undefined;
      }

      if (isBehavioral) {
        behavioralPropertyCount += 1;
      }
    }

    return {
      'behavioralPropertyCount': behavioralPropertyCount, 'declaredPropertyCount': declaredPropertyCount
    };
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
