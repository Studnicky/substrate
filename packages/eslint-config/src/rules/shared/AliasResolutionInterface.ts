import type { ConditionalTypeNode, Symbol, TypeAliasDeclaration, TypeNode, TypeReferenceNode } from 'typescript';

import { type AliasClassificationResultInterface } from './AliasClassificationResultInterface.js';

/** Public contract of {@link TypeContractAliasResolution}, consumed via {@link TypeContractContextInterface.aliasResolution}. */
export interface AliasResolutionInterface {
  classifyAlias(declaration: TypeAliasDeclaration, visiting: Set<Symbol>, depth: number): AliasClassificationResultInterface;
  distributiveIdentityConditionalCheckType(node: ConditionalTypeNode): TypeNode | undefined;
  isArrayLikeIntrinsicReference(node: TypeReferenceNode): boolean;
  isCanonicalEntityTypeAlias(declaration: TypeAliasDeclaration): boolean;
}
