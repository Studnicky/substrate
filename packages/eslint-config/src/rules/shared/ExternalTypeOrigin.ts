import {
  type Declaration,
  isIntersectionTypeNode,
  isParenthesizedTypeNode,
  isTypeReferenceNode,
  isUnionTypeNode,
  type Program,
  type Symbol,
  SymbolFlags,
  type TypeAliasDeclaration,
  type TypeChecker,
  type TypeNode,
  type TypeReferenceNode
} from 'typescript';

import type { ProjectHostInterface } from '../../interfaces/ProjectHostInterface.js';

import { CallIdentity } from './CallIdentity.js';
import { PackageBoundary } from './PackageBoundary.js';

/**
 * Resolves whether a type alias's right-hand side composes a type TypeScript or a declared
 * direct dependency exports — a transitive package or a private declaration never qualifies.
 */
export class ExternalTypeOrigin {
  public static isComposedIn(
    declaration: TypeAliasDeclaration,
    program: Program,
    host: ProjectHostInterface | undefined
  ): boolean {
    const dependencyNames = new Set(PackageBoundary.directDependencyNamesFor(declaration.getSourceFile(), program, host));
    const checker = program.getTypeChecker();
    const result = ExternalTypeOrigin.composesExternalReference(declaration.type, checker, dependencyNames);

    return result;
  }

  private static composesExternalReference(node: TypeNode, checker: TypeChecker, dependencyNames: ReadonlySet<string>): boolean {
    if (isParenthesizedTypeNode(node)) {
      const result = ExternalTypeOrigin.composesExternalReference(node.type, checker, dependencyNames);

      return result;
    }
    if (isUnionTypeNode(node) || isIntersectionTypeNode(node)) {
      const result = node.types.some((member) => {
        const memberResult = ExternalTypeOrigin.composesExternalReference(member, checker, dependencyNames);

        return memberResult;
      });

      return result;
    }
    if (!isTypeReferenceNode(node)) {
      return false;
    }

    const result = ExternalTypeOrigin.isExternalReference(node, checker, dependencyNames);

    return result;
  }

  private static isExternalReference(node: TypeReferenceNode, checker: TypeChecker, dependencyNames: ReadonlySet<string>): boolean {
    const symbol = ExternalTypeOrigin.resolveSymbol(checker.getSymbolAtLocation(node.typeName), checker);
    const declarations = symbol?.getDeclarations() ?? [];
    const result = declarations.some((declaration) => {
      const declarationResult = ExternalTypeOrigin.declarationIsExternal(declaration, dependencyNames);

      return declarationResult;
    });

    return result;
  }

  private static resolveSymbol(symbol: Symbol | undefined, checker: TypeChecker): Symbol | undefined {
    if (symbol === undefined || (symbol.flags & SymbolFlags.Alias) === 0) {
      return symbol;
    }

    const result = checker.getAliasedSymbol(symbol);

    return result;
  }

  private static declarationIsExternal(declaration: Declaration, dependencyNames: ReadonlySet<string>): boolean {
    if (CallIdentity.isStandardLibraryDeclaration(declaration)) {
      return true;
    }

    const packageName = ExternalTypeOrigin.dependencyPackageName(declaration.getSourceFile().fileName);
    const result = packageName !== undefined && dependencyNames.has(packageName);

    return result;
  }

  // A scoped package (`@scope/name`) spans two path segments after `node_modules/`; an
  // unscoped package is the first segment alone.
  private static dependencyPackageName(filename: string): string | undefined {
    const segments = filename.split('\\').join('/').split('/node_modules/');

    if (segments.length < 2) {
      return undefined;
    }

    const parts = (segments.at(-1) ?? '').split('/');
    const first = parts.at(0);

    if (first === undefined) {
      return undefined;
    }
    if (!first.startsWith('@')) {
      return first;
    }

    const second = parts.at(1);
    const result = second === undefined ? undefined : `${first}/${second}`;

    return result;
  }
}
