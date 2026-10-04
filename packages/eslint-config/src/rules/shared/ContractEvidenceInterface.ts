import type { Node } from 'typescript';

import type { TypeContractMetadataEntity } from './TypeContractMetadataEntity.js';

export interface ContractEvidenceInterface {
  readonly 'node': Node;
  readonly 'reason': TypeContractMetadataEntity.Type['contractReason'];
}
