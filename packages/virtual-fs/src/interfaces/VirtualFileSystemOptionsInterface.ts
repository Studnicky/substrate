import type { ClockProviderInterface } from '@studnicky/clock/browser';

export interface VirtualFileSystemOptionsInterface {
  'clock'?: ClockProviderInterface;
  'seed'?: Map<string, string>;
}
