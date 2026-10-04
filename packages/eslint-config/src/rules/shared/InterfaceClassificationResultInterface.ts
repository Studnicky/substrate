import type { Node } from 'typescript';

import type { TypeContractMetadataEntity } from './TypeContractMetadataEntity.js';

export interface InterfaceClassificationResultInterface {
  readonly 'classification': TypeContractMetadataEntity.Type['interfaceClassification'];
  readonly 'evidence': Node;
  readonly 'reason': TypeContractMetadataEntity.Type['interfaceReason'];
}
