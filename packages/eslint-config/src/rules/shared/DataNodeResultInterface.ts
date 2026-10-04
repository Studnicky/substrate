import type { Node } from 'typescript';

import type { TypeContractMetadataEntity } from './TypeContractMetadataEntity.js';

export interface DataNodeResultInterface {
  readonly 'canonicalRoot': TypeContractMetadataEntity.Type['canonicalRoot'];
  readonly 'evidence': Node;
  readonly 'reason': TypeContractMetadataEntity.Type['aliasReason'];
  readonly 'valid': TypeContractMetadataEntity.Type['valid'];
}
