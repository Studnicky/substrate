/**
 * URL and query string utilities as static class methods
 */

import { Predicates } from '@studnicky/types';

import type { QueryParametersInterface } from '../interfaces/QueryParametersInterface.js';

/**
 * URL and query string utilities
 */
export class UrlQueryString {
  /**
   * Builds a query string from parameters
   *
   * @param parameters - Query parameters
   * @returns Query string without leading ?
   */
  static buildQueryString(parameters: QueryParametersInterface): string {
    const pairs: string[] = [];

    const parameterNames = Object.keys(parameters);
    const parameterNameLength = parameterNames.length;
    for (let index = 0; index < parameterNameLength; index += 1) {
      const key = parameterNames[index];
      if (key === undefined) {
        continue;
      }
      const value: unknown = Reflect.get(parameters, key);
      if (value === undefined || value === null) {
        continue;
      }

      const encodedKey = encodeURIComponent(key);

      if (Predicates.isArray(value)) {
        const valueLength = value.length;
        for (let valueIndex = 0; valueIndex < valueLength; valueIndex += 1) {
          const item: unknown = Reflect.get(value, valueIndex);
          if (item !== undefined && item !== null) {
            pairs.push(`${encodedKey}=${encodeURIComponent(String(item))}`);
          }
        }
      } else {
        pairs.push(`${encodedKey}=${encodeURIComponent(String(value))}`);
      }
    }

    const result = pairs.join('&');
    return result;
  }

  /**
   * Builds a URL with query parameters
   *
   * @param baseUrl - Base URL (can include existing query params)
   * @param parameters - Query parameters to append
   * @returns Complete URL with query string
   */
  static buildUrl(baseUrl: string, parameters?: QueryParametersInterface): string {
    if (parameters === undefined) {
      return baseUrl;
    }

    const queryString = UrlQueryString.buildQueryString(parameters);

    if (queryString === '') {
      return baseUrl;
    }

    const separator = baseUrl.includes('?') ? '&' : '?';

    return `${baseUrl}${separator}${queryString}`;
  }

  /**
   * Parses a query string into parameters
   *
   * @param queryString - Query string (with or without leading ?)
   * @returns Parsed query parameters
   */
  static parseQueryString(queryString: string): QueryParametersInterface {
    const cleanQuery = queryString.startsWith('?') ? queryString.slice(1) : queryString;

    if (cleanQuery === '') {
      return {};
    }

    const searchParameters = new globalThis.URLSearchParams(cleanQuery);
    const parsedValues = new Map<string, string | string[]>();
    const result: QueryParametersInterface = {};

    const searchParameterEntries = Array.from(searchParameters.entries());
    const searchParameterEntryLength = searchParameterEntries.length;
    for (let index = 0; index < searchParameterEntryLength; index += 1) {
      const entry = searchParameterEntries[index];
      if (entry === undefined) {
        continue;
      }
      const [key, value] = entry;
      const existing = parsedValues.get(key);

      if (existing === undefined) {
        parsedValues.set(key, value);
      } else if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        parsedValues.set(key, [
          existing,
          value
        ]);
      }
    }

    const parsedValueEntries = Array.from(parsedValues.entries());
    const parsedValueEntryLength = parsedValueEntries.length;
    for (let index = 0; index < parsedValueEntryLength; index += 1) {
      const entry = parsedValueEntries[index];
      if (entry === undefined) {
        continue;
      }
      const [key, value] = entry;
      Reflect.set(result, key, value);
    }

    return result;
  }
}
