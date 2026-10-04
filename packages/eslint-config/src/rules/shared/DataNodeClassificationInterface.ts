import type { Symbol, TypeAliasDeclaration, TypeNode } from 'typescript';

import { type DataNodeResultInterface } from './DataNodeResultInterface.js';
import { type ReadonlyOutputEvidenceInterface } from './ReadonlyOutputEvidenceInterface.js';

/** Public contract of {@link TypeContractDataNodeClassification}, consumed via {@link TypeContractContextInterface.dataNode}. */
export interface DataNodeClassificationInterface {
  classifyDataNode(node: TypeNode, root: boolean, visiting: Set<Symbol>, depth: number): DataNodeResultInterface;
  readonlyOutputForAlias(
    declaration: TypeAliasDeclaration,
    visitingAliases: Set<Symbol>,
    depth: number
  ): readonly ReadonlyOutputEvidenceInterface[];
}
