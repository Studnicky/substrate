import type { ExpressionWithTypeArguments, InterfaceDeclaration, Symbol, TypeNode } from 'typescript';

import { type InterfaceContractEvidenceInterface } from './InterfaceContractEvidenceInterface.js';

/** Public contract of {@link TypeContractInterfaceTypeResolution}, consumed via {@link TypeContractContextInterface.interfaceType}. */
export interface InterfaceTypeResolutionInterface {
  findInterfaceTypeContract(node: TypeNode, visiting: Set<Symbol>, depth: number): InterfaceContractEvidenceInterface | undefined;
  isCanonicalEntityInterface(declaration: InterfaceDeclaration): boolean;
  isSchemaDerivedHeritageType(node: ExpressionWithTypeArguments): boolean;
}
