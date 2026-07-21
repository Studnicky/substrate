/**
 * @studnicky/fetch
 * HTTP fetch wrapper with timeout, lifecycle hooks, and configured clients
 *
 * Extends native fetch with:
 * - Built-in timeout support and abort controller management
 * - Subclass-overridable onRequest/onResponse lifecycle hooks for request and response transformation
 * - Configured client instances with default settings
 * - Query string utilities
 *
 * Public classes, errors, constants, and interface contracts are exported from
 * the package root.
 */

export { DEFAULT_DISPATCHER_CONFIG } from './constants/DEFAULT_DISPATCHER_CONFIG.js';
export { ClientConfigDataEntity } from './entities/ClientConfigDataEntity.js';
export { DestroyOptionsEntity } from './entities/DestroyOptionsEntity.js';
export { DispatcherConfigEntity } from './entities/DispatcherConfigEntity.js';
export { DispatcherHealthEntity } from './entities/DispatcherHealthEntity.js';
export { FetchRequestOptionsEntity } from './entities/FetchRequestOptionsEntity.js';
export { RequestEventEntity } from './entities/RequestEventEntity.js';
export { RequestMetadataEntity } from './entities/RequestMetadataEntity.js';
export { ResponseEventEntity } from './entities/ResponseEventEntity.js';
export { SocketDispatcherStatsEntity } from './entities/SocketDispatcherStatsEntity.js';
export {
  AbortError,
  BodyTimeoutError,
  ConfigurationError,
  ConnectTimeoutError,
  FetchBaseError,
  HeadersTimeoutError,
  HTTPError,
  SocketError,
  SocketExhaustionError,
  TimeoutError
} from './errors/index.js';
export type {
  BodyRequestOptionsInterface,
  ClientConfigInterface,
  FetchClientInterface,
  FetchOptionsInterface,
  QueryParamsInterface,
  RequestContextInterface,
  ResponseContextInterface,
  UndiciDispatcherInterface
} from './interfaces/index.js';
export { FetchClient } from './modules/FetchClient.js';
export { UndiciDispatcher } from './modules/UndiciDispatcher.js';
export { UrlUtils } from './modules/UrlUtils.js';
