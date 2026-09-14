export interface ContextConstructorInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}
