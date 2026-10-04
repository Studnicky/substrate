import type { Clock } from '../../clock/Clock.js';
import type { TimingOptionsEntity } from '../entities/TimingOptionsEntity.js';

/** Canonical construction boundary for a timing tracker. */
export interface TimingConstructionOptionsInterface extends TimingOptionsEntity.InputType {
  readonly 'clock'?: Clock;
}
