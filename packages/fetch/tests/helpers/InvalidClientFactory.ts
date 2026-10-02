import type { UntypedClientFactoryInterface } from './interfaces/UntypedClientFactoryInterface.js';

import { BrowserFetchClient } from '../../src/browser/index.js';
import { FetchClient } from '../../src/node/index.js';

/** Builds clients from configuration the library's own types would reject, so a test can prove the runtime validation. */
export class InvalidClientFactory {
  static create(config: object): FetchClient {
    const factory: UntypedClientFactoryInterface<FetchClient> = FetchClient;
    const client = factory.create(config);
    return client;
  }

  static createWith<TClient extends FetchClient>(factory: UntypedClientFactoryInterface<TClient>, config: object): TClient {
    const client = factory.create(config);
    return client;
  }

  static createBrowser(config: object): BrowserFetchClient {
    const factory: UntypedClientFactoryInterface<BrowserFetchClient> = BrowserFetchClient;
    const client = factory.create(config);
    return client;
  }
}
