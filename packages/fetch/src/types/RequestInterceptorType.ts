import type { PipelineFnType } from '@studnicky/pipeline';

import type { RequestInterceptorContextType } from '../interfaces/RequestInterceptorContextType.js';

/**
 * Request interceptor function type
 *
 * Receives the request context, optionally transforms url, options, or metadata,
 * and returns the updated context. Multiple interceptors run as a pipeline in
 * registration order — client-level interceptors run before per-request ones.
 */
export type RequestInterceptorType = PipelineFnType<RequestInterceptorContextType>;
