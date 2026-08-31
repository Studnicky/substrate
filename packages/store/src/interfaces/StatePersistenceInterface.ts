export interface StatePersistenceInterface<TState> {
  'clear': (key: string) => Promise<void>;
  'load': (key: string) => Promise<TState | undefined>;
  'save': (key: string, state: TState) => Promise<void>;
}
