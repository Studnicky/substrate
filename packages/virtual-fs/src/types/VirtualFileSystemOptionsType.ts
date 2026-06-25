import type { ClockProviderType } from '@studnicky/clock';

export type VirtualFileSystemOptionsType = {
  readonly 'clock'?: ClockProviderType;
  readonly 'seed'?: Map<string, string>;
};
