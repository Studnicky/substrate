/**
 * Reusable error and dispatcher statistics fixtures for tests
 */

import type { SocketDispatcherStatsType } from '../../src/interfaces/SocketDispatcherStatsType.js';

export const mockDispatcherStatsHealthy = {
  connected: 20,
  free: 15,
  pending: 2,
  queued: 0,
  running: 5,
  size: 7
} as const satisfies SocketDispatcherStatsType;

export const mockDispatcherStatsExhausted = {
  connected: 20,
  free: 0,
  pending: 15,
  queued: 5,
  running: 20,
  size: 40
} as const satisfies SocketDispatcherStatsType;

export const mockDispatcherStatsModerate = {
  connected: 20,
  free: 5,
  pending: 8,
  queued: 2,
  running: 15,
  size: 25
} as const satisfies SocketDispatcherStatsType;

export const mockDispatcherStatsLowConnections = {
  connected: 5,
  free: 1,
  pending: 10,
  queued: 5,
  running: 4,
  size: 19
} as const satisfies SocketDispatcherStatsType;

export const mockDispatcherStatsIdle = {
  connected: 20,
  free: 20,
  pending: 0,
  queued: 0,
  running: 0,
  size: 0
} as const satisfies SocketDispatcherStatsType;

export const mockSocketExhaustionError = {
  message: 'Connection pool exhausted',
  stats: mockDispatcherStatsExhausted,
  url: 'https://api.example.com/data'
} as const;

export const mockNetworkError = {
  cause: new Error('ENOTFOUND'),
  message: 'Network error for https://invalid-domain.com',
  url: 'https://invalid-domain.com'
} as const;

export const mockTimeoutError = {
  message: 'Request timeout after 5000ms',
  timeoutMs: 5000,
  url: 'https://slow-api.example.com/data'
} as const;

export const mockAbortError = {
  message: 'Request was aborted',
  reason: 'User cancelled',
  url: 'https://api.example.com/data'
} as const;

export const mockHTTPError = {
  message: 'HTTP 404 Not Found',
  status: 404,
  statusText: 'Not Found',
  url: 'https://api.example.com/not-found'
} as const;

export const mockHTTPError500 = {
  message: 'HTTP 500 Internal Server Error',
  status: 500,
  statusText: 'Internal Server Error',
  url: 'https://api.example.com/error'
} as const;

export const mockConfigurationError = {
  message: 'Invalid baseURL: must be a valid URL',
  parameter: 'baseURL',
  value: 'not-a-valid-url'
} as const;
