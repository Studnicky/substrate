/** Node.js HTTP client entrypoint with Undici pooling support. */

export { DEFAULT_DISPATCHER_CONFIG } from '../constants/DEFAULT_DISPATCHER_CONFIG.js';

export * from '../index.js';
export { FetchClient } from '../modules/FetchClient.js';
export { UndiciDispatcher } from '../modules/UndiciDispatcher.js';
