import type { FetchOptionsInterface } from '../interfaces/FetchOptionsInterface.js';

import { RequestInitFieldNameEntity } from '../entities/RequestInitFieldNameEntity.js';

interface EncodedRequestInterface {
  readonly 'dispatcher': FetchOptionsInterface['dispatcher'];
  readonly 'requestInit': Record<string, unknown>;
  readonly 'signal': FetchOptionsInterface['signal'];
  readonly 'timeout': FetchOptionsInterface['timeout'];
}

interface RequestInitFieldCopierInterface {
  (options: FetchOptionsInterface, requestInit: Record<string, unknown>): void;
}

/** `body` is native-opaque: no schema or guard validates it, `fetch()` itself does. */
class RequestInitFieldProjection {
  static copyBody(options: FetchOptionsInterface, requestInit: Record<string, unknown>): void {
    if (options.body !== undefined) { requestInit.body = options.body; }
  }
  static copyCache(options: FetchOptionsInterface, requestInit: Record<string, unknown>): void {
    if (options.cache !== undefined) { requestInit.cache = options.cache; }
  }
  static copyCredentials(options: FetchOptionsInterface, requestInit: Record<string, unknown>): void {
    if (options.credentials !== undefined) { requestInit.credentials = options.credentials; }
  }
  static copyDuplex(options: FetchOptionsInterface, requestInit: Record<string, unknown>): void {
    if (options.duplex !== undefined) { requestInit.duplex = options.duplex; }
  }
  static copyHeaders(options: FetchOptionsInterface, requestInit: Record<string, unknown>): void {
    if (options.headers !== undefined) { requestInit.headers = options.headers; }
  }
  static copyIntegrity(options: FetchOptionsInterface, requestInit: Record<string, unknown>): void {
    if (options.integrity !== undefined) { requestInit.integrity = options.integrity; }
  }
  static copyKeepalive(options: FetchOptionsInterface, requestInit: Record<string, unknown>): void {
    if (options.keepalive !== undefined) { requestInit.keepalive = options.keepalive; }
  }
  static copyMethod(options: FetchOptionsInterface, requestInit: Record<string, unknown>): void {
    if (options.method !== undefined) { requestInit.method = options.method; }
  }
  static copyMode(options: FetchOptionsInterface, requestInit: Record<string, unknown>): void {
    if (options.mode !== undefined) { requestInit.mode = options.mode; }
  }
  static copyRedirect(options: FetchOptionsInterface, requestInit: Record<string, unknown>): void {
    if (options.redirect !== undefined) { requestInit.redirect = options.redirect; }
  }
  static copyReferrer(options: FetchOptionsInterface, requestInit: Record<string, unknown>): void {
    if (options.referrer !== undefined) { requestInit.referrer = options.referrer; }
  }
  static copyReferrerPolicy(options: FetchOptionsInterface, requestInit: Record<string, unknown>): void {
    if (options.referrerPolicy !== undefined) { requestInit.referrerPolicy = options.referrerPolicy; }
  }
  static copyWindow(options: FetchOptionsInterface, requestInit: Record<string, unknown>): void {
    if (options.window !== undefined) { requestInit.window = options.window; }
  }
}

class RequestInitFieldCopierMap {
  /** Rejects the entries tuple unless it covers every declared field name. */
  public static build<TEntries extends readonly (readonly [RequestInitFieldNameEntity.Type, RequestInitFieldCopierInterface])[]>(
    entries: (Exclude<RequestInitFieldNameEntity.Type, TEntries[number][0]> extends never ? unknown : never) & TEntries
  ): ReadonlyMap<RequestInitFieldNameEntity.Type, RequestInitFieldCopierInterface> {
    const result = new Map<RequestInitFieldNameEntity.Type, RequestInitFieldCopierInterface>(entries);
    return result;
  }
}

const REQUEST_INIT_FIELD_COPIERS = RequestInitFieldCopierMap.build([
  ['body', RequestInitFieldProjection.copyBody],
  ['cache', RequestInitFieldProjection.copyCache],
  ['credentials', RequestInitFieldProjection.copyCredentials],
  ['duplex', RequestInitFieldProjection.copyDuplex],
  ['headers', RequestInitFieldProjection.copyHeaders],
  ['integrity', RequestInitFieldProjection.copyIntegrity],
  ['keepalive', RequestInitFieldProjection.copyKeepalive],
  ['method', RequestInitFieldProjection.copyMethod],
  ['mode', RequestInitFieldProjection.copyMode],
  ['redirect', RequestInitFieldProjection.copyRedirect],
  ['referrer', RequestInitFieldProjection.copyReferrer],
  ['referrerPolicy', RequestInitFieldProjection.copyReferrerPolicy],
  ['window', RequestInitFieldProjection.copyWindow]
] as const);

/** Projects request options into a fetch-standard RequestInit, separating the runtime-only control fields. */
export class RequestInitEncoder {
  public static encode(options: FetchOptionsInterface): EncodedRequestInterface {
    const requestInit: Record<string, unknown> = {};
    const fieldNames = RequestInitFieldNameEntity.Schema.enum;
    const fieldCount = fieldNames.length;
    for (let index = 0; index < fieldCount; index += 1) {
      const name = fieldNames[index];
      const copier = name === undefined ? undefined : REQUEST_INIT_FIELD_COPIERS.get(name);
      if (copier !== undefined) {
        copier(options, requestInit);
      }
    }
    const result: EncodedRequestInterface = {
      'dispatcher': options.dispatcher,
      'requestInit': requestInit,
      'signal': options.signal,
      'timeout': options.timeout
    };
    return result;
  }
}
