import type { DeadLetterQueueEntryMetadataEntity } from '../entities/DeadLetterQueueEntryMetadataEntity.js';

export interface DeadLetterQueueEntryInterface<T> {
  'enqueuedAtMs': DeadLetterQueueEntryMetadataEntity.Type['enqueuedAtMs'];
  'error': Error | undefined;
  'id': DeadLetterQueueEntryMetadataEntity.Type['id'];
  'item': T;
  'reason': DeadLetterQueueEntryMetadataEntity.Type['reason'];
}
