import type { ClockProviderInterface } from '@studnicky/clock/node';

export interface VirtualFileSystemOptionsInterface {
  'clock'?: ClockProviderInterface;
  'seed'?: Map<string, string>;
}
