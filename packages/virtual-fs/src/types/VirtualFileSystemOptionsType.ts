import type { ClockProviderType } from '@studnicky/clock';

// json-schema-uninexpressible: `clock` carries function-type fields (ClockProviderType.hrtime/now) and `seed` is a Map, neither of which is plain JSON-serializable data
export type VirtualFileSystemOptionsType = {
  'clock'?: ClockProviderType;
  'seed'?: Map<string, string>;
};
