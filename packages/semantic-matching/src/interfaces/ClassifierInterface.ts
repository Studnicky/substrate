import type { ClassificationEntity } from '../entities/ClassificationEntity.js';
import type { ClassificationInputEntity } from '../entities/ClassificationInputEntity.js';

export interface ClassifierInterface {
  classify(input: ClassificationInputEntity.Type): Promise<readonly ClassificationEntity.Type[]>;
  getModelIdentity(): string;
}
