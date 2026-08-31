/**
 * @packageDocumentation
 * Pluggable logging interface with transport architecture for Node.js.
 *
 * Correlation IDs (requestId, traceId, userId, orgId, teamId) are injected via
 * child loggers from async context, not from log-entry configuration.
 *
 * @example
 * ```typescript
 * import { ConsoleTransport, Logger, LogBody, LogFault, LOG_STATUS, MemoryTransport } from '@studnicky/logger';
 *
 * const logger = Logger.create({
 *   level: 'info',
 *   metadata: { service: 'api-layer' },
 *   transports: [ConsoleTransport.create()]
 * });
 *
 * // Normal log - all fields required: component, operation, status, message, context
 * const body = LogBody.create({
 *   component: 'graph',
 *   context: { resultCount: 42 },
 *   durationMs: 234,
 *   message: 'Query executed',
 *   operation: 'query',
 *   status: 'success'
 * });
 *
 * logger.info(body);
 *
 * const fault = LogFault.create({
 *   component: 'graph',
 *   context: { query: 'SELECT...' },
 *   durationMs: 30000,
 *   message: 'Query execution exceeded 30s limit',
 *   name: 'TimeoutError',
 *   operation: 'query',
 *   status: 'timeout'
 * });
 *
 * logger.error(fault);
 *
 * // Fan-out: console + memory capture for tests
 * const memory = MemoryTransport.create();
 * const testLogger = Logger.create({
 *   level: 'debug',
 *   transports: [ConsoleTransport.create({ level: 'warn' }), memory]
 * });
 * ```
 */

export { EVENT_COMPONENTS } from './constants/EVENT_COMPONENTS.js';
export { LOG_LEVEL } from './constants/LOG_LEVEL.js';
export {
  LOG_STATUS, STATUS_CATEGORIES
} from './constants/LOG_STATUS.js';
export { LogStatusEntity } from './entities/LogStatusEntity.js';
export { CircularReferenceError } from './errors/CircularReferenceError.js';
export { ConfigurationError } from './errors/ConfigurationError.js';
export { FileDestinationError } from './errors/FileDestinationError.js';
export { InvalidLogLevelError } from './errors/InvalidLogLevelError.js';
export { LogBuildError } from './errors/LogBuildError.js';
export { LoggerError } from './errors/LoggerError.js';
export { LogBody } from './modules/LogBody.js';
export { LogFault } from './modules/LogFault.js';
export { Logger } from './modules/Logger.js';
export { ParseLogLevel } from './modules/parseLogLevel.js';
export { ConsoleTransport } from './transports/ConsoleTransport.js';
export { FunctionTransport } from './transports/FunctionTransport.js';
export { MemoryTransport } from './transports/MemoryTransport.js';
export { NoOpTransport } from './transports/NoOpTransport.js';
export type { TransportInterface } from './transports/TransportInterface.js';
