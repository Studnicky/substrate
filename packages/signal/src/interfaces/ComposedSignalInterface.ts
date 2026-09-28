/** Disposable result returned by Signal.compose(). */
export interface ComposedSignalInterface {
  [Symbol.dispose](): void;
  dispose(): void;
  readonly 'signal': AbortSignal;
}
