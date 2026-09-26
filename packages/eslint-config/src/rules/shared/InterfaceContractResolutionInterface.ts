import type { InterfaceDeclaration, MethodSignature, PropertySignature, Symbol, TypeNode } from 'typescript';

import { type InterfaceClassificationResultInterface } from './InterfaceClassificationResultInterface.js';
import { type InterfaceContractEvidenceInterface } from './InterfaceContractEvidenceInterface.js';

/** Public contract of {@link TypeContractInterfaceContractResolution}, consumed via {@link TypeContractContextInterface.interfaceContract}. */
export interface InterfaceContractResolutionInterface {
  classifyInterface(declaration: InterfaceDeclaration, visiting: Set<Symbol>, depth: number): InterfaceClassificationResultInterface;
  findInterfaceContract(
    declaration: InterfaceDeclaration,
    visiting: Set<Symbol>,
    depth: number
  ): InterfaceContractEvidenceInterface | undefined;
  interfaceHasCallSignature(declaration: InterfaceDeclaration, visiting: Set<Symbol>, depth: number): boolean;
  isBuiltinShadowMemberDecoy(member: MethodSignature | PropertySignature): boolean;
  isDataContractInterfaceReference(node: TypeNode, visiting: Set<Symbol>, depth: number): boolean;
}
