/** Generates the correlation identifier assigned to a request. */
export interface RequestIdGeneratorInterface {
  (): string;
}
