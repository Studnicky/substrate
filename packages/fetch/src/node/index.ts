/** Node.js HTTP client entrypoint with Undici pooling support. */

export { DEFAULT_DISPATCHER_CONFIG } from '../constants/DEFAULT_DISPATCHER_CONFIG.js';
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
} from '../errors/index.js';
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
} from '../interfaces/index.js';
export { FetchClient } from '../modules/FetchClient.js';
export { UndiciDispatcher } from '../modules/UndiciDispatcher.js';
export { UrlQueryString } from '../modules/UrlQueryString.js';
