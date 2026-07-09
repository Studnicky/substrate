export type EffectHandlerMapType<TEffect extends { 'variant': string }, TEvent = never> = {
  readonly [K in TEffect['variant']]?: (effect: Extract<TEffect, { 'variant': K }>, dispatch: (event: TEvent) => void) => void | Promise<void>;
};
