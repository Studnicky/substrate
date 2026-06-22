import type { PipelineFnType } from '@studnicky/pipeline';

import type { ResponseInterceptorContextType } from '../interfaces/ResponseInterceptorContextType.js';

/**
 * Response interceptor function type
 *
 * Receives the response context, optionally transforms the response or request
 * metadata, and returns the updated context. Multiple interceptors run as a
 * pipeline in registration order — client-level interceptors run before
 * per-request ones.
 */
export type ResponseInterceptorType = PipelineFnType<ResponseInterceptorContextType>;
