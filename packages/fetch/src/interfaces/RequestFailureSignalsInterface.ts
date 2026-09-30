/** The signals composed for one request, consulted when classifying its failure. */
export interface RequestFailureSignalsInterface {
  readonly 'externalSignal': AbortSignal | null | undefined;
  readonly 'requestSignal': AbortSignal | undefined;
  readonly 'timeoutMs': number | undefined;
}
