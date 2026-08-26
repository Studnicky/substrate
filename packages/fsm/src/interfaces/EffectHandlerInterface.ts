export interface EffectHandlerInterface<TEffect, TEvent = never> {
  (effect: TEffect, dispatch: (event: TEvent) => void): Promise<void> | void;
}
