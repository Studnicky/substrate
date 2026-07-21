import type { DlqEntryMetadataEntity } from '../entities/DlqEntryMetadataEntity.js';

export interface DlqEntryInterface<T> {
  'enqueuedAtMs': DlqEntryMetadataEntity.Type['enqueuedAtMs'];
  'error': Error | undefined;
  'id': DlqEntryMetadataEntity.Type['id'];
  'item': T;
  'reason': DlqEntryMetadataEntity.Type['reason'];
}
