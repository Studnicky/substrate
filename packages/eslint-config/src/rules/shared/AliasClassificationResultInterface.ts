import type { Node } from 'typescript';

import type { ReadonlyOutputEvidenceInterface } from './ReadonlyOutputEvidenceInterface.js';
import type { TypeContractMetadataEntity } from './TypeContractMetadataEntity.js';

export interface AliasClassificationResultInterface {
  readonly 'classification': TypeContractMetadataEntity.Type['aliasClassification'];
  readonly 'evidence': Node;
  readonly 'readonlyOutput': readonly ReadonlyOutputEvidenceInterface[];
  readonly 'reason': TypeContractMetadataEntity.Type['aliasReason'];
}
