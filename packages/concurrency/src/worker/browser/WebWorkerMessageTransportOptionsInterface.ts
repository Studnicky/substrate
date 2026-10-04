/** Decodes a Web Worker response at the message boundary. */
export interface WebWorkerMessageTransportOptionsInterface<TResponse> {
  readonly 'decode': (value: unknown) => TResponse;
}
