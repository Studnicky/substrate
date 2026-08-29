import type { AdjudicationInputInterface } from './AdjudicationInputInterface.js';
import type { AdjudicationInterface } from './AdjudicationInterface.js';

export interface AdjudicatorInterface {
  adjudicate(input: AdjudicationInputInterface): Promise<AdjudicationInterface>;
  getModelIdentity(): string;
}
