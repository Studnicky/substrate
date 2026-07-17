/**
 * Constants for error classification (matchers and the default HTTP classifier).
 */

export const EMPTY_LENGTH = 0;
export const EARLY_RETRY_THRESHOLD = 2;

// HTTP status codes used by classification matchers
// Status codes shared with the public HttpStatus map live in constants/index.ts
export const HTTP_CLIENT_ERROR_END = 499;
export const HTTP_CLIENT_ERROR_START = 400;
export const HTTP_INFORMATIONAL_END = 199;
export const HTTP_INFORMATIONAL_START = 100;
export const HTTP_REDIRECT_END = 399;
export const HTTP_REDIRECT_START = 300;
export const HTTP_REQUEST_TIMEOUT = 408;
export const HTTP_SERVER_ERROR_END = 599;
export const HTTP_SERVER_ERROR_START = 500;
export const HTTP_SUCCESS_END = 299;
export const HTTP_SUCCESS_START = 200;
