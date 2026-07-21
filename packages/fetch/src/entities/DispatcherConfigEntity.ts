import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/**
 * HTTP Dispatcher configuration
 *
 * Configures connection reuse to prevent socket exhaustion when making
 * many requests to the same endpoint (e.g., graph databases, APIs).
 *
 * Implementation uses undici (Node.js's high-performance HTTP client).
 * Connection scheduling uses LIFO (Last-In-First-Out) to concentrate
 * reuse on recently-used sockets, allowing idle connections to timeout naturally.
 */
export namespace DispatcherConfigEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/DispatcherConfig',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'HTTP dispatcher connection pooling configuration',
    'properties': {
      'allowH2': {
        'description': 'Enable HTTP/2 support if server prioritizes it through ALPN negotiation',
        'type': 'boolean'
      },
      'autoSelectFamily': {
        'description': 'Enable IPv4/IPv6 family autodetection (RFC 8305 "Happy Eyeballs")',
        'type': 'boolean'
      },
      'autoSelectFamilyAttemptTimeout': {
        'description': 'Timeout for autoSelectFamily attempts in milliseconds',
        'minimum': 0,
        'type': 'number'
      },
      'bodyTimeout': {
        'description': 'Body timeout in milliseconds - time between receiving body data chunks. Use 0 to disable',
        'minimum': 0,
        'type': 'number'
      },
      'clientTtl': {
        'description': 'Time-to-live for pooled clients in milliseconds',
        'minimum': 0,
        'type': 'number'
      },
      'connections': {
        'description': 'Number of connections in the pool (per origin). null means no limit',
        'type': ['integer', 'null']
      },
      'connectTimeout': {
        'description': 'Connection timeout in milliseconds',
        'minimum': 0,
        'type': 'number'
      },
      'enabled': {
        'description': 'Activate HTTP connection pooling',
        'type': 'boolean'
      },
      'headersTimeout': {
        'description': 'Headers timeout in milliseconds - time to wait for complete HTTP headers',
        'minimum': 0,
        'type': 'number'
      },
      'keepAliveMaxTimeout': {
        'description': 'Maximum keep-alive timeout when overridden by server hints (milliseconds)',
        'minimum': 0,
        'type': 'number'
      },
      'keepAliveTimeout': {
        'description': 'Keep-alive timeout in milliseconds - time before idle socket times out',
        'minimum': 0,
        'type': 'number'
      },
      'keepAliveTimeoutThreshold': {
        'description': 'Buffer time subtracted from server keep-alive hints (milliseconds)',
        'minimum': 0,
        'type': 'number'
      },
      'localAddress': {
        'description': 'Local network address to bind connections to',
        'minLength': 1,
        'type': 'string'
      },
      'maxConcurrentStreams': {
        'description': 'Maximum concurrent H2 streams per connection',
        'minimum': 1,
        'type': 'integer'
      },
      'maxHeaderSize': {
        'description': 'Maximum request header size in bytes',
        'minimum': 1,
        'type': 'integer'
      },
      'maxOrigins': {
        'description': 'Maximum number of origins (hosts) the Agent can manage',
        'minimum': 1,
        'type': 'integer'
      },
      'maxRequestsPerClient': {
        'description': 'Maximum number of requests per client connection before rotation',
        'minimum': 1,
        'type': 'integer'
      },
      'maxResponseSize': {
        'description': 'Maximum response body size in bytes (-1 = unlimited)',
        'minimum': -1,
        'type': 'integer'
      },
      'pipelining': {
        'description': 'HTTP/1.1 pipelining factor - number of concurrent requests per connection',
        'minimum': 0,
        'type': 'integer'
      },
      'strictContentLength': {
        'description': 'Enforce strict Content-Length header validation',
        'type': 'boolean'
      }
    },
    'title': 'DispatcherConfig',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
