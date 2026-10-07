import type { ClockProviderInterface } from '#runtime';

export interface VirtualFileSystemOptionsInterface {
  'clock'?: ClockProviderInterface;
  'seed'?: Map<string, string>;
}
