export interface StoreListenerInterface<TState> {
  (snapshot: TState): Promise<void> | void;
}
