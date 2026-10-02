import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import type { RequestContextInterface } from '../../../src/interfaces/RequestContextInterface.js';
import type { ResponseContextInterface } from '../../../src/interfaces/ResponseContextInterface.js';

import { FetchClient } from '../../../src/node/index.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { RoutedFakeFetch } from '../../helpers/RoutedFakeFetch.js';
import { OverrideHooksScenarioCaseEntity } from './entities/OverrideHooksScenarioCaseEntity.js';
import scenarioGroups from './override-hooks.scenarios.json' with { 'type': 'json' };

class PipelineClient extends FetchClient {
  readonly log: string[] = [];

  protected override onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
    this.log.push('onRequest');
    const rewritten = Promise.resolve({
      ...context,
      'options': {
        ...context.options,
        'headers': { ...context.options.headers, 'X-Pipeline': 'request-stage' }
      }
    });
    return rewritten;
  }

  protected override onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
    this.log.push('onResponse');
    const passedThrough = Promise.resolve(context);
    return passedThrough;
  }
}

class MetadataClient extends FetchClient {
  readonly capturedRequestIds: string[] = [];

  protected override onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
    this.capturedRequestIds.push(context.request.requestId);
    const passedThrough = Promise.resolve(context);
    return passedThrough;
  }
}

class HeaderInjectClient extends FetchClient {
  protected override onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
    const rewritten = Promise.resolve({
      ...context,
      'options': {
        ...context.options,
        'headers': {
          ...context.options.headers,
          'X-Injected': 'hook-value'
        }
      }
    });
    return rewritten;
  }
}

class StrictClient extends FetchClient {
  protected override onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
    if (context.response.ok) {
      const passedThrough = Promise.resolve(context);
      return passedThrough;
    }
    throw RuntimeError.create(`HTTP error: ${String(context.response.status)}`);
  }
}

class ResponseWrapClient extends FetchClient {
  protected override async onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
    const body = await context.response.text();
    const wrapped = new Response(body, {
      'headers': {
        'Content-Type': 'application/json',
        'X-Transformed': 'yes'
      },
      'status': context.response.status
    });
    return { ...context, 'response': wrapped };
  }
}

class UrlRewriteClient extends FetchClient {
  readonly visitedUrls: string[] = [];

  protected override onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
    this.visitedUrls.push(context.url);
    const rewritten = Promise.resolve({ ...context, 'url': context.url.replace('/original-path', '/ok') });
    return rewritten;
  }
}

class OverrideHooksRunners {
  static async 'base-on-request'(scenarioCase: ScenarioCaseOfType<OverrideHooksScenarioCaseEntity.Type, 'base-on-request', 'operation'>): Promise<void> {
    using _ = RoutedFakeFetch.install();
    const client = FetchClient.create({ 'baseURL': scenarioCase.input.baseURL });

    try {
      const response = await client.get('/echo-headers');
      const headers = await OverrideHooksRunners.readHeaders(response);
      const headerName = scenarioCase.expected.header.toLowerCase();
      assert.strictEqual(response.status, 200);
      assert.strictEqual(headers.get(headerName), scenarioCase.expected.value === '__UNDEFINED__' ? undefined : scenarioCase.expected.value);
    } finally {
      await client.destroy();
    }
  }

  static async 'base-on-response'(scenarioCase: ScenarioCaseOfType<OverrideHooksScenarioCaseEntity.Type, 'base-on-response', 'operation'>): Promise<void> {
    using _ = RoutedFakeFetch.install();
    const client = FetchClient.create({ 'baseURL': scenarioCase.input.baseURL });

    try {
      const response = await client.get('/ok');
      const data = ScenarioValues.requireRecord(await response.json(), 'response body');
      assert.strictEqual(response.status, scenarioCase.expected.status);
      assert.strictEqual(ScenarioValues.requireString(data.value, 'response body value'), 'original');
      assert.strictEqual(response.headers.get('x-transformed'), null);
    } finally {
      await client.destroy();
    }
  }

  static async 'hook-pipeline'(scenarioCase: ScenarioCaseOfType<OverrideHooksScenarioCaseEntity.Type, 'hook-pipeline', 'operation'>): Promise<void> {
    using _ = RoutedFakeFetch.install();
    const client = PipelineClient.create({ 'baseURL': scenarioCase.input.baseURL });

    try {
      const response = await client.get('/echo-headers');
      const headers = await OverrideHooksRunners.readHeaders(response);
      assert.deepStrictEqual(client.log, scenarioCase.expected.entries);
      assert.strictEqual(headers.get('x-pipeline'), 'request-stage');
    } finally {
      await client.destroy();
    }
  }

