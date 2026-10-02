/**
 * Reusable client configuration fixtures for tests
 */

import type { ClientConfigInterface } from '../../src/interfaces/ClientConfigInterface.js';

export const BASIC_CLIENT_CONFIG = {
  'baseURL': 'https://api.example.com',
  'headers': { 'User-Agent': 'test-agent' },
  'timeout': 5000
} as const satisfies ClientConfigInterface;

export const CLIENT_CONFIG_WITH_HEADERS = {
  'baseURL': 'https://api.example.com',
  'headers': {
    'Authorization': 'Bearer test-token',
    'Content-Type': 'application/json',
    'X-Custom-Header': 'custom-value'
  }
} as const satisfies ClientConfigInterface;

export const CLIENT_CONFIG_WITH_PARAMETERS = {
  'baseURL': 'https://api.example.com',
  'parameters': {
    'clientId': 'test-key',
    'version': 'v1'
  }
} as const satisfies ClientConfigInterface;

export const CLIENT_CONFIG_WITH_TIMEOUT = {
  'baseURL': 'https://api.example.com',
  'timeout': 3000
} as const satisfies ClientConfigInterface;

export const CLIENT_CONFIG_WITH_METADATA = {
  'baseURL': 'https://api.example.com',
  'metadata': {
    'environment': 'test',
    'service': 'test-service'
  }
} as const satisfies ClientConfigInterface;

export const CLIENT_CONFIG_WITH_DISPATCHER = {
  'baseURL': 'https://api.example.com',
  'dispatcher': {
    'connections': 20,
    'pipelining': 10
  }
} as const satisfies ClientConfigInterface;

export const CLIENT_CONFIG_COMPLETE = {
  'baseURL': 'https://api.example.com',
  'headers': {
    'Authorization': 'Bearer test-token',
    'Content-Type': 'application/json'
  },
  'metadata': {
    'environment': 'test',
    'service': 'test-service'
  },
  'parameters': { 'clientId': 'test-key' },
  'timeout': 5000
} as const satisfies ClientConfigInterface;
