import type { ClassificationInputInterface } from './ClassificationInputInterface.js';
import type { ClassificationInterface } from './ClassificationInterface.js';

export interface ClassifierInterface {
  classify(input: ClassificationInputInterface): Promise<readonly ClassificationInterface[]>;
  getModelIdentity(): string;
}
