/**
 * Reusable client configuration fixtures for tests
 */

import type { ClientConfigType } from '../../src/types/ClientConfigType.js';

export const basicClientConfig = {
  baseURL: 'https://api.example.com',
  headers: { 'User-Agent': 'test-agent' },
  timeout: 5000
} as const satisfies ClientConfigType;

export const clientConfigWithHeaders = {
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: 'Bearer test-token',
    'Content-Type': 'application/json',
    'X-Custom-Header': 'custom-value'
  }
} as const satisfies ClientConfigType;

export const clientConfigWithParams = {
  baseURL: 'https://api.example.com',
  params: {
    clientId: 'test-key',
    version: 'v1'
  }
} as const satisfies ClientConfigType;

export const clientConfigWithTimeout = {
  baseURL: 'https://api.example.com',
  timeout: 3000
} as const satisfies ClientConfigType;

export const clientConfigWithMetadata = {
  baseURL: 'https://api.example.com',
  metadata: {
    environment: 'test',
    service: 'test-service'
  }
} as const satisfies ClientConfigType;

export const clientConfigWithDispatcher = {
  baseURL: 'https://api.example.com',
  dispatcher: {
    connections: 20,
    pipelining: 10
  }
} as const satisfies ClientConfigType;

export const clientConfigComplete = {
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: 'Bearer test-token',
    'Content-Type': 'application/json'
  },
  metadata: {
    environment: 'test',
    service: 'test-service'
  },
  params: { clientId: 'test-key' },
  timeout: 5000
} as const satisfies ClientConfigType;
