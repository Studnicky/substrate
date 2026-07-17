import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import {
  FetchClient,
  HttpMethods
} from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

const { fetch: fetchWithTimeout } = HttpMethods;

void describe('URL Error Scenarios', () => {
  let testUrl: string;

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void describe('Invalid baseURL configuration', () => {
    const invalidUrlScenarios = [
      {
        baseURL: '',
        description: 'empty string'
      },
      {
        baseURL: 'not-a-url',
        description: 'invalid URL format'
      },
      {
        baseURL: '://no-protocol',
        description: 'missing protocol'
      },
      {
        baseURL: 'http://',
        description: 'protocol only'
      },
      {
        baseURL: 123 as unknown as string,
        description: 'number instead of string'
      },
      {
        baseURL: {} as unknown as string,
        description: 'object instead of string'
      }
    ];

    for (const scenario of invalidUrlScenarios) {
      void it(`rejects baseURL with ${scenario.description}`, () => {
        assert.throws(
          () => {
            FetchClient.create({ baseURL: scenario.baseURL });
          },
          (error: Error) => {
            assert.ok(error.message.toLowerCase().includes('baseurl') || error.message.toLowerCase().includes('url'));

            return true;
          }
        );
      });
    }

    void it('accepts null baseURL (no base URL)', () => {
      assert.doesNotThrow(() => {
        FetchClient.create({ baseURL: null as unknown as string });
      });
    });

    void it('accepts custom protocol (treated as valid URI scheme)', () => {
      assert.doesNotThrow(() => {
        FetchClient.create({ baseURL: 'htp://invalid' });
      });
    });
  });

  void describe('Malformed request URLs', () => {
    void it('rejects empty URL in standalone fetch', async () => {
      await assert.rejects(
        async () => {
          await fetchWithTimeout('');
        },
        Error
      );
    });

    void it('handles URL with spaces', async () => {
      await assert.rejects(
        async () => {
          await fetchWithTimeout('http://invalid url with spaces.com/api');
        },
        (error: Error) => {
          assert.ok(error instanceof TypeError || error.message.includes('URL'));

          return true;
        }
      );
    });

    void it('rejects URL with only whitespace', async () => {
      await assert.rejects(
        async () => {
          await fetchWithTimeout('   ');
        },
        (error: Error) => {
          assert.ok(error instanceof TypeError || error.message.includes('URL'));

          return true;
        }
      );
    });
  });

  void describe('URL with special characters', () => {
    void it('handles URL with properly encoded spaces', async () => {
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get('/posts/1?query=hello%20world');

      assert.strictEqual(response.status, 200);
    });

    void it('handles URL with unicode characters', async () => {
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get('/posts/1?query=你好');

      assert.strictEqual(response.status, 200);
    });

    void it('handles URL with special query characters', async () => {
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get('/posts/1?query=test&foo=bar&baz=qux');

      assert.strictEqual(response.status, 200);
    });

    void it('handles URL with hash fragment', async () => {
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get('/posts/1#section');

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('Very long URLs', () => {
    void it('handles URL with long path (1KB)', async () => {
      const longPath = `/posts/1?${'x'.repeat(1024)}`;
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get(longPath);

      assert.ok(response.status === 200 || response.status === 404);
    });

    void it('handles URL with very long query string (2KB)', async () => {
      const longQuery = `/posts/1?data=${'x'.repeat(2048)}`;
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get(longQuery);

      assert.ok(response.status === 200 || response.status === 404);
    });

    void it('handles URL approaching 8KB limit', async () => {
      const longQuery = `/posts/1?data=${'x'.repeat(7000)}`;
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get(longQuery);

      assert.ok(response.status === 200 || response.status === 404);
    });
  });

  void describe('URL with authentication', () => {
    void it('handles URL with username and password', async () => {
      await assert.rejects(
        async () => {
          await fetchWithTimeout('http://user:pass@localhost:9999/api');
        },
        (error: Error) => {
          assert.ok(error.name.includes('Error'));

          return true;
        }
      );
    });

    void it('handles URL with username only', async () => {
      await assert.rejects(
        async () => {
          await fetchWithTimeout('http://user@localhost:9999/api');
        },
        (error: Error) => {
          assert.ok(error.name.includes('Error'));

          return true;
        }
      );
    });

    void it('handles URL with encoded credentials', async () => {
      await assert.rejects(
        async () => {
          await fetchWithTimeout('http://user%40email.com:pass%40123@localhost:9999/api');
        },
        (error: Error) => {
          assert.ok(error.name.includes('Error'));

          return true;
        }
      );
    });
  });

  void describe('Relative URLs with baseURL', () => {
    void it('resolves relative path with baseURL', async () => {
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get('/posts/1');

      assert.strictEqual(response.status, 200);
    });

    void it('resolves path without leading slash', async () => {
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get('posts/1');

      assert.strictEqual(response.status, 200);
    });

    void it('handles baseURL with trailing slash', async () => {
      const client = FetchClient.create({ baseURL: `${testUrl}/` });
      const response = await client.get('/posts/1');

      assert.strictEqual(response.status, 200);
    });

    void it('handles baseURL without trailing slash', async () => {
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get('posts/1');

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('Relative URLs without baseURL', () => {
    void it('rejects relative path without baseURL', async () => {
      await assert.rejects(
        async () => {
          await fetchWithTimeout('/posts/1');
        },
        (error: Error) => {
          assert.ok(error instanceof TypeError || error.message.includes('URL'));

          return true;
        }
      );
    });

    void it('rejects path without protocol or baseURL', async () => {
      await assert.rejects(
        async () => {
          await fetchWithTimeout('api/posts/1');
        },
        (error: Error) => {
          assert.ok(error instanceof TypeError || error.message.includes('URL'));

          return true;
        }
      );
    });
  });

  void describe('IPv6 URLs', () => {
    void it('handles IPv6 localhost format', async () => {
      await assert.rejects(
        async () => {
          await fetchWithTimeout('http://[::1]:9999/api');
        },
        (error: Error) => {
          assert.ok(error.name.includes('Error'));

          return true;
        }
      );
    });

    void it('handles full IPv6 address format', async () => {
      await assert.rejects(
        async () => {
          await fetchWithTimeout('http://[2001:db8::1]:9999/api');
        },
        (error: Error) => {
          assert.ok(error.name.includes('Error'));

          return true;
        }
      );
    });
  });

  void describe('Invalid protocols', () => {
    void it('rejects file:// protocol', async () => {
      await assert.rejects(
        async () => {
          await fetchWithTimeout('file:///etc/passwd');
        },
        (error: Error) => {
          assert.ok(error.message.includes('protocol') || error.message.includes('scheme') || error instanceof TypeError);

          return true;
        }
      );
    });

    void it('rejects ftp:// protocol', async () => {
      await assert.rejects(
        async () => {
          await fetchWithTimeout('ftp://example.com/file');
        },
        (error: Error) => {
          assert.ok(error.message.includes('protocol') || error.message.includes('scheme') || error instanceof TypeError);

          return true;
        }
      );
    });

    void it('rejects custom protocol', async () => {
      await assert.rejects(
        async () => {
          await fetchWithTimeout('custom://example.com/api');
        },
        (error: Error) => {
          assert.ok(error.message.includes('protocol') || error.message.includes('scheme') || error instanceof TypeError);

          return true;
        }
      );
    });
  });

  void describe('Complex query strings', () => {
    void it('handles query with array notation', async () => {
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get('/posts?ids[]=1&ids[]=2&ids[]=3');

      assert.strictEqual(response.status, 200);
    });

    void it('handles query with nested objects', async () => {
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get('/posts?filter[status]=active&filter[type]=post');

      assert.strictEqual(response.status, 200);
    });

    void it('handles query with special characters', async () => {
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get('/posts?search=hello+world&sort=name:asc');

      assert.strictEqual(response.status, 200);
    });

    void it('handles query with encoded special characters', async () => {
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get('/posts?email=user%40example.com&name=John%20Doe');

      assert.strictEqual(response.status, 200);
    });

    void it('handles empty query parameters', async () => {
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get('/posts?empty=&null&undefined');

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('Network errors for invalid hosts', () => {
    void it('throws network error for non-existent domain', async () => {
      await assert.rejects(
        async () => {
          await fetchWithTimeout('https://this-domain-definitely-does-not-exist-12345.com', { timeout: 5000 });
        },
        (error: Error) => {
          assert.ok(error.name.includes('Error'));

          return true;
        }
      );
    });

    void it('throws network error for connection refused', async () => {
      await assert.rejects(
        async () => {
          await fetchWithTimeout('http://127.0.0.1:1', { timeout: 5000 });
        },
        (error: Error) => {
          assert.ok(error.name.includes('Error'));

          return true;
        }
      );
    });

    void it('throws network error for unreachable host', async () => {
      await assert.rejects(
        async () => {
          await fetchWithTimeout('http://192.0.2.1:9999', { timeout: 2000 });
        },
        (error: Error) => {
          assert.ok(error.name.includes('Error'));

          return true;
        }
      );
    });
  });

  void describe('URL path edge cases', () => {
    void it('handles double slashes in path', async () => {
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get('//posts//1');

      assert.ok(response.status === 200 || response.status === 404);
    });

    void it('handles path with dot segments', async () => {
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get('/posts/./1/../1');

      assert.ok(response.status === 200 || response.status === 404);
    });

    void it('handles path with trailing slash', async () => {
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get('/posts/1/');

      assert.ok(response.status === 200 || response.status === 404);
    });

    void it('handles root path', async () => {
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get('/');

      assert.ok(response.status === 200 || response.status === 404);
    });
  });
});
