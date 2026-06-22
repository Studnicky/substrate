export type EffectHandlerMapType<TEffect extends { 'variant': string }> = {
  readonly [K in TEffect['variant']]?: (effect: Extract<TEffect, { 'variant': K }>) => void | Promise<void>;
};
