import type { RequestMetadataEntity } from '../entities/RequestMetadataEntity.js';
import type { FetchOptionsType } from './FetchOptionsType.js';

/**
 * Context passed to onRequest hook
 */
// json-schema-uninexpressible: embeds FetchOptionsType, whose body/dispatcher/json/signal fields carry unknown, ArrayBuffer, ReadableStream, and AbortSignal values not expressible in JSON Schema.
export type RequestContextType = {
  /**
   * Request metadata and tracking information
   */
  'metadata': RequestMetadataEntity.Type;

  /**
   * Fetch options
   */
  'options': FetchOptionsType;

  /**
   * Request URL
   */
  'url': string;
};
