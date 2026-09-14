/**
 * Body-request options type
 */

import type { FetchOptionsInterface } from './FetchOptionsInterface.js';

/**
 * Request options for body-bearing operations before serialization.
 */
export interface BodyRequestOptionsInterface extends Omit<FetchOptionsInterface, 'body'> {
  /**
   * Pre-serialization body value. Objects and arrays are serialized as JSON; strings and
   * binary values are sent directly.
   */
  'body'?: unknown;
}
