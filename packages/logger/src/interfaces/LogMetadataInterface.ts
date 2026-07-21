/** Readonly view of arbitrary metadata attached to log records. */
export interface LogMetadataInterface {
  readonly [key: string]: unknown;
}
