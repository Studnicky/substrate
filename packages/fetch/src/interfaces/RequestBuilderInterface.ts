/**
 * RequestBuilder interface type
 */

import type { FetchOptionsType } from '../types/FetchOptionsType.js';
import type { QueryValueType } from '../types/QueryValueType.js';

/**
 * Interface for fluent request builder for chaining request configuration
 */
export interface RequestBuilderInterface {
  body(body: unknown): this;
  cache(value: Exclude<FetchOptionsType['cache'], undefined>): this;
  credentials(value: Exclude<FetchOptionsType['credentials'], undefined>): this;
  delete(): Promise<Response>;
  dispatcher(value: Exclude<FetchOptionsType['dispatcher'], undefined>): this;
  get(): Promise<Response>;
  head(): Promise<Response>;
  header(name: string, value: string): this;
  headers(headers: Record<string, string>): this;
  integrity(value: Exclude<FetchOptionsType['integrity'], undefined>): this;
  json(data: unknown): this;
  keepalive(value: Exclude<FetchOptionsType['keepalive'], undefined>): this;
  metadata(metadata: Record<string, unknown>): this;
  options(): Promise<Response>;
  patch(): Promise<Response>;
  post(): Promise<Response>;
  put(): Promise<Response>;
  queryString(key: string, value: QueryValueType | QueryValueType[]): this;
  redirect(value: Exclude<FetchOptionsType['redirect'], undefined>): this;
  referrer(value: Exclude<FetchOptionsType['referrer'], undefined>): this;
  referrerPolicy(value: Exclude<FetchOptionsType['referrerPolicy'], undefined>): this;
  requestId(id: string): this;
  signal(signal: AbortSignal): this;
  timeout(ms: number): this;
}
