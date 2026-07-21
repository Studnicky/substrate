import type { CoreLogFieldsEntity } from '../entities/CoreLogFieldsEntity.js';
import type { TimingFieldsEntity } from '../entities/TimingFieldsEntity.js';

/** Core metadata narrowed to a record with timing information. */
export interface TimingMetadataInterface extends CoreLogFieldsEntity.Type {
  readonly 'durationMs': TimingFieldsEntity.Type['durationMs'];
}
