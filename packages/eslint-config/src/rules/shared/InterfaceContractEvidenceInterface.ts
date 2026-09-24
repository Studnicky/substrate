import type { Node } from 'typescript';

import type { TypeContractMetadataEntity } from './TypeContractMetadataEntity.js';

export interface InterfaceContractEvidenceInterface {
  readonly 'node': Node;
  readonly 'reason': TypeContractMetadataEntity.Type['interfaceContractReason'];
}
