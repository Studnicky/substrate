import type { SettleTaskEventEntity } from '../entities/SettleTaskEventEntity.js';

export interface SettleTaskEventInterface {
  readonly 'type': SettleTaskEventEntity.Type['type'];
}
