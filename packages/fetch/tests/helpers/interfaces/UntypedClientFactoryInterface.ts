/** A client factory whose `create` accepts any object, for feeding deliberately invalid configuration to the real factory. */
export interface UntypedClientFactoryInterface<TClient> {
  create(config: object): TClient;
}
