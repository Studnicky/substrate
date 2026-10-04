import type { Symbol, TypeNode } from 'typescript';

import { type CallabilityFlagsInterface } from './CallabilityFlagsInterface.js';

/** Public contract of {@link TypeContractCallabilityClassification}, consumed via {@link TypeContractContextInterface.callability}. */
export interface CallabilityClassificationInterface {
  classifyCallability(node: TypeNode, visiting: Set<Symbol>, depth: number): CallabilityFlagsInterface;
}
