/**
 * Phantom brand for the `contentMediaType` JSON Schema constraint keyword.
 * Carries the media-type literal so different media types are incompatible.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const CONTENT_MEDIA_TYPE: unique symbol;

export type ContentMediaTypeBrandType<M extends string> = IdentityType<{ [CONTENT_MEDIA_TYPE]: M }> & string;
