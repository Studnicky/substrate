/**
 * Phantom brand for the `contentEncoding` JSON Schema constraint keyword.
 * Carries the encoding literal so different encodings are incompatible.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const CONTENT_ENCODING: unique symbol;

export type ContentEncodingBrandType<E extends string> = IdentityType<{ [CONTENT_ENCODING]: E }> & string;
