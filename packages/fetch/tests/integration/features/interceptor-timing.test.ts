import type { RequestInterceptorType } from '../../../src/types/RequestInterceptorType.js';
import type { ResponseInterceptorType } from '../../../src/types/ResponseInterceptorType.js';

import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import {
  Timing, TimingEvent
} from '@studnicky/timing';
import { TIMING_STATUS } from '@studnicky/timing/builders';

import { FetchClient } from '../../../src/modules/FetchClient.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

/**
 * Demonstrates interceptor accumulation and timing through @studnicky/timing
 *
 * Shows:
 * - Multiple interceptors accumulating (not overwriting)
 * - Request interceptor for timing events
 * - Request interceptor for logging
 * - Response interceptor for timing events
 * - Response interceptor for logging
 */
void describe('Interceptor Accumulation with Timing', () => {
  let testUrl: string;

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void it('should accumulate multiple interceptors and track timing', async () => {
    const timing = Timing.builder()
      .maxEvents(100)
      .precision({ ms: 2 })
      .build();
    const logs: string[] = [];

    // Request interceptor 1: Add timing events
    const timingRequestInterceptor: RequestInterceptorType = ({
      metadata, options, url
    }) => {
      timing.event(TimingEvent.create()
        .component('request')
        .operation('start')
        .status(TIMING_STATUS.START)
        .build());

      return {
        metadata: {
          ...metadata,
          metadata: {
            ...metadata.metadata,
            timing: timing
          }
        },
        options,
        url
      };
    };

    // Request interceptor 2: Log request
    const loggingRequestInterceptor: RequestInterceptorType = ({
      metadata, options, url
    }) => {
      logs.push(`[REQUEST] ${metadata.method} ${url} - requestId: ${metadata.requestId}`);

      return {
        metadata,
        options,
        url
      };
    };

    // Response interceptor 1: Add timing event
    const timingResponseInterceptor: ResponseInterceptorType = ({
      request, response
    }) => {
      const requestTiming = request.metadata.timing as Timing;

      requestTiming.event(TimingEvent.create()
        .component('response')
        .operation('received')
        .status(TIMING_STATUS.COMPLETE)
        .build());

      return {
        request,
        response
      };
    };

    // Response interceptor 2: Log response
    const loggingResponseInterceptor: ResponseInterceptorType = ({
      request, response
    }) => {
      const requestTiming = request.metadata.timing as Timing;
      const events = requestTiming.getEvents();

      logs.push(`[RESPONSE] ${response.status} ${response.statusText} - requestId: ${request.requestId} - total: ${events.durationMs.toFixed(2)}ms`);

      return {
        request,
        response
      };
    };

    // Create client with interceptors that accumulate
    const client = FetchClient.create({
      baseURL: testUrl,
      requestInterceptor: [
        timingRequestInterceptor,
        loggingRequestInterceptor
      ],
      responseInterceptor: [
        timingResponseInterceptor,
        loggingResponseInterceptor
      ]
    });

    // Execute request
    const response = await client.get('/posts/1');

    // Verify response
    assert.strictEqual(response.status, 200);

    // Verify logs - all interceptors ran
    assert.strictEqual(logs.length, 2);
    assert.match(logs[0] ?? '', /\[REQUEST\] GET .* - requestId: /u);
    assert.match(logs[1] ?? '', /\[RESPONSE\] 200 OK - requestId: .* - total: /u);

    // Verify timing data
    const events = timing.getEvents();

    assert.ok(events.durationMs > 0, 'Total time should be greater than 0');
    assert.ok(Object.keys(events).length >= 3, 'Should have at least 3 events (durationMs + 2 custom)');
    assert.ok('request.start' in events || Object.keys(events).some((key) => {
      return key.startsWith('request.start');
    }), 'Should have request.start event');
  });

  void it('should accumulate interceptors from multiple sources', async () => {
    const timing = Timing.builder()
      .maxEvents(100)
      .precision({ ms: 2 })
      .build();
    const executionOrder: string[] = [];

    // Client-level interceptors
    const clientRequestInterceptor: RequestInterceptorType = ({
      metadata, options, url
    }) => {
      executionOrder.push('client-request');

      return {
        metadata: {
          ...metadata,
          metadata: {
            ...metadata.metadata,
            clientInterceptor: true,
            timing: timing
          }
        },
        options,
        url
      };
    };

    const clientResponseInterceptor: ResponseInterceptorType = ({
      request, response
    }) => {
      executionOrder.push('client-response');

      return {
        request,
        response
      };
    };

    // Per-request interceptors
    const requestRequestInterceptor: RequestInterceptorType = ({
      metadata, options, url
    }) => {
      executionOrder.push('request-request');

      const requestTiming = metadata.metadata.timing as Timing;

      requestTiming.event(TimingEvent.create()
        .component('interceptor')
        .operation('custom')
        .build());

      return {
        metadata,
        options,
        url
      };
    };

    const requestResponseInterceptor: ResponseInterceptorType = ({
      request, response
    }) => {
      executionOrder.push('request-response');

      return {
        request,
        response
      };
    };

    // Create client with client-level interceptors
    const client = FetchClient.create({
      baseURL: testUrl,
      requestInterceptor: clientRequestInterceptor,
      responseInterceptor: clientResponseInterceptor
    });

    // Execute with per-request interceptors
    await client.get('/posts/1', {
      requestInterceptor: requestRequestInterceptor,
      responseInterceptor: requestResponseInterceptor
    });

    // Verify all interceptors ran in correct order
    // Client-level request interceptor
    // Per-request request interceptor
    // Client-level response interceptor
    // Per-request response interceptor
    assert.deepStrictEqual(executionOrder, [
      'client-request',
      'request-request',
      'client-response',
      'request-response'
    ]);

    // Verify timing event was added
    const events = timing.getEvents();

    assert.ok('interceptor.custom' in events, 'Should have custom event from per-request interceptor');
  });

  void it('should accumulate interceptors via RequestBuilder', async () => {
    const timing = Timing.builder()
      .maxEvents(100)
      .precision({ ms: 2 })
      .build();
    const eventList: string[] = [];

    const interceptor1: RequestInterceptorType = ({
      metadata, options, url
    }) => {
      eventList.push('interceptor-1');

      return {
        metadata: {
          ...metadata,
          metadata: {
            ...metadata.metadata,
            timing: timing
          }
        },
        options,
        url
      };
    };

    const interceptor2: RequestInterceptorType = ({
      metadata, options, url
    }) => {
      eventList.push('interceptor-2');

      const requestTiming = metadata.metadata.timing as Timing;

      requestTiming.event(TimingEvent.create()
        .component('builder')
        .operation('event')
        .build());

      return {
        metadata,
        options,
        url
      };
    };

    const responseInterceptor: ResponseInterceptorType = ({
      request, response
    }) => {
      eventList.push('response-interceptor');

      const requestTiming = request.metadata.timing as Timing;

      requestTiming.event(TimingEvent.create()
        .component('response')
        .operation('event')
        .build());

      return {
        request,
        response
      };
    };

    const client = FetchClient.create({ baseURL: testUrl });

    // Use RequestBuilder to chain multiple interceptors
    // Should accumulate, not overwrite
    await client
      .request('/posts/1')
      .requestInterceptor(interceptor1)
      .requestInterceptor(interceptor2)
      .responseInterceptor(responseInterceptor)
      .get();

    // Verify all interceptors ran
    assert.deepStrictEqual(eventList, [
      'interceptor-1',
      'interceptor-2',
      'response-interceptor'
    ]);

    // Verify both timing events were added
    const events = timing.getEvents();

    assert.ok('builder.event' in events, 'Should have event from second request interceptor');
    assert.ok('response.event' in events, 'Should have event from response interceptor');
  });

  void it('should demonstrate practical timing and logging pattern', async () => {
    const timing = Timing.builder()
      .maxEvents(100)
      .precision({ ms: 2 })
      .build();
    const logs: Array<{ 'data'?: unknown
      level: string;
      message: string; }> = [];

    // Timing interceptor - adds timing events at key points
    const timingRequestInterceptor: RequestInterceptorType = ({
      metadata, options, url
    }) => {
      timing.event(TimingEvent.create()
        .component('request')
        .operation(`start.${metadata.path}`)
        .build());

      return {
        metadata: {
          ...metadata,
          metadata: {
            ...metadata.metadata,
            timing: timing
          }
        },
        options,
        url
      };
    };

    const timingResponseInterceptor: ResponseInterceptorType = ({
      request, response
    }) => {
      const requestTiming = request.metadata.timing as Timing;

      requestTiming.event(TimingEvent.create()
        .component('request')
        .operation(`complete.${request.path}`)
        .build());

      return {
        request,
        response
      };
    };

    // Logging interceptor - logs with timing data
    const loggingRequestInterceptor: RequestInterceptorType = ({
      metadata, options, url
    }) => {
      logs.push({
        data: {
          method: metadata.method,
          path: metadata.path,
          requestId: metadata.requestId
        },
        level: 'info',
        message: `Starting request to ${metadata.path}`
      });

      return {
        metadata,
        options,
        url
      };
    };

    const loggingResponseInterceptor: ResponseInterceptorType = ({
      request, response
    }) => {
      const requestTiming = request.metadata.timing as Timing;
      const events = requestTiming.getEvents();

      logs.push({
        data: {
          duration: events.durationMs,
          events: events,
          method: request.method,
          path: request.path,
          requestId: request.requestId,
          status: response.status
        },
        level: response.ok ? 'info' : 'error',
        message: `Completed request to ${request.path}`
      });

      return {
        request,
        response
      };
    };

    // Create client with all interceptors
    const client = FetchClient.create({
      baseURL: testUrl,
      requestInterceptor: [
        timingRequestInterceptor,
        loggingRequestInterceptor
      ],
      responseInterceptor: [
        timingResponseInterceptor,
        loggingResponseInterceptor
      ]
    });

    // Make multiple requests to demonstrate timing accumulation
    await client.get('/posts/1');
    await client.get('/posts/2');

    // Verify logging structure
    // 2 requests × 2 log entries each
    assert.strictEqual(logs.length, 4);

    // Verify request logs
    const firstLog = logs[0];
    const secondLog = logs[1];

    if (firstLog !== undefined) {
      assert.strictEqual(firstLog.level, 'info');
      assert.strictEqual(firstLog.message, 'Starting request to /posts/1');
      assert.ok(firstLog.data !== undefined);
    }

    // Verify response logs include timing
    if (secondLog !== undefined) {
      assert.strictEqual(secondLog.level, 'info');
      assert.strictEqual(secondLog.message, 'Completed request to /posts/1');
      if (secondLog.data !== undefined) {
        const logData = secondLog.data as { duration: number;
          events: Record<string, number> };

        assert.ok(logData.duration > 0);
        assert.ok(Object.keys(logData.events).length > 0);
      }
    }

    // Verify timing captured all events
    const events = timing.getEvents();
    const eventKeys = Object.keys(events);

    assert.ok(eventKeys.includes('request.start./posts/1'));
    assert.ok(eventKeys.includes('request.complete./posts/1'));
    assert.ok(eventKeys.includes('request.start./posts/2'));
    assert.ok(eventKeys.includes('request.complete./posts/2'));
  });
});
