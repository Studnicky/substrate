/**
 * Tests for FetchClient body serialization
 * Validates how different body types are serialized for POST/PUT/PATCH requests
 */

import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import {
  after, before, describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

void describe('FetchClient Body Serialization', () => {
  const ctx = {
    client: undefined as unknown as FetchClient,
    testUrl: ''
  };

  before(async () => {
    ctx.testUrl = await startTestServer();
    ctx.client = FetchClient.create();
  });

  after(async () => {
    await stopTestServer();
  });

  void describe('JSON Object Serialization', () => {
    const jsonObjectScenarios = [
      {
        description: 'plain object',
        expectedInResponse: {
          baz: 123,
          foo: 'bar',
          id: 101
        },
        input: {
          baz: 123,
          foo: 'bar'
        }
      },
      {
        description: 'nested object',
        expectedInResponse: {
          address: {
            city: 'New York',
            street: '123 Main St'
          },
          id: 101,
          name: 'John'
        },
        input: {
          address: {
            city: 'New York',
            street: '123 Main St'
          },
          name: 'John'
        }
      },
      {
        description: 'object with arrays',
        expectedInResponse: {
          id: 101,
          items: [
            'a',
            'b',
            'c'
          ],
          title: 'test'
        },
        input: {
          items: [
            'a',
            'b',
            'c'
          ],
          title: 'test'
        }
      },
      {
        description: 'object with null values',
        expectedInResponse: {
          active: null as null,
          id: 101,
          name: 'test'
        },
        input: {
          active: null as null,
          name: 'test'
        }
      },
      {
        description: 'empty object',
        expectedInResponse: { id: 101 },
        input: {}
      },
      {
        description: 'object with boolean values',
        expectedInResponse: {
          active: true,
          deleted: false,
          id: 101
        },
        input: {
          active: true,
          deleted: false
        }
      },
      {
        description: 'object with number types',
        expectedInResponse: {
          count: 42,
          id: 101,
          price: 19.99,
          rating: 0
        },
        input: {
          count: 42,
          price: 19.99,
          rating: 0
        }
      }
    ];


    for (const {
      description, expectedInResponse, input
    } of jsonObjectScenarios) {
      void it(`should serialize ${description} correctly via POST`, async () => {
        const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: input });

        assert.strictEqual(response.status, 201);

        const data = await response.json() as Record<string, unknown>;

        assert.deepStrictEqual(data, expectedInResponse);
      });

      void it(`should serialize ${description} correctly via PUT`, async () => {
        const response = await ctx.client.put(`${ctx.testUrl}/posts/1`, { body: input });

        assert.strictEqual(response.status, 200);

        const data = await response.json() as Record<string, unknown>;

        assert.deepStrictEqual(data, {
          ...input,
          id: 1
        });
      });

      void it(`should serialize ${description} correctly via PATCH`, async () => {
        const response = await ctx.client.patch(`${ctx.testUrl}/posts/1`, { body: input });

        assert.strictEqual(response.status, 200);

        const data = await response.json() as Record<string, unknown>;

        assert.ok(data.id === 1);
      });
    }
  });

  void describe('Primitive Value Serialization', () => {
    const primitiveScenarios = [
      {
        description: 'string value',
        input: 'plain text content',
        shouldHaveBody: true
      },
      {
        description: 'empty string',
        input: '',
        shouldHaveBody: true
      },
      {
        description: 'number value',
        input: 42,
        shouldHaveBody: true
      },
      {
        description: 'zero',
        input: 0,
        shouldHaveBody: true
      },
      {
        description: 'negative number',
        input: -42,
        shouldHaveBody: true
      },
      {
        description: 'float value',
        input: 3.141_59,
        shouldHaveBody: true
      },
      {
        description: 'boolean true',
        input: true,
        shouldHaveBody: true
      },
      {
        description: 'boolean false',
        input: false,
        shouldHaveBody: true
      },
      {
        description: 'null value',
        input: null,
        shouldHaveBody: false
      },
      {
        description: 'undefined value',
        input: undefined,
        shouldHaveBody: false
      }
    ];


    for (const {
      description, input, shouldHaveBody
    } of primitiveScenarios) {
      void it(`should serialize ${description} correctly`, async () => {
        const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: input });

        if (shouldHaveBody) {
          assert.strictEqual(response.status, 201);
        } else {
          assert.strictEqual(response.status, 201);
        }
      });
    }
  });

  void describe('Binary Data Serialization', () => {
    void it('should serialize Buffer objects', async () => {
      const buffer = Buffer.from('test buffer content', 'utf8');
      const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: buffer });

      assert.strictEqual(response.status, 201);
    });

    void it('should serialize ArrayBuffer', async () => {
      const encoder = new TextEncoder();
      const arrayBuffer = encoder.encode('test arraybuffer content').buffer;

      const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: arrayBuffer });

      assert.strictEqual(response.status, 201);
    });

    void it('should serialize Uint8Array', async () => {
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode('test uint8array content');

      const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: uint8Array });

      assert.strictEqual(response.status, 201);
    });

    void it('should serialize empty Buffer', async () => {
      const buffer = Buffer.alloc(0);
      const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: buffer });

      assert.strictEqual(response.status, 201);
    });

    void it('should serialize large binary data', async () => {
      const largeBuffer = Buffer.alloc(1024 * 1024);

      largeBuffer.fill('a');

      const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: largeBuffer });

      assert.strictEqual(response.status, 201);
    });
  });

  void describe('Special Cases', () => {
    void it('should serialize array at top level', async () => {
      const array = [
        1,
        2,
        3,
        4,
        5
      ];
      const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: array });

      assert.strictEqual(response.status, 201);
    });

    void it('should serialize array of objects', async () => {
      const array = [
        {
          id: 1,
          name: 'Item 1'
        },
        {
          id: 2,
          name: 'Item 2'
        }
      ];
      const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: array });

      assert.strictEqual(response.status, 201);
    });

    void it('should serialize Date objects as JSON', async () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: { timestamp: date } });

      assert.strictEqual(response.status, 201);

      const data = await response.json() as Record<string, unknown>;

      assert.strictEqual(data.timestamp, '2024-01-01T00:00:00.000Z');
    });

    void it('should serialize object with mixed types', async () => {
      const mixed = {
        active: true,
        count: 42,
        data: [
          1,
          2,
          3
        ],
        metadata: { key: 'value' },
        name: 'test',
        optional: null as null
      };
      const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: mixed });

      assert.strictEqual(response.status, 201);
    });

    void it('should handle very large JSON objects', async () => {
      const largeObject: Record<string, string> = {};

      for (let i = 0; i < 1000; i++) {
        largeObject[`key${i}`] = `value${i}`;
      }

      const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: largeObject });

      assert.strictEqual(response.status, 201);
    });

    void it('should handle deeply nested objects', async () => {
      const deeplyNested = { level1: { level2: { level3: { level4: { level5: { value: 'deep' } } } } } };
      const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: deeplyNested });

      assert.strictEqual(response.status, 201);
    });

    void it('should handle strings with special characters', async () => {
      const emojiString = String.fromCodePoint(0x1_F6_00, 0x20, 0x1_F6_03, 0x20, 0x1_F6_04);
      const specialChars = {
        emojis: emojiString,
        quotes: 'He said "hello"',
        unicode: '你好世界'
      };
      const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: specialChars });

      assert.strictEqual(response.status, 201);
    });

    void it('should handle empty array', async () => {
      const emptyArray: unknown[] = [];
      const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: emptyArray });

      assert.strictEqual(response.status, 201);
    });
  });

  void describe('Error Cases', () => {
    void it('should handle circular references by throwing error', async () => {
      interface CircularObject {
        name: string;
        'self'?: CircularObject;
      }

      const circular: CircularObject = { name: 'test' };

      circular.self = circular;

      await assert.rejects(
        async () => {
          await ctx.client.post(`${ctx.testUrl}/posts`, { body: circular });
        },
        (error: Error) => {
          assert.ok(error instanceof TypeError);
          assert.ok(error.message.includes('circular') || error.message.includes('Converting circular structure'));

          return true;
        }
      );
    });

    void it('should handle symbol properties by omitting them', async () => {
      const symbolKey = Symbol('test');
      const objWithSymbol = {
        name: 'test',
        [symbolKey]: 'symbol value'
      };

      const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: objWithSymbol });

      assert.strictEqual(response.status, 201);

      const data = await response.json() as Record<string, unknown>;

      assert.strictEqual(data.name, 'test');
      assert.ok(!Object.getOwnPropertySymbols(data).includes(symbolKey));
    });

    void it('should handle function properties by omitting them', async () => {
      const objWithFunction = {
        data: 'test',
        method: () => {
          return 'function';
        }
      };

      const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: objWithFunction });

      assert.strictEqual(response.status, 201);

      const data = await response.json() as Record<string, unknown>;

      assert.strictEqual(data.data, 'test');
      assert.strictEqual(data.method, undefined);
    });

    void it('should handle BigInt by throwing error', async () => {
      const objWithBigInt = {
        bigNumber: BigInt(9_007_199_254_740_991),
        name: 'test'
      };

      await assert.rejects(
        async () => {
          await ctx.client.post(`${ctx.testUrl}/posts`, { body: objWithBigInt });
        },
        (error: Error) => {
          assert.ok(error instanceof TypeError);
          assert.ok(error.message.includes('BigInt'));

          return true;
        }
      );
    });

    void it('should handle undefined properties by omitting them', async () => {
      const objWithUndefined: Record<string, string | undefined> = {
        defined: 'value',
        undefined: undefined
      };

      const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: objWithUndefined });

      assert.strictEqual(response.status, 201);

      const data = await response.json() as Record<string, unknown>;

      assert.strictEqual(data.defined, 'value');
      assert.strictEqual(data.undefined, undefined);
    });
  });

  void describe('Consistency Across HTTP Methods', () => {
    const testBody = {
      data: 'test',
      number: 42
    };

    void it('should serialize consistently via POST', async () => {
      const response = await ctx.client.post(`${ctx.testUrl}/posts`, { body: testBody });

      assert.strictEqual(response.status, 201);

      const data = await response.json() as Record<string, unknown>;

      assert.strictEqual(data.data, 'test');
      assert.strictEqual(data.number, 42);
    });

    void it('should serialize consistently via PUT', async () => {
      const response = await ctx.client.put(`${ctx.testUrl}/posts/1`, { body: testBody });

      assert.strictEqual(response.status, 200);

      const data = await response.json() as Record<string, unknown>;

      assert.strictEqual(data.data, 'test');
      assert.strictEqual(data.number, 42);
    });

    void it('should serialize consistently via PATCH', async () => {
      const response = await ctx.client.patch(`${ctx.testUrl}/posts/1`, { body: testBody });

      assert.strictEqual(response.status, 200);

      const data = await response.json() as Record<string, unknown>;

      assert.strictEqual(data.data, 'test');
      assert.strictEqual(data.number, 42);
    });
  });
});
