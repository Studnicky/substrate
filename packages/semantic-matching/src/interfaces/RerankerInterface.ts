import type { RerankInputInterface } from './RerankInputInterface.js';
import type { RerankMatchInterface } from './RerankMatchInterface.js';

export interface RerankerInterface {
  getModelIdentity(): string;
  rerank(input: RerankInputInterface): Promise<readonly RerankMatchInterface[]>;
}
