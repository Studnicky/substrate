import type { RerankInputEntity } from '../entities/RerankInputEntity.js';
import type { RerankMatchEntity } from '../entities/RerankMatchEntity.js';

export interface RerankerInterface {
  getModelIdentity(): string;
  rerank(input: RerankInputEntity.Type): Promise<readonly RerankMatchEntity.Type[]>;
}
