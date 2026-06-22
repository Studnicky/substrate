/**
 * Metadata object attached to log entries
 *
 * Supports arbitrary key-value pairs for contextual information such as
 * request IDs, user IDs, service names, or any other structured data.
 *
 * @example
 * ```typescript
 * const metadata: LogMetadata = {
 *   requestId: 'abc-123',
 *   userId: 'user-456',
 *   service: 'api-gateway'
 * };
 *
 * const logger = ConsoleLogger.create({ metadata });
 * ```
 */
export type LogMetadataType = Record<string, unknown>;
