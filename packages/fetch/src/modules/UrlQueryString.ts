/**
 * URL and query string utilities as static class methods
 */

import { Predicates } from '@studnicky/types/node';

import type { QueryParametersInterface } from '../interfaces/QueryParametersInterface.js';

import { QueryParametersEntity } from '../entities/QueryParametersEntity.js';

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
    const entityParameters = UrlQueryString.intakeParameters(parameters);
    const result = UrlQueryString.buildQueryStringFromEntity(entityParameters);
    return result;
  }

  static buildQueryStringFromEntity(parameters: QueryParametersEntity.Type): string {
    const pairs: string[] = [];
    const parameterNames = Object.keys(parameters);
    const parameterNameLength = parameterNames.length;
    for (let index = 0; index < parameterNameLength; index += 1) {
      const key = parameterNames[index];
      if (key === undefined) {
        continue;
      }
      const value: unknown = Reflect.get(parameters, key);
      const encodedKey = encodeURIComponent(key);

      if (Predicates.isArray(value)) {
        const valueLength = value.length;
        for (let valueIndex = 0; valueIndex < valueLength; valueIndex += 1) {
          const item: unknown = Reflect.get(value, valueIndex);
          pairs.push(`${encodedKey}=${encodeURIComponent(String(item))}`);
        }
      } else {
        pairs.push(`${encodedKey}=${encodeURIComponent(String(value))}`);
      }
    }

    const result = pairs.join('&');
    return result;
  }

  static intakeParameters(parameters: unknown): QueryParametersEntity.Type {
    const result = QueryParametersEntity.intake(UrlQueryString.encodeParameters(parameters));
    return result;
  }

  private static encodeParameters(parameters: unknown): unknown {
    if (!Predicates.isRecord(parameters)) {
      return parameters;
    }

    const result: Record<string, unknown> = {};
    const parameterNames = Object.keys(parameters);
    const parameterNameLength = parameterNames.length;

    for (let index = 0; index < parameterNameLength; index += 1) {
      const key = parameterNames[index];
      if (key === undefined) {
        continue;
      }

      const runtimeValue: unknown = Reflect.get(parameters, key);
      if (runtimeValue === undefined) {
        continue;
      }

      if (Predicates.isArray(runtimeValue)) {
        const items: unknown[] = [];
        const itemLength = runtimeValue.length;
        for (let itemIndex = 0; itemIndex < itemLength; itemIndex += 1) {
          const item: unknown = Reflect.get(runtimeValue, itemIndex);
          if (item !== undefined) {
            items.push(item);
          }
        }
        Reflect.set(result, key, items);
        continue;
      }

      Reflect.set(result, key, runtimeValue);
    }

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

    const entityParameters = UrlQueryString.intakeParameters(parameters);
    const result = UrlQueryString.buildUrlFromEntity(baseUrl, entityParameters);
    return result;
  }

  static buildUrlFromEntity(baseUrl: string, parameters: QueryParametersEntity.Type): string {
    const queryString = UrlQueryString.buildQueryStringFromEntity(parameters);

    if (queryString === '') {
      return baseUrl;
    }

    const separator = baseUrl.includes('?') ? '&' : '?';
    const result = baseUrl + separator + queryString;
    return result;
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
    const result: Record<string, unknown> = {};

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

    const parsed = QueryParametersEntity.intake(result);
    return parsed;
  }
}
