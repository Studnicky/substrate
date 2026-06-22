/**
 * @packageDocumentation
 * Pluggable logging interface with Pino wrapper, child loggers, and metadata support.
 *
 * Correlation IDs (requestId, traceId, userId, orgId, teamId) are injected via
 * child loggers from async context, not from the LogBody/LogFault builders.
 *
 * @example
 * ```typescript
 * import { PinoLogger, LogBody, LogFault } from '@studnicky/logger';
 * import type { LogStatusType } from '@studnicky/logger/types';
 * import { LOG_STATUS } from '@studnicky/logger/constants';
 *
 * const logger = PinoLogger.create({ metadata: { service: 'api-layer' } });
 *
 * // Normal log - all fields required: component, operation, status, message, context
 * const body = LogBody.create()
 *   .component('graph')
 *   .operation('query')
 *   .status('success')
 *   .message('Query executed')
 *   .context({ resultCount: 42 })
 *   .duration(234)
 *   .build();
 *
 * logger.info(body);
 *
 * // Error - use LogFault builder (requires: component, operation, status, name, message, context)
 * const fault = LogFault.create()
 *   .component('graph')
 *   .operation('query')
 *   .status('timeout')
 *   .name('TimeoutError')
 *   .message('Query execution exceeded 30s limit')
 *   .context({ query: 'SELECT...' })
 *   .duration(30000)
 *   .build();
 *
 * logger.error(fault);
 *
 * // Error from caught exception
 * try {
 *   await executeQuery();
 * } catch (err) {
 *   const fault = LogFault.create()
 *     .component('graph')
 *     .operation('query')
 *     .status('failed')
 *     .fromError(err)
 *     .context({})
 *     .build();
 *
 *   logger.error(fault);
 * }
 * ```
 */

export { ConsoleLogger } from './modules/ConsoleLogger.js';
export { ConsoleLoggerBuilder } from './modules/ConsoleLoggerBuilder.js';
export { FanOutLogger } from './modules/FanOutLogger.js';
export { isCloudEnvironment } from './modules/isCloudEnvironment.js';
export { LogBody } from './modules/LogBody.js';
export { LogFault } from './modules/LogFault.js';
export { NoOpLogger } from './modules/NoOpLogger.js';
export { parseLogLevel } from './modules/parseLogLevel.js';
export { PinoLogger } from './modules/PinoLogger.js';
export { PinoLoggerBuilder } from './modules/PinoLoggerBuilder.js';
export { safeStringify } from './modules/safeStringify.js';
export { SpyLogger } from './modules/SpyLogger.js';
