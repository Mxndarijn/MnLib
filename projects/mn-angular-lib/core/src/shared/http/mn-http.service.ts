import {inject} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {API_BASE_URL} from '../crud';

/** A single query parameter value. */
type MnQueryValue = string | number | boolean | null | undefined;

/** A record of query parameter key-value pairs. Arrays are appended as multiple entries. */
export type MnQueryParams = Record<string, MnQueryValue | MnQueryValue[]>;

/**
 * Lightweight abstract HTTP base class that removes common boilerplate
 * from API services.
 *
 * Provides typed `get`, `post`, `patch`, `put`, and `delete` methods
 * that return Promises, automatic query-param building, and base-URL
 * injection via the `API_BASE_URL` token.
 *
 * Subclass this directly for services with static or mixed endpoints.
 * No CRUD structure is imposed — every method accepts a free-form path.
 */
export abstract class MnHttpService {
  /** Angular HTTP client injected automatically. */
  protected readonly http = inject(HttpClient);

  /** Base API URL provided via the `API_BASE_URL` injection token. */
  protected readonly baseUrl = inject(API_BASE_URL);

  /**
   * Sends a typed GET request.
   * @param path The path appended to the base URL.
   * @param query Optional query parameters.
   * @returns A promise resolving to the typed response body.
   */
  protected get<T>(path: string, query?: MnQueryParams): Promise<T> {
    return firstValueFrom(
      this.http.get<T>(`${this.baseUrl}${path}`, {
        params: this.toHttpParams(query),
      }),
    );
  }

  /**
   * Sends a typed POST request.
   * @param path The path appended to the base URL.
   * @param body Optional request body.
   * @param query Optional query parameters.
   * @returns A promise resolving to the typed response body.
   */
  protected post<T>(path: string, body?: unknown, query?: MnQueryParams): Promise<T> {
    return firstValueFrom(
      this.http.post<T>(`${this.baseUrl}${path}`, body ?? {}, {
        params: this.toHttpParams(query),
      }),
    );
  }

  /**
   * Sends a typed PATCH request.
   * @param path The path appended to the base URL.
   * @param body Optional request body.
   * @param query Optional query parameters.
   * @returns A promise resolving to the typed response body.
   */
  protected patch<T>(path: string, body?: unknown, query?: MnQueryParams): Promise<T> {
    return firstValueFrom(
      this.http.patch<T>(`${this.baseUrl}${path}`, body ?? {}, {
        params: this.toHttpParams(query),
      }),
    );
  }

  /**
   * Sends a typed PUT request.
   * @param path The path appended to the base URL.
   * @param body Optional request body.
   * @param query Optional query parameters.
   * @returns A promise resolving to the typed response body.
   */
  protected put<T>(path: string, body?: unknown, query?: MnQueryParams): Promise<T> {
    return firstValueFrom(
      this.http.put<T>(`${this.baseUrl}${path}`, body ?? {}, {
        params: this.toHttpParams(query),
      }),
    );
  }

  /**
   * Sends a typed DELETE request.
   * @param path The path appended to the base URL.
   * @param query Optional query parameters.
   * @returns A promise resolving to the typed response body.
   */
  protected delete<T = void>(path: string, query?: MnQueryParams): Promise<T> {
    return firstValueFrom(
      this.http.delete<T>(`${this.baseUrl}${path}`, {
        params: this.toHttpParams(query),
      }),
    );
  }

  /**
   * Converts a query-params record to Angular `HttpParams`.
   * Null and undefined values are silently skipped.
   * Array values are appended as multiple entries for the same key.
   * @param query The query parameter record to convert.
   * @returns An `HttpParams` instance, or `undefined` when no parameters are provided.
   */
  protected toHttpParams(query?: MnQueryParams): HttpParams | undefined {
    if (!query) return undefined;

    let params = new HttpParams();

    for (const [key, rawValue] of Object.entries(query)) {
      if (rawValue === null || rawValue === undefined) continue;

      const values = Array.isArray(rawValue) ? rawValue : [rawValue];

      for (const value of values) {
        if (value === null || value === undefined) continue;
        params = params.append(key, String(value));
      }
    }

    return params;
  }
}
