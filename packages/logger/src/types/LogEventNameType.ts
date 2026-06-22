/**
 * Event name type for structured logging.
 *
 * Events follow the `component.operation` pattern, enabling filtering
 * at any level of granularity (e.g. in CloudWatch Logs Insights).
 *
 * @example
 * ```typescript
 * import type { LogEventNameType } from '@studnicky/logger/types';
 *
 * const event: LogEventNameType = 'db.query';
 * const customEvent: LogEventNameType = 'myModule.customOp';
 * ```
 *
 * @example CloudWatch filtering
 * ```sql
 * filter event like /^db\./
 * filter event = 'cache.get'
 * ```
 */
export type LogEventNameType = string;

/**
 * Create a properly formatted event string.
 *
 * @param component - The component prefix
 * @param operation - The operation name
 * @returns Formatted event string as `component.operation`
 *
 * @example
 * ```typescript
 * const event = createEventName('cache', 'get');
 * // Returns: 'cache.get'
 * ```
 */
export function createEventName(component: string, operation: string): LogEventNameType {
  const result = `${component}.${operation}`;
  return result;
}

/**
 * Parse an event string into component and operation.
 *
 * @param event - The event string to parse
 * @returns Object with component and operation
 *
 * @example
 * ```typescript
 * const { component, operation } = parseEventName('graph.query');
 * // component: 'graph', operation: 'query'
 * ```
 */
export function parseEventName(event: LogEventNameType): { 'component': string; 'operation': string } {
  const dotIndex = event.indexOf('.');

  if (dotIndex === -1) {
    return { 'component': event, 'operation': '' };
  }

  return {
    'component': event.slice(0, dotIndex),
    'operation': event.slice(dotIndex + 1)
  };
}