  static async 'metadata'(scenarioCase: ScenarioCaseOfType<OverrideHooksScenarioCaseEntity.Type, 'metadata', 'operation'>): Promise<void> {
    using _ = RoutedFakeFetch.install();
    const client = MetadataClient.create({ 'baseURL': scenarioCase.input.baseURL });

    try {
      await client.get('/ok');
      assert.strictEqual(client.capturedRequestIds.length, scenarioCase.expected.count);
      assert.ok(typeof client.capturedRequestIds[0] === 'string' && client.capturedRequestIds[0].length > 0);
    } finally {
      await client.destroy();
    }
  }

  static async 'request-header-injection'(scenarioCase: ScenarioCaseOfType<OverrideHooksScenarioCaseEntity.Type, 'request-header-injection', 'operation'>): Promise<void> {
    using _ = RoutedFakeFetch.install();
    const client = HeaderInjectClient.create({ 'baseURL': scenarioCase.input.baseURL });

    try {
      const response = await client.get('/echo-headers');
      const headers = await OverrideHooksRunners.readHeaders(response);
      const headerName = scenarioCase.expected.header.toLowerCase();
      assert.strictEqual(response.status, 200);
      assert.strictEqual(headers.get(headerName), scenarioCase.expected.value === '__UNDEFINED__' ? undefined : scenarioCase.expected.value);
      assert.strictEqual(headers.has(headerName), true);
    } finally {
      await client.destroy();
    }
  }

  static async 'response-reject'(scenarioCase: ScenarioCaseOfType<OverrideHooksScenarioCaseEntity.Type, 'response-reject', 'operation'>): Promise<void> {
    using _ = RoutedFakeFetch.install();
    const client = StrictClient.create({ 'baseURL': scenarioCase.input.baseURL });

    try {
      const caught = await RejectionProbe.capture(async () => {
        await client.get('/nonexistent');
      });
      assert.ok(caught instanceof Error);
      const fragments = scenarioCase.expected.messageIncludes;
      for (let index = 0; index < fragments.length; index += 1) {
        assert.ok(caught.message.includes(fragments[index] ?? ''));
      }
    } finally {
      await client.destroy();
    }
  }

  static async 'response-wrap'(scenarioCase: ScenarioCaseOfType<OverrideHooksScenarioCaseEntity.Type, 'response-wrap', 'operation'>): Promise<void> {
    using _ = RoutedFakeFetch.install();
    const client = ResponseWrapClient.create({ 'baseURL': scenarioCase.input.baseURL });

    try {
      const response = await client.get('/ok');
      assert.strictEqual(response.status, scenarioCase.expected.status);
      assert.strictEqual(response.headers.get('x-transformed'), 'yes');
    } finally {
      await client.destroy();
    }
  }

  static async 'url-rewrite'(scenarioCase: ScenarioCaseOfType<OverrideHooksScenarioCaseEntity.Type, 'url-rewrite', 'operation'>): Promise<void> {
    using _ = RoutedFakeFetch.install();
    const client = UrlRewriteClient.create({ 'baseURL': scenarioCase.input.baseURL });

    try {
      const response = await client.get('/original-path');
      assert.strictEqual(response.status, 200);
      assert.ok(client.visitedUrls[0]?.includes('/original-path') === true);
      assert.deepStrictEqual(client.visitedUrls, scenarioCase.expected.entries);
      await response.arrayBuffer();
    } finally {
      await client.destroy();
    }
  }

  private static async readHeaders(response: Response): Promise<Map<string, string>> {
    const data = ScenarioValues.requireRecord(await response.json(), 'response body');
    const headers = ScenarioValues.requireRecord(ScenarioValues.requireProperty(data, 'headers', 'response body'), 'response body headers');
    const entries = Object.entries(headers);
    const result = new Map<string, string>();
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry !== undefined) {
        result.set(entry[0], String(entry[1]));
      }
    }
    return result;
  }
}

ScenarioSuite.registerBy('operation', {
  'entity': OverrideHooksScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'hook override behavior',
  'runners': OverrideHooksRunners
});
