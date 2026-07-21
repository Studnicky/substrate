import type { ClockProviderInterface } from '@studnicky/clock';

export interface VirtualFileSystemOptionsInterface {
  'clock'?: ClockProviderInterface;
  'seed'?: Map<string, string>;
}
