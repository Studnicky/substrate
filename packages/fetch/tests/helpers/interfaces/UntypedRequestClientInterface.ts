/** A client whose `get` accepts any URL and options, for feeding deliberately invalid request input to the real client. */
export interface UntypedRequestClientInterface {
  get(url: unknown, options?: unknown): Promise<Response>;
}
