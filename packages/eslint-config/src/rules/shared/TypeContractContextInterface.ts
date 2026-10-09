import type {
  InterfaceDeclaration,
  Node,
  Symbol,
  TypeAliasDeclaration,
  TypeChecker,
  TypeElement,
  TypeNode
} from 'typescript';

import { type AliasResolutionInterface } from './AliasResolutionInterface.js';
import { type CallabilityClassificationInterface } from './CallabilityClassificationInterface.js';
import { type DataNodeClassificationInterface } from './DataNodeClassificationInterface.js';
import { type DataNodeResultInterface } from './DataNodeResultInterface.js';
import { type InterfaceClassificationResultInterface } from './InterfaceClassificationResultInterface.js';
import { type InterfaceContractResolutionInterface } from './InterfaceContractResolutionInterface.js';
import { type InterfaceTypeResolutionInterface } from './InterfaceTypeResolutionInterface.js';
import { type SchemaDerivationShapeInterface } from './SchemaDerivationShapeInterface.js';

/**
 * Contract the five classifier modules consume from {@link TypeContractContext} — symbol
 * resolution, schema-derived-application detection, and the sibling classifiers themselves.
 * Kept apart from the concrete class so the classifiers depend on this contract, not on each
 * other through the class, which would be a circular import.
 */
export interface TypeContractContextInterface {
  aliasDeclarationForSymbol(symbol: Symbol | undefined): TypeAliasDeclaration | undefined;
  readonly 'aliasResolution': AliasResolutionInterface;
  analyzeInterface(declaration: InterfaceDeclaration): InterfaceClassificationResultInterface;
  readonly 'callability': CallabilityClassificationInterface;
  readonly 'checker': TypeChecker;
  classifySchemaDerivedApplication(node: TypeNode): DataNodeResultInterface;
  containsTypeParameterReference(node: Node): boolean;
  readonly 'dataNode': DataNodeClassificationInterface;
  readonly 'interfaceContract': InterfaceContractResolutionInterface;
  interfaceDeclarationForSymbol(symbol: Symbol | undefined): InterfaceDeclaration | undefined;
  readonly 'interfaceType': InterfaceTypeResolutionInterface;
  isBrandMember(member: TypeElement): boolean;
  isCanonicalFromSchemaReference(derivingNameNode: Node): boolean;
  isFromSchemaNamedReference(node: TypeNode): boolean;
  isIntrinsic(node: TypeNode, name: 'Array' | 'Function' | 'Readonly' | 'ReadonlyArray'): boolean;
  isRuntimeType(node: TypeNode): boolean;
  isSchemaDerivationApplication(node: TypeNode): boolean;
  isSchemaDerivedApplication(node: TypeNode): boolean;
  isSchemaDerivedShape(shape: SchemaDerivationShapeInterface): boolean;
  isUniqueSymbol(node: TypeNode): boolean;
  namespaceHandWrittenTypeIsJustified(declaration: Node): boolean;
  resolveSymbol(symbol: Symbol | undefined): Symbol | undefined;
  typeParameterConstraintNode(symbol: Symbol): TypeNode | undefined;
}
