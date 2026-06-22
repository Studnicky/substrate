/**
 * Mock HTTP server for testing
 * Provides predictable responses without external dependencies
 */

import {
  createServer, type IncomingMessage, type Server, type ServerResponse
} from 'node:http';

import {
  HTTP_STATUS_NOT_FOUND, HTTP_STATUS_OK
} from '../../../src/constants/index.js';
import { ConfigurationError } from '../../../src/errors/index.js';

type RouteHandlerType = (
  req: IncomingMessage,
  res: ServerResponse,
  body: string
) => void;

let server: null | Server = null;
let serverUrl = '';

/**
 * Parses JSON body safely, returning empty object on failure
 */
function parseJsonBody(body: string): Record<string, unknown> {
  if (body === '') {
    return {};
  }

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Sends JSON response
 */
function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Creates route key from method and path
 */
function routeKey(method: string, path: string): string {
  return `${method}:${path}`;
}

/**
 * Mock posts data for list endpoint
 */
const MOCK_POSTS = [
  {
    id: 1,
    title: 'Post 1'
  },
  {
    id: 2,
    title: 'Post 2'
  }
];

/**
 * Handles GET /posts request - returns mock posts list
 */
function handleGetPosts(_req: IncomingMessage, res: ServerResponse): void {
  const posts = MOCK_POSTS;

  res.writeHead(HTTP_STATUS_OK, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(posts));
}

/**
 * Route handlers dispatch map using Map to avoid naming convention issues
 */
const ROUTE_HANDLERS = new Map<string, RouteHandlerType>([
  [
    'DELETE:/posts/1',
    (_req, res) => {
      sendJson(res, HTTP_STATUS_OK, {});
    }
  ],
  [
    'GET:/404',
    (_req, res) => {
      sendJson(res, HTTP_STATUS_NOT_FOUND, { error: 'Not Found' });
    }
  ],
  [
    'GET:/delay',
    (_req, res) => {
      setTimeout(() => {
        sendJson(res, HTTP_STATUS_OK, { message: 'delayed' });
      }, 5000);
    }
  ],
  [
    'GET:/posts',
    handleGetPosts
  ],
  [
    'GET:/posts/1',
    (req, res) => {
      sendJson(res, HTTP_STATUS_OK, {
        headers: req.headers,
        id: 1,
        title: 'Test Post',
        userId: 1
      });
    }
  ],
  [
    'GET:/posts/2',
    (req, res) => {
      sendJson(res, HTTP_STATUS_OK, {
        headers: req.headers,
        id: 2,
        title: 'Test Post 2',
        userId: 1
      });
    }
  ],
  [
    'GET:/posts/3',
    (req, res) => {
      sendJson(res, HTTP_STATUS_OK, {
        headers: req.headers,
        id: 3,
        title: 'Test Post 3',
        userId: 1
      });
    }
  ],
  [
    'HEAD:/posts/1',
    (_req, res) => {
      res.writeHead(HTTP_STATUS_OK, {
        'Content-Length': '100',
        'Content-Type': 'application/json'
      });
      res.end();
    }
  ],
  [
    'PATCH:/posts/1',
    (_req, res, body) => {
      const parsedBody = parseJsonBody(body);

      sendJson(res, HTTP_STATUS_OK, {
        id: 1,
        title: 'Test Post',
        ...parsedBody
      });
    }
  ],
  [
    'POST:/posts',
    (_req, res, body) => {
      const parsedBody = parseJsonBody(body);

      sendJson(res, 201, {
        ...parsedBody,
        id: 101
      });
    }
  ],
  [
    'PUT:/posts/1',
    (_req, res, body) => {
      const parsedBody = parseJsonBody(body);

      sendJson(res, HTTP_STATUS_OK, {
        ...parsedBody,
        id: 1
      });
    }
  ]
]);

/**
 * Handles OPTIONS preflight requests
 */
function handleOptions(res: ServerResponse): void {
  res.writeHead(HTTP_STATUS_OK);
  res.end();
}

/**
 * Sets CORS headers on response
 */
function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Custom, X-Request-ID, X-Timestamp, X-Builder, X-Intercepted'
  );
}

/**
 * Handles incoming HTTP request
 */
function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  const fullUrl = req.url ?? '/';
  const method = req.method ?? 'GET';
  const urlObj = new URL(fullUrl, 'http://localhost');
  const path = urlObj.pathname;

  setCorsHeaders(res);

  if (method === 'OPTIONS') {
    handleOptions(res);

    return;
  }

  let body = '';

  req.on('data', (chunk: Buffer) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    const handler = ROUTE_HANDLERS.get(routeKey(method, path));

    if (handler === undefined) {
      sendJson(res, HTTP_STATUS_NOT_FOUND, { error: 'Not Found' });
    } else {
      handler(req, res, body);
    }
  });
}

/**
 * Starts the mock HTTP server for testing
 * Returns the base URL to use in tests
 */
export async function startTestServer(): Promise<string> {
  if (server !== null) {
    return serverUrl;
  }

  return new Promise((resolve, reject) => {
    server = createServer(handleRequest);

    server.listen(0, '127.0.0.1', () => {
      const address = server?.address();

      if (address !== null && address !== undefined && typeof address === 'object') {
        serverUrl = `http://127.0.0.1:${address.port}`;
        resolve(serverUrl);
      } else {
        reject(new Error('Failed to start server'));
      }
    });

    server.on('error', reject);
  });
}

/**
 * Stops the mock HTTP server
 */
export async function stopTestServer(): Promise<void> {
  if (server === null) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server?.close((err) => {
      if (err === undefined) {
        server = null;
        serverUrl = '';
        resolve();
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Gets the current test server URL
 */
export function getTestServerUrl(): string {
  if (serverUrl === '') {
    throw new ConfigurationError('Test server not started. Call startTestServer() first.');
  }

  return serverUrl;
}
