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

export {
  AbortError,
  BodySerializationError,
  BodyTimeoutError,
  ConfigurationError,
  ConnectTimeoutError,
  ConstructionError,
  DispatcherShutdownError,
  FetchBaseError,
  HeadersTimeoutError,
  HTTPError,
  InvalidUrlError,
  QueryEncodingError,
  RequestFailedError,
  SocketError,
  SocketExhaustionError,
  TimeoutError
} from './errors/index.js';
export type {
  BodyRequestOptionsInterface,
  ClientConfigInterface,
  FetchClientInterface,
  FetchOptionsInterface,
  QueryParametersInterface,
  RequestContextInterface,
  RequestIdGeneratorInterface,
  ResponseContextInterface,
  UndiciDispatcherInterface
} from './interfaces/index.js';
export { UrlQueryString } from './modules/UrlQueryString.js';
