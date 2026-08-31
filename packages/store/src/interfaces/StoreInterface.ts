import type { StoreListenerInterface } from './StoreListenerInterface.js';

export interface StoreInterface<TState> {
  'clear': () => Promise<void>;
  'getSnapshot': () => TState;
  'hydrate': () => Promise<void>;
  'setState': (state: TState) => Promise<void>;
  'subscribe': (listener: StoreListenerInterface<TState>) => () => void;
  'update': (updater: (snapshot: TState) => TState) => Promise<void>;
}
