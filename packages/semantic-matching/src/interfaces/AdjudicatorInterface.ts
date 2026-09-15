import type { AdjudicationEntity } from '../entities/AdjudicationEntity.js';
import type { AdjudicationInputEntity } from '../entities/AdjudicationInputEntity.js';

export interface AdjudicatorInterface {
  adjudicate(input: AdjudicationInputEntity.Type): Promise<AdjudicationEntity.Type>;
  getModelIdentity(): string;
}
