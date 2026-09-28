import type { Node } from 'typescript';

import type { TypeContractMetadataEntity } from './TypeContractMetadataEntity.js';

export interface ReadonlyOutputEvidenceInterface {
  readonly 'fixable': TypeContractMetadataEntity.Type['fixable'];
  readonly 'node': Node;
  readonly 'reason': TypeContractMetadataEntity.Type['readonlyReason'];
}
