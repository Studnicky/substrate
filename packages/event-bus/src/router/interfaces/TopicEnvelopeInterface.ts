export interface TopicEnvelopeInterface<TPayload> {
  readonly 'metadata': unknown;
  readonly 'payload': TPayload;
  readonly 'selection': { readonly 'origin': string; readonly 'scores': Readonly<Record<string, number>> };
  readonly 'subscription': { readonly 'attributes': unknown; readonly 'id': string; readonly 'pattern': string };
  readonly 'topic': string;
}
