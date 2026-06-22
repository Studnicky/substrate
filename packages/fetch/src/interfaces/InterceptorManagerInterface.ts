import type { RequestInterceptorType } from '../types/RequestInterceptorType.js';
import type { ResponseInterceptorType } from '../types/ResponseInterceptorType.js';
import type { RequestInterceptorContextType } from './RequestInterceptorContextType.js';
import type { ResponseInterceptorContextType } from './ResponseInterceptorContextType.js';


/**
 * Interface for managing request and response interceptors
 */
export interface InterceptorManagerInterface {
  addRequestInterceptor(interceptor: RequestInterceptorType): () => void;
  addResponseInterceptor(interceptor: ResponseInterceptorType): () => void;
  applyRequestInterceptors(
    context: RequestInterceptorContextType
  ): Promise<RequestInterceptorContextType>;
  applyResponseInterceptors(
    context: ResponseInterceptorContextType
  ): Promise<ResponseInterceptorContextType>;
  clearAll(): void;
  clearRequestInterceptors(): void;
  clearResponseInterceptors(): void;
  readonly 'requestInterceptors': readonly RequestInterceptorType[];
  readonly 'responseInterceptors': readonly ResponseInterceptorType[];
}
