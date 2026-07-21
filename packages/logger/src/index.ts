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
export { LOG_FIELDS } from './constants/LOG_FIELDS.js';
export { LOG_LEVEL_MAP } from './constants/LOG_LEVEL_MAP.js';
export { LOG_LEVEL } from './constants/LOG_LEVEL.js';
export { LOG_STATUS, STATUS_CATEGORIES } from './constants/LOG_STATUS.js';
export { CloudWatchLogSchemaFieldsEntity } from './entities/CloudWatchLogSchemaFieldsEntity.js';
export { ConsoleTransportOptionsEntity } from './entities/ConsoleTransportOptionsEntity.js';
export { CoreLogFieldsEntity } from './entities/CoreLogFieldsEntity.js';
export { CorrelationFieldsEntity } from './entities/CorrelationFieldsEntity.js';
export { ErrorFieldsEntity } from './entities/ErrorFieldsEntity.js';
export { EventComponentEntity } from './entities/EventComponentEntity.js';
export { FailureStatusEntity } from './entities/FailureStatusEntity.js';
export { FunctionTransportOptionsEntity } from './entities/FunctionTransportOptionsEntity.js';
export { LifecycleStatusEntity } from './entities/LifecycleStatusEntity.js';
export { LogBodyConfigEntity } from './entities/LogBodyConfigEntity.js';
export { LogBodyDataEntity } from './entities/LogBodyDataEntity.js';
export { LogDataEntity } from './entities/LogDataEntity.js';
export { LogFaultConfigEntity } from './entities/LogFaultConfigEntity.js';
export { LogFaultDataEntity } from './entities/LogFaultDataEntity.js';
export { LoggerHookEventKindEntity } from './entities/LoggerHookEventKindEntity.js';
export { LoggerOptionsEntity } from './entities/LoggerOptionsEntity.js';
export { LogLevelEntity } from './entities/LogLevelEntity.js';
export { LogLevelNameEntity } from './entities/LogLevelNameEntity.js';
export { LogRecordEntity } from './entities/LogRecordEntity.js';
export { LogStatusEntity } from './entities/LogStatusEntity.js';
export { MemoryTransportOptionsEntity } from './entities/MemoryTransportOptionsEntity.js';
export { SuccessStatusEntity } from './entities/SuccessStatusEntity.js';
export { TimingFieldsEntity } from './entities/TimingFieldsEntity.js';
export { CircularReferenceError } from './errors/CircularReferenceError.js';
export { ConfigurationError } from './errors/ConfigurationError.js';
export { FileDestinationError } from './errors/FileDestinationError.js';
export { InvalidLogLevelError } from './errors/InvalidLogLevelError.js';
export { LogBuildError } from './errors/LogBuildError.js';
export { LoggerError } from './errors/LoggerError.js';
export type { CorrelationMetadataInterface } from './interfaces/CorrelationMetadataInterface.js';
export type { ErrorMetadataInterface } from './interfaces/ErrorMetadataInterface.js';
export type { LoggerInterface } from './interfaces/LoggerInterface.js';
export type { LoggerOptionsInterface } from './interfaces/LoggerOptionsInterface.js';
export type { LogLevelOptionsInterface } from './interfaces/LogLevelOptionsInterface.js';
export type { LogMetadataInterface } from './interfaces/LogMetadataInterface.js';
export type { LogSchemaInterface } from './interfaces/LogSchemaInterface.js';
export type { OperationLogMetadataInterface } from './interfaces/OperationLogMetadataInterface.js';
export type { RequestLogMetadataInterface } from './interfaces/RequestLogMetadataInterface.js';
export type { TimingMetadataInterface } from './interfaces/TimingMetadataInterface.js';
export { LogBody } from './modules/LogBody.js';
export { LogFault } from './modules/LogFault.js';
export { Logger } from './modules/Logger.js';
export { ParseLogLevel } from './modules/parseLogLevel.js';
export { SafeStringify } from './modules/safeStringify.js';
export { ConsoleTransport } from './transports/ConsoleTransport.js';
export { FunctionTransport } from './transports/FunctionTransport.js';
export { MemoryTransport } from './transports/MemoryTransport.js';
export { NoOpTransport } from './transports/NoOpTransport.js';
export type { TransportInterface } from './transports/TransportInterface.js';
